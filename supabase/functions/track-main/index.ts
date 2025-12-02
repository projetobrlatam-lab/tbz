import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Funções utilitárias
async function computeFingerprintHash(parts: string[]): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(parts.filter(Boolean).join('|'));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

function getClientIP(req: Request): string {
  return req.headers.get('cf-connecting-ip') || 
         req.headers.get('x-real-ip') || 
         req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
         '127.0.0.1';
}

function normalizeIP(ip: string): string {
  return ip.replace(/^::ffff:/, '');
}

function normalizeAcceptLanguage(acceptLanguage: string): string {
  return (acceptLanguage || '').split(',')[0].split(';')[0].trim().toLowerCase();
}

async function getLocation(ip: string): Promise<{ country_code: string; country_name: string; city: string; region_name: string }> {
  try {
    if (ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip === 'unknown') {
      return { country_code: 'BR', country_name: 'Brazil', city: 'São Paulo', region_name: 'São Paulo' };
    }
    
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,countryCode,country,city,regionName`, {
      signal: AbortSignal.timeout(3000)
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    
    if (data.status !== 'success') throw new Error('Geolocation failed');
    
    return {
      country_code: data.countryCode || 'BR',
      country_name: data.country || 'Brazil',
      city: data.city || 'São Paulo',
      region_name: data.regionName || 'São Paulo'
    };
  } catch (error) {
    console.error('Geolocation error:', error);
    return { country_code: 'BR', country_name: 'Brazil', city: 'São Paulo', region_name: 'São Paulo' };
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 === NOVA REQUISIÇÃO TRACK-MAIN ===');
    console.log('📊 Headers da requisição:', JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2));
    console.log('🌐 URL da requisição:', req.url);
    console.log('🔧 Método da requisição:', req.method);
    console.log('=== TRACK-MAIN REQUEST START ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, SUPABASE_SERVICE_ROLE_KEY);

    // Extrair dados da requisição
    let requestData: any = {};
    
    if (req.method === 'POST') {
      try {
        const body = await req.text();
        console.log('Raw POST Body:', body);
        
        if (body.trim()) {
          requestData = JSON.parse(body);
        }
        console.log('Parsed POST Body:', JSON.stringify(requestData, null, 2));
      } catch (error) {
        console.error('❌ Erro ao fazer parse do JSON:', error);
        return new Response(
          JSON.stringify({ error: 'Invalid JSON format', details: error.message }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } else if (req.method === 'GET') {
      const url = new URL(req.url);
      for (const [key, value] of url.searchParams.entries()) {
        requestData[key] = value;
      }
      console.log('GET Params:', JSON.stringify(requestData, null, 2));
    }

    // Extrair campos do payload
    const {
      session_id: rawSessionId,
      event_type,
      event_data: rawEventData = {},
      produto = 'tbz',
      tipo_de_funil = 'quiz',
      traffic_id: rawTrafficId,
      fonte_de_trafego,
      name: directName,
      email: directEmail,
      phone: directPhone,
      diagnosisLevel,
      diagnosticResult,
      utm_source,
      utm_medium,
      urgency_level,
      urgencyLevel,
      isAnonymous = false
    } = requestData;

    // Parse event_data se for string JSON
    let event_data = {};
    if (typeof rawEventData === 'string') {
      try {
        event_data = JSON.parse(rawEventData);
      } catch (error) {
        console.error('❌ Erro ao fazer parse do event_data:', error);
        event_data = {};
      }
    } else {
      event_data = rawEventData || {};
    }

    // Extrair dados do lead do event_data ou usar valores diretos
    const name = directName || event_data.name;
    const email = directEmail || event_data.email;
    const phone = directPhone || event_data.phone;

    // Validação básica - apenas event_type é obrigatório
    if (!event_type) {
      console.error('❌ event_type é obrigatório');
      return new Response(
        JSON.stringify({ error: 'event_type é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ignorar eventos de abandonment
    if (event_type === 'abandonment') {
      console.log('ℹ️ Ignorando evento de abandonment');
      return new Response(
        JSON.stringify({ success: true, message: 'Abandonment events are ignored' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extrair informações do cliente
    const userAgent = req.headers.get('user-agent') || 'Unknown';
    const clientIP = getClientIP(req);
    const normalizedIP = normalizeIP(clientIP);
    const acceptLanguage = req.headers.get('accept-language') || '';
    const normalizedLanguage = normalizeAcceptLanguage(acceptLanguage);
    const referer = req.headers.get('referer') || '';

    // Gerar fingerprint automaticamente
    const fingerprintParts = [normalizedIP, userAgent, normalizedLanguage];
    const fingerprintHash = await computeFingerprintHash(fingerprintParts);

    // Gerar IDs se não fornecidos
    let sessionId = rawSessionId;
    if (!sessionId || !isValidUUID(sessionId)) {
      sessionId = crypto.randomUUID();
      console.log('🆔 Novo session_id gerado:', sessionId);
    }

    let trafficId = rawTrafficId || utm_medium;
    if (!trafficId) {
      trafficId = crypto.randomUUID();
      console.log('🆔 Novo traffic_id gerado:', trafficId);
    } else {
      console.log('🆔 Traffic_id preservado:', trafficId);
    }

    // Obter localização
    const location = await getLocation(clientIP);

    console.log('📊 Dados processados:', {
      event_type,
      session_id: sessionId,
      traffic_id: trafficId,
      fingerprint_hash: fingerprintHash,
      produto,
      tipo_de_funil,
      ip: clientIP,
      location: location.city
    });

    // === VERIFICAR DEDUPLICAÇÃO BASEADA NO FINGERPRINT_HASH (24 HORAS) ===
    let shouldSkipEvent = false;
    let shouldSkipVisit = false;
    
    try {
      console.log('🔍 Verificando deduplicação para fingerprint_hash nas últimas 24 horas...');
      
      // Verificar se já existe identificador para este fingerprint_hash
      const { data: existingIdentifier, error: identifierError } = await supabase
        .from('oreino360-identificador')
        .select('id, created_at')
        .eq('fingerprint_hash', fingerprintHash)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .single();

      if (identifierError && identifierError.code !== 'PGRST116') {
        console.error('❌ Erro ao verificar identificador:', identifierError);
      } else if (existingIdentifier) {
        console.log('🔍 Fingerprint_hash já existe nas últimas 24h, verificando eventos específicos...');
        
        // Buscar todas as sessões deste fingerprint_hash nas últimas 24 horas
        const { data: recentSessions, error: sessionError } = await supabase
          .from('oreino360-sessoes')
          .select('id')
          .eq('fingerprint_hash', fingerprintHash)
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        if (sessionError) {
          console.error('❌ Erro ao buscar sessões recentes:', sessionError);
        } else if (recentSessions && recentSessions.length > 0) {
          const sessionIds = recentSessions.map(s => s.id);
          
          // Verificar eventos existentes
          const { data: existingEvents, error: eventError } = await supabase
            .from('oreino360-eventos')
            .select('id, event_type, created_at')
            .in('session_id', sessionIds)
            .eq('event_type', event_type)
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

          if (eventError) {
            console.error('❌ Erro ao verificar eventos existentes:', eventError);
          } else if (existingEvents && existingEvents.length > 0) {
            console.log('⚠️ Evento já existe nas últimas 24h, pulando inserção:', event_type);
            shouldSkipEvent = true;
          }

          // Verificar visitas existentes para eventos de page_view/visit
          if (['page_view', 'visit'].includes(event_type)) {
            const { data: existingVisits, error: visitError } = await supabase
              .from('oreino360-visitas')
              .select('id, created_at')
              .in('session_id', sessionIds)
              .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

            if (visitError) {
              console.error('❌ Erro ao verificar visitas existentes:', visitError);
            } else if (existingVisits && existingVisits.length > 0) {
              console.log('⚠️ Visita já existe nas últimas 24h, pulando inserção de visita');
              shouldSkipVisit = true;
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Erro na verificação de deduplicação:', error);
    }

    // === INSERIR SESSÃO ===
    let sessionUUID = null;
    try {
      // Determinar current_step baseado no event_type
      let currentStep = 'unknown';
      switch (event_type) {
        case 'visit':
        case 'page_view':
          currentStep = 'landing';
          break;
        case 'quiz_start':
          currentStep = 'quiz_inicio';
          break;
        case 'question_view':
          currentStep = event_data?.question_number ? `pergunta_${event_data.question_number}` : 'quiz_progresso';
          break;
        case 'quiz_complete':
          currentStep = 'quiz_completo';
          break;
        case 'lead_submit':
          currentStep = 'lead_capturado';
          break;
        case 'checkout_click':
        case 'offer_click':
          currentStep = 'checkout_iniciado';
          break;
        case 'abandonment':
          currentStep = 'abandono';
          break;
        default:
          currentStep = 'unknown';
      }

      const sessionPayload = {
        session_id: sessionId, // Este é text e único
        fingerprint_hash: fingerprintHash,
        ip_address: clientIP,
        country_code: location.country_code,
        produto: produto,
        traffic_id: trafficId,
        tipo_de_funil: tipo_de_funil,
        fonte_de_trafego: fonte_de_trafego || utm_source || 'direct',
        current_step: currentStep,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('📝 Inserindo sessão...');
      const { data: sessionData, error: sessionError } = await supabase
        .from('oreino360-sessoes')
        .upsert(sessionPayload, { onConflict: 'session_id' })
        .select();

      if (sessionError) {
        console.error('❌ Erro ao inserir sessão:', sessionError);
      } else {
        sessionUUID = sessionData?.[0]?.id; // Pegar o UUID gerado
        console.log('✅ Sessão inserida:', sessionUUID);
      }
    } catch (error) {
      console.error('❌ Erro geral na sessão:', error);
    }

    // === INSERIR EVENTO ===
    if (!shouldSkipEvent) {
      try {
        const eventPayload = {
          session_id: sessionUUID, // Usar o UUID da sessão
          event_type,
          event_data: event_data || null,
          produto: produto,
          fonte_de_trafego: fonte_de_trafego || utm_source || 'direct',
          tipo_de_funil: tipo_de_funil,
          created_at: new Date().toISOString()
        };

        console.log('📝 Inserindo evento...');
        const { data: eventData, error: eventError } = await supabase
          .from('oreino360-eventos')
          .insert(eventPayload)
          .select();

        if (eventError) {
          console.error('❌ Erro ao inserir evento:', eventError);
        } else {
          console.log('✅ Evento inserido:', eventData?.[0]?.id);
        }
      } catch (error) {
        console.error('❌ Erro geral no evento:', error);
      }
    } else {
      console.log('⏭️ Evento pulado devido à deduplicação:', event_type);
    }

    // === INSERIR IDENTIFICADOR ===
    if (['page_view', 'visit', 'quiz_start'].includes(event_type)) {
      try {
        const identificadorPayload = {
          fingerprint_hash: fingerprintHash,
          original_ip: clientIP,
          normalized_ip: normalizedIP,
          user_agent: userAgent,
          country_code: location.country_code,
          country_name: location.country_name,
          city: location.city,
          produto: produto,
          traffic_id: trafficId,
          tipo_de_funil: tipo_de_funil,
          fonte_de_trafego: fonte_de_trafego || utm_source || 'direct',
          region_name: location.region_name,
          visitas_24h: 1,
          created_at: new Date().toISOString()
        };

        console.log('📝 Inserindo identificador...');
        const { data: identifierData, error: identifierError } = await supabase
          .from('oreino360-identificador')
          .upsert(identificadorPayload, { onConflict: 'fingerprint_hash' })
          .select();

        if (identifierError) {
          console.error('❌ Erro ao inserir identificador:', identifierError);
        } else {
          console.log('✅ Identificador inserido:', identifierData?.[0]?.id);
        }
      } catch (error) {
        console.error('❌ Erro geral no identificador:', error);
      }
    }

    // === INSERIR VISITA ===
    if (['page_view', 'visit'].includes(event_type) && sessionUUID && !shouldSkipVisit) {
      try {
        const visitaPayload = {
          session_id: sessionUUID, // Usar o UUID da sessão
          ip_address: clientIP,
          country_code: location.country_code,
          city: location.city,
          country_name: location.country_name,
          user_agent: userAgent,
          referrer: referer,
          produto: produto,
          fonte_de_trafego: fonte_de_trafego || utm_source || 'direct',
          tipo_de_funil: tipo_de_funil,
          region_name: location.region_name,
          created_at: new Date().toISOString()
        };

        console.log('📝 Inserindo visita...');
        const { data: visitData, error: visitError } = await supabase
          .from('oreino360-visitas')
          .insert(visitaPayload)
          .select();

        if (visitError) {
          console.error('❌ Erro ao inserir visita:', visitError);
        } else {
          console.log('✅ Visita inserida:', visitData?.[0]?.id);
        }
      } catch (error) {
        console.error('❌ Erro geral na visita:', error);
      }
    } else if (['page_view', 'visit'].includes(event_type) && shouldSkipVisit) {
      console.log('⏭️ Visita pulada devido à deduplicação');
    }

    // === INSERIR LEAD ===
    console.log('🔍 Verificando condições para inserir lead:');
    console.log('  - event_type:', event_type);
    console.log('  - name:', name);
    console.log('  - email:', email);
    console.log('  - phone:', phone);
    console.log('  - Condição atendida:', event_type?.toLowerCase() === 'lead_submit' && (name || email || phone));

      if (event_type?.toLowerCase() === 'lead_submit' && (name || email || phone)) {
      console.log('✅ Condições atendidas! Iniciando inserção do lead...');
      try {
        // Extrair urgency_level do payload principal ou do diagnosticResult
        let urgencyLevel = urgency_level || null; // ✅ PRIORIZAR urgency_level do payload principal
        
        // Se não encontrou no payload principal, tentar extrair do diagnosticResult
        if (!urgencyLevel && diagnosticResult && typeof diagnosticResult === 'object') {
          urgencyLevel = diagnosticResult.urgencyLevel || diagnosisLevel || null;
        } else if (!urgencyLevel && diagnosisLevel) {
          urgencyLevel = diagnosisLevel;
        }

        // Converter valores de inglês para português e maiúscula para atender a constraint da tabela
        if (urgencyLevel && typeof urgencyLevel === 'string') {
          const urgencyMap: { [key: string]: string } = {
            'high': 'ALTA',
            'critical': 'CRÍTICA', 
            'emergency': 'EMERGENCIAL',
            'baixa': 'BAIXA',
            'média': 'MÉDIA',
            'media': 'MÉDIA',
            'alta': 'ALTA',
            'crítica': 'CRÍTICA',
            'critica': 'CRÍTICA',
            'emergencial': 'EMERGENCIAL'
          };
          
          const normalizedLevel = urgencyLevel.toLowerCase();
          urgencyLevel = urgencyMap[normalizedLevel] || urgencyLevel.toUpperCase();
        }

        const leadPayload = {
          name: name || null,
          email: email || null,
          phone: phone || null,
          traffic_id: trafficId,
          fingerprint_hash: fingerprintHash, // ✅ Referência ao identificador
          fonte_de_trafego: fonte_de_trafego || utm_source || 'direct',
          tipo_de_funil: tipo_de_funil,
          urgency_level: urgencyLevel,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('📝 Inserindo lead com urgency_level:', urgencyLevel);
        console.log('🔍 Lead payload completo:', JSON.stringify(leadPayload, null, 2));
        const { data: leadData, error: leadError } = await supabase
          .from('oreino360-leads')
          .insert(leadPayload)
          .select();

        console.log('📊 Resultado da inserção do lead:');
        console.log('  - leadData:', JSON.stringify(leadData, null, 2));
        console.log('  - leadError:', JSON.stringify(leadError, null, 2));

        if (leadError) {
          console.error('❌ Erro ao inserir lead:', leadError);
          console.error('❌ Detalhes completos do erro:', JSON.stringify(leadError, null, 2));
        } else {
          const leadId = leadData?.[0]?.id;
          console.log('✅ Lead inserido:', leadId);

          // Inserir associação do produto se o lead foi criado com sucesso
          console.log('🔍 Verificando condições para inserir produto:', { leadId, produto });
          if (leadId && produto) {
            try {
              const productPayload = {
                lead_id: leadId,
                produto: produto,
                created_at: new Date().toISOString()
              };

              console.log('📝 Inserindo associação de produto com payload:', JSON.stringify(productPayload, null, 2));
              const { data: productData, error: productError } = await supabase
                .from('oreino360-lead_products')
                .insert(productPayload)
                .select();

              if (productError) {
                console.error('❌ Erro ao inserir produto do lead:', productError);
                console.error('❌ Detalhes do erro:', JSON.stringify(productError, null, 2));
              } else {
                console.log('✅ Produto do lead inserido com sucesso:', produto);
                console.log('✅ Dados inseridos:', JSON.stringify(productData, null, 2));
              }
            } catch (productErr) {
              console.error('❌ Erro geral no produto do lead:', productErr);
              console.error('❌ Stack trace:', productErr.stack);
            }
          } else {
            console.log('⚠️ Condições não atendidas para inserir produto:', { 
              leadId: !!leadId, 
              produto: !!produto,
              leadIdValue: leadId,
              produtoValue: produto
            });
          }
        }
      } catch (error) {
        console.error('❌ Erro geral no lead:', error);
      }
    }

    console.log('=== TRACK-MAIN REQUEST END ===');

    // Informações de debug para a resposta
    const debugInfo = {
      event_type: event_type,
      lead_conditions: {
        is_lead_submit: event_type?.toLowerCase() === 'lead_submit',
        has_name: !!name,
        has_email: !!email,
        has_phone: !!phone,
        should_insert_lead: (event_type?.toLowerCase() === 'lead_submit') && (!!name || !!email || !!phone)
      },
      payload_received: {
        name: name || null,
        email: email || null,
        phone: phone || null,
        urgency_level: urgency_level || null,
        traffic_id: trafficId
      }
    };

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Event tracked successfully',
        fingerprint_hash: fingerprintHash,
        session_id: sessionId,
        traffic_id: trafficId,
        debug: debugInfo
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro geral:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});