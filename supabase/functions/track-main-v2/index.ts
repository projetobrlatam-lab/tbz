import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Headers CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Função para extrair IP do cliente
function getClientIP(req: Request): string {
  return req.headers.get('cf-connecting-ip') || 
         req.headers.get('x-real-ip') || 
         req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
         'unknown';
}

// Função para normalizar Accept-Language
function normalizeAcceptLanguage(acceptLanguage: string): string {
  return (acceptLanguage || '').split(',')[0].split(';')[0].trim().toLowerCase();
}

// --- Funções Auxiliares ---

function normalizeIP(ip: string): string {
  const cleanedIP = ip.replace(/^::ffff:/, '');
  if (cleanedIP.includes(':')) {
    return cleanedIP.split(':').slice(0, 4).join(':');
  }
  return cleanedIP;
}

async function getLocation(ip: string): Promise<{ country_code: string; country_name: string; city: string; region_name: string }> {
  try {
    if (ip === 'unknown' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip === '127.0.0.1') {
      return { country_code: 'XX', country_name: 'Unknown', city: 'Unknown', region_name: 'Unknown' };
    }
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,countryCode,country,city,regionName`, {
      signal: AbortSignal.timeout(3000)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data.status !== 'success') throw new Error('Geolocation failed');
    return {
      country_code: data.countryCode || 'XX',
      country_name: data.country || 'Unknown',
      city: data.city || 'Unknown',
      region_name: data.regionName || 'Unknown'
    };
  } catch (error) {
    console.error('Geolocation error:', error);
    return { country_code: 'XX', country_name: 'Unknown', city: 'Unknown', region_name: 'Unknown' };
  }
}

function isMobile(userAgent: string): boolean {
  return /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
}

function getBrowserInfo(userAgent: string): { browser: string; os: string; device_type: string } {
  let browser = 'Unknown', os = 'Unknown';
  
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
  else if (userAgent.includes('Edg')) browser = 'Edge';
  else if (userAgent.includes('Opera')) browser = 'Opera';
  
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac OS')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
  
  const device_type = isMobile(userAgent) ? 'mobile' : 'desktop';
  return { browser, os, device_type };
}

// Função para fazer upsert do identificador - DEVE SER CHAMADA PRIMEIRO
async function upsertIdentifier(supabase: any, fingerprintHash: string, traffic_id: string, ip: string, userAgent: string, acceptLanguage: string): Promise<string | null> {
  console.log('=== UPSERT IDENTIFIER START ===');
  console.log('Fingerprint Hash:', fingerprintHash);
  console.log('Traffic ID:', traffic_id);
  console.log('IP:', ip);
  
  try {
    const normalizedIP = normalizeIP(ip);
    const location = await getLocation(normalizedIP);
    const browserInfo = getBrowserInfo(userAgent);
    const language = normalizeAcceptLanguage(acceptLanguage);

    const identifierPayload = {
      fingerprint_hash: fingerprintHash,
      traffic_id: traffic_id,
      original_ip: ip,
      normalized_ip: normalizedIP,
      user_agent: userAgent,
      accept_language: language,
      country_code: location.country_code,
      country_name: location.country_name,
      city: location.city,
      region_name: location.region_name,
      created_at: new Date().toISOString()
    };

    console.log('Identifier payload:', JSON.stringify(identifierPayload, null, 2));

    const { data, error } = await supabase
      .schema('public')
      .from('oreino360-identificador')
      .upsert(identifierPayload, { 
        onConflict: 'fingerprint_hash', 
        ignoreDuplicates: false 
      })
      .select('id')
      .single();

    if (error) {
      console.error('Erro ao fazer upsert do identificador:', error);
      return null;
    }

    console.log('Identificador upserted successfully, ID:', data.id);
    return data.id;
  } catch (error) {
    console.error('Erro geral no upsert do identificador:', error);
    return null;
  }
}

// Função para atribuir tags baseadas no traffic_id - DEVE SER CHAMADA APÓS upsertIdentifier
async function assignVisitTagsByTrafficId(supabase: any, fingerprintHash: string, traffic_id: string, produto: string, fonte_de_trafego: string, tipo_de_funil: string, eventType?: string, eventData?: any): Promise<void> {
  console.log('=== ASSIGNING VISIT TAGS BY TRAFFIC ID ===');
  console.log('Fingerprint Hash:', fingerprintHash);
  console.log('Traffic ID:', traffic_id);
  console.log('Produto:', produto);
  console.log('Fonte de Tráfego:', fonte_de_trafego);
  console.log('Tipo de Funil:', tipo_de_funil);
  console.log('Event Type:', eventType);
  console.log('Event Data:', eventData);

  try {
    // Primeiro, buscar o identificador pelo fingerprint_hash
    const { data: identifier, error: identifierError } = await supabase
      .schema('public')
      .from('oreino360-identificador')
      .select('id')
      .eq('fingerprint_hash', fingerprintHash)
      .maybeSingle();

    if (identifierError) {
      console.error('Erro ao buscar identificador:', identifierError);
      return;
    }

    if (!identifier) {
      console.log('Identificador não encontrado para o fingerprint_hash:', fingerprintHash);
      return;
    }

    console.log('Identificador encontrado:', identifier.id);

    let tagName: string | null = null;
    let qualificationLevel: string | null = null;
    let stepReached: string | null = null;

    // === LÓGICA DE TAGS BASEADA NO COMPORTAMENTO ===
    if (eventType === 'page_view' && !eventData?.quiz_started) {
      tagName = 'Visita Inicial';
      qualificationLevel = 'desqualificado';
      stepReached = 'pagina_inicial';
    } else if (eventType === 'quiz_start') {
      tagName = 'Quiz Iniciado';
      qualificationLevel = 'qualificacao_baixa';
      stepReached = 'quiz_inicio';
    } else if (eventType === 'question_view') {
      const questionNumber = eventData?.question_number || eventData?.current_question || 1;
      tagName = `Pergunta ${questionNumber}`;
      qualificationLevel = questionNumber >= 10 ? 'qualificacao_media' : 'qualificacao_baixa';
      stepReached = `pergunta_${questionNumber}`;
    } else if (eventType === 'quiz_abandoned' || eventType === 'page_exit') {
      const currentQuestion = eventData?.current_question || eventData?.question_number;
      if (currentQuestion && currentQuestion >= 1 && currentQuestion <= 20) {
        tagName = `Abandono Pergunta ${currentQuestion}`;
        qualificationLevel = currentQuestion >= 10 ? 'qualificacao_baixa' : 'desqualificado';
        stepReached = `abandono_pergunta_${currentQuestion}`;
      } else {
        tagName = 'Abandono Inicial';
        qualificationLevel = 'desqualificado';
        stepReached = 'abandono_inicial';
      }
    } else if (eventType === 'lead_submit') {
      tagName = 'Lead Convertido';
      qualificationLevel = 'lead_convertido';
      stepReached = 'formulario_preenchido';
    } else if (eventType === 'checkout_click' || eventType === 'checkout_started') {
      tagName = 'Checkout Iniciado';
      qualificationLevel = 'qualificacao_alta';
      stepReached = 'checkout_iniciado';
    }

    // Se não há tag para atribuir, sair
    if (!tagName) {
      console.log('Nenhuma tag para atribuir baseada no evento');
      return;
    }

    // UPSERT: Atribuir a tag ao identificador (sobrescrever se já existir - não acumulativo)
    const visitTagPayload = {
      identifier_id: identifier.id,
      tag_name: tagName,
      tag_description: `Tag automática baseada no evento: ${eventType}`,
      traffic_id: traffic_id, // Para referência visual
      step_reached: stepReached,
      qualification_level: qualificationLevel,
      produto: produto,
      fonte_de_trafego: fonte_de_trafego,
      tipo_de_funil: tipo_de_funil,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Visit Tag payload:', JSON.stringify(visitTagPayload, null, 2));

    const { error: visitTagError } = await supabase
      .schema('public')
      .from('oreino360-visit_tags')
      .upsert(visitTagPayload, {
        onConflict: 'identifier_id,produto,tipo_de_funil',
        ignoreDuplicates: false
      });

    if (visitTagError) {
      console.error(`Erro ao atribuir visit tag ${tagName}:`, visitTagError);
    } else {
      console.log(`Visit tag ${tagName} atribuída com sucesso ao identificador ${identifier.id} (upsert - não acumulativo)`);
    }

  } catch (error) {
    console.error(`Erro geral ao processar visit tag para identificador:`, error);
  }
}

Deno.serve(async (req: Request) => {
  console.log('=== TRACK-MAIN-V2 DEBUG START ===');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const body = await req.json();
    console.log('Request body:', JSON.stringify(body, null, 2));

    // Extrair dados do body
    const {
      fingerprint_hash,
      traffic_id,
      event_type,
      event_data,
      produto,
      tipo_de_funil,
      utm_source,
      session_id,
      ip,
      user_agent,
      accept_language
    } = body;

    // Validação obrigatória
    if (!fingerprint_hash) {
      return new Response(
        JSON.stringify({ error: 'fingerprint_hash is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obter IP do cliente se não fornecido
    const clientIP = ip || getClientIP(req);
    const userAgent = user_agent || req.headers.get('user-agent') || 'Unknown';
    const acceptLanguage = accept_language || req.headers.get('accept-language') || 'en';

    console.log('Processed data:');
    console.log('- fingerprint_hash:', fingerprint_hash);
    console.log('- traffic_id:', traffic_id);
    console.log('- event_type:', event_type);
    console.log('- produto:', produto);
    console.log('- clientIP:', clientIP);

    // PASSO 1: SEMPRE fazer upsert do identificador PRIMEIRO
    console.log('=== STEP 1: UPSERT IDENTIFIER ===');
    const identifierId = await upsertIdentifier(
      supabase, 
      fingerprint_hash, 
      traffic_id || 'unknown', 
      clientIP, 
      userAgent, 
      acceptLanguage
    );

    if (!identifierId) {
      console.error('Falha ao criar/atualizar identificador');
      return new Response(
        JSON.stringify({ error: 'Failed to create/update identifier' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PASSO 2: Atribuir tags baseadas no evento (se aplicável)
    if (event_type && produto && utm_source && tipo_de_funil) {
      const relevantEvents = ['page_view', 'quiz_start', 'question_view', 'quiz_abandoned', 'page_exit', 'checkout_click', 'checkout_started', 'lead_submit'];
      
      if (relevantEvents.includes(event_type)) {
        console.log('=== STEP 2: ASSIGN VISIT TAGS ===');
        await assignVisitTagsByTrafficId(
          supabase, 
          fingerprint_hash, 
          traffic_id || 'unknown', 
          produto, 
          utm_source, 
          tipo_de_funil, 
          event_type, 
          event_data
        );
      }
    }

    console.log('=== TRACK-MAIN-V2 DEBUG END ===');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Event tracked and tagged based on TrafficD',
        traffic_id: traffic_id || fingerprint_hash,
        event_type: event_type
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Erro na Edge Function track-main-v2:', error.message);
    console.error('Stack trace:', error.stack);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});