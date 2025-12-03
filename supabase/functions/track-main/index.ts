import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.1'

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
    console.log('🔍 === NOVA REQUISIÇÃO TRACK-MAIN (TBZ SCHEMA) ===');
    console.log('📊 Headers da requisição:', JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2));
    console.log('🌐 URL da requisição:', req.url);
    console.log('🔧 Método da requisição:', req.method);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('PROD_SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('PROD_SUPABASE_KEY');

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

    // === 1. INSERIR IDENTIFICADOR (FINGERPRINT) - PRIMEIRO PASSO OBRIGATÓRIO ===
    // Necessário para satisfazer FK em sessoes e leads
    try {
      const identificadorPayload = {
        fingerprint_hash: fingerprintHash,
        original_ip: clientIP,
        user_agent: userAgent,
        country_code: location.country_code,
        city: location.city,
        region_name: location.region_name,
        created_at: new Date().toISOString()
      };

      console.log('📝 Inserindo/Atualizando identificador...');
      const { error: identifierError } = await supabase
        .schema('tbz')
        .from('identificador')
        .upsert(identificadorPayload, { onConflict: 'fingerprint_hash' });

      if (identifierError) {
        console.error('❌ Erro ao inserir identificador:', identifierError);
        // Não podemos continuar se falhar aqui pois sessoes depende disso
        throw new Error(`Falha ao criar identificador: ${identifierError.message}`);
      }
      console.log('✅ Identificador garantido.');
    } catch (error) {
      console.error('❌ Erro crítico no identificador:', error);
      throw error;
    }

    // === 2. INSERIR SESSÃO - SEGUNDO PASSO OBRIGATÓRIO ===
    // Necessário para satisfazer FK em eventos, visitas, abandono
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
        session_id: sessionId, // Business Key
        fingerprint_hash: fingerprintHash, // FK
        ip_address: clientIP,
        traffic_id: trafficId,
        fonte_de_trafego: fonte_de_trafego || utm_source || 'direct',
        tipo_de_funil: tipo_de_funil,
        produto: produto,
        current_step: currentStep,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('📝 Inserindo/Atualizando sessão...');
      const { data: sessionData, error: sessionError } = await supabase
        .schema('tbz')
        .from('sessoes')
        .upsert(sessionPayload, { onConflict: 'session_id' })
        .select('id')
        .single();

      if (sessionError) {
        console.error('❌ Erro ao inserir sessão:', sessionError);
        throw new Error(`Falha ao criar sessão: ${sessionError.message}`);
      } else {
        sessionUUID = sessionData.id; // Pegar o UUID gerado (PK)
        console.log('✅ Sessão inserida/recuperada:', sessionUUID);
      }
    } catch (error) {
      console.error('❌ Erro crítico na sessão:', error);
      throw error;
    }

    // === 3. DEDUPLICAÇÃO DE EVENTOS ===
    let shouldSkipEvent = false;
    let shouldSkipVisit = false;

    try {
      // Verificar eventos existentes na última hora para evitar duplicatas rápidas
      const { data: existingEvents, error: eventError } = await supabase
        .schema('tbz')
        .from('eventos')
        .select('id')
        .eq('session_id', sessionUUID)
        .eq('event_type', event_type)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // 1 hora

      if (eventError) {
        console.error('❌ Erro ao verificar eventos existentes:', eventError);
      } else if (existingEvents && existingEvents.length > 0) {
        console.log('⚠️ Evento já existe na última hora, pulando inserção:', event_type);
        shouldSkipEvent = true;
      }

      // Verificar visitas existentes para eventos de page_view/visit nas últimas 24h
      if (['page_view', 'visit'].includes(event_type)) {
        const { data: existingVisits, error: visitError } = await supabase
          .schema('tbz')
          .from('visitas')
          .select('id')
          .eq('session_id', sessionUUID)
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        if (visitError) {
          console.error('❌ Erro ao verificar visitas existentes:', visitError);
        } else if (existingVisits && existingVisits.length > 0) {
          console.log('⚠️ Visita já existe nas últimas 24h, pulando inserção de visita');
          shouldSkipVisit = true;
        }
      }
    } catch (error) {
      console.error('❌ Erro na verificação de deduplicação:', error);
    }

    // === 4. INSERIR EVENTO ===
    if (!shouldSkipEvent && sessionUUID) {
      try {
        const eventPayload = {
          session_id: sessionUUID, // FK
          event_type,
          event_data: event_data || null,
          produto: produto,
          created_at: new Date().toISOString()
        };

        console.log('📝 Inserindo evento...');
        const { data: eventData, error: eventError } = await supabase
          .schema('tbz')
          .from('eventos')
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
    }

    // === 5. INSERIR VISITA ===
    if (['page_view', 'visit'].includes(event_type) && sessionUUID && !shouldSkipVisit) {
      try {
        const visitaPayload = {
          session_id: sessionUUID, // FK
          landing_page: referer || null, // Usando referer como landing page aproximada ou a própria URL se disponível no client
          referrer: referer,
          produto: produto,
          created_at: new Date().toISOString()
        };

        console.log('📝 Inserindo visita...');
        const { data: visitData, error: visitError } = await supabase
          .schema('tbz')
          .from('visitas')
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
    }

    // === 6. INSERIR LEAD ===
    if (event_type?.toLowerCase() === 'lead_submit' && (name || email || phone)) {
      console.log('✅ Condições atendidas! Iniciando inserção do lead...');
      try {
        // Extrair urgency_level
        let urgencyLevel = urgency_level || null;
        if (!urgencyLevel && diagnosticResult && typeof diagnosticResult === 'object') {
          urgencyLevel = diagnosticResult.urgencyLevel || diagnosisLevel || null;
        } else if (!urgencyLevel && diagnosisLevel) {
          urgencyLevel = diagnosisLevel;
        }

        // Normalizar urgency_level
        if (urgencyLevel && typeof urgencyLevel === 'string') {
          const urgencyMap: { [key: string]: string } = {
            'high': 'ALTA', 'critical': 'CRÍTICA', 'emergency': 'EMERGENCIAL',
            'baixa': 'BAIXA', 'média': 'MÉDIA', 'media': 'MÉDIA',
            'alta': 'ALTA', 'crítica': 'CRÍTICA', 'critica': 'CRÍTICA',
            'emergencial': 'EMERGENCIAL'
          };
          const normalizedLevel = urgencyLevel.toLowerCase();
          urgencyLevel = urgencyMap[normalizedLevel] || urgencyLevel.toUpperCase();
        }

        const leadPayload = {
          name: name || null,
          email: email || null,
          phone: phone || null,
          urgency_level: urgencyLevel,
          fingerprint_hash: fingerprintHash, // FK (Opcional, mas temos aqui)
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('📝 Inserindo lead...');
        // Upsert no lead baseado no email
        const { data: leadData, error: leadError } = await supabase
          .schema('tbz')
          .from('leads')
          .upsert(leadPayload, { onConflict: 'email' })
          .select('id')
          .single();

        if (leadError) {
          console.error('❌ Erro ao inserir lead:', leadError);
        } else {
          const leadId = leadData.id;
          console.log('✅ Lead inserido/atualizado:', leadId);

          // Inserir associação do produto
          if (produto) {
            try {
              const productPayload = {
                lead_id: leadId, // FK
                produto: produto,
                created_at: new Date().toISOString()
              };

              console.log('📝 Inserindo associação de produto...');
              // Verificar se já existe para não duplicar (embora não tenhamos unique constraint explicita além do ID, é bom evitar spam)
              const { error: productError } = await supabase
                .schema('tbz')
                .from('lead_products')
                .insert(productPayload);

              if (productError) {
                console.error('❌ Erro ao inserir produto do lead:', productError);
              } else {
                console.log('✅ Produto do lead inserido com sucesso.');
              }
            } catch (productErr) {
              console.error('❌ Erro geral no produto do lead:', productErr);
            }
          }
        }
      } catch (error) {
        console.error('❌ Erro geral no lead:', error);
      }
    }

    console.log('=== TRACK-MAIN REQUEST END ===');

    const debugInfo = {
      event_type: event_type,
      session_id: sessionId,
      fingerprint_hash: fingerprintHash,
      lead_processed: event_type?.toLowerCase() === 'lead_submit'
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