import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, computeFingerprintHash, isValidUUID, normalizeAcceptLanguage, getClientIP, standardizeTipoDeFunil, standardizeProduto, checkGlobalDeduplication, checkEventDeduplication } from '../_shared/utils.ts';

const WEBHOOK_API_KEY = Deno.env.get('WEBHOOK_API_KEY') || 'tbz-track-2025-webhook-key';
console.log(`[webhook-track] ⚙️ Env WEBHOOK_API_KEY set: ${Deno.env.get('WEBHOOK_API_KEY') ? 'yes' : 'no'}; using prefix ${WEBHOOK_API_KEY?.slice(0,6)}...`);

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
  }
  return { country_code: 'XX', country_name: 'Unknown', city: 'Unknown', region_name: 'Unknown' };
}

function isBot(userAgent: string): boolean {
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /duckduckbot/i,
    /googlebot/i, /bingbot/i, /slurp/i, /headless/i,
    /phantom/i, /selenium/i, /webdriver/i, /curl/i,
    /wget/i, /python/i, /java/i
  ];
  
  return botPatterns.some(pattern => pattern.test(userAgent));
}

function isMobile(userAgent: string): boolean {
  return /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
}

function getBrowserInfo(userAgent: string): { browser: string; os: string; device_type: string } {
  let browser = 'Unknown';
  let os = 'Unknown';
  
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



Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  let supabaseAdmin; // Declarar supabaseAdmin com let aqui
  try {
    const apiKey = req.headers.get('x-api-key') || 
                   req.headers.get('authorization')?.replace('Bearer ', '') ||
                   new URL(req.url).searchParams.get('api_key');

    const expectedApiKey = WEBHOOK_API_KEY;
    const receivedXApiKey = req.headers.get('x-api-key');
    const receivedAuth = req.headers.get('authorization');
    const queryApiKey = new URL(req.url).searchParams.get('api_key');
    console.log(`[webhook-track] 🔐 Auth debug: expected prefix ${expectedApiKey?.slice(0,6)}..., x-api-key prefix ${receivedXApiKey?.slice(0,6) ?? 'none'}, auth prefix ${receivedAuth ? receivedAuth.slice(0,12) : 'none'}, query prefix ${queryApiKey?.slice(0,6) ?? 'none'}`);
    
    if (!apiKey || apiKey !== WEBHOOK_API_KEY) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid or missing API key. Use x-api-key header or api_key query param.',
          hint: 'This is a webhook endpoint that requires a custom API key.'
        }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    let requestData;
    
    if (req.method === 'POST') {
      const body = await req.text();
      if (body) {
        requestData = JSON.parse(body);
      } else {
        throw new Error('No data provided in POST request');
      }
    } else if (req.method === 'GET') {
      const url = new URL(req.url);
      requestData = {
        session_id: url.searchParams.get('session_id') || 'webhook-' + Date.now(),
        event_type: url.searchParams.get('event_type') || 'page_view',
        event_data: {
          page: url.searchParams.get('page') || '/',
          title: url.searchParams.get('title') || 'Webhook Visit'
        },
        produto: url.searchParams.get('produto'), 
        fonte_de_trafego: url.searchParams.get('fonte_de_trafego') || url.searchParams.get('utm_source'), // Renomeado + UTM fallback
        tipo_de_funil: url.searchParams.get('tipo_de_funil'), // Adicionado
        traffic_id: url.searchParams.get('traffic_id') || url.searchParams.get('utm_medium'), // Adicionado traffic_id + UTM fallback
      };
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { 
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Extrair traffic_id dos dados de entrada (POST ou GET)
    let traffic_id = requestData.traffic_id || requestData.utm_medium || null;
    let fonte_de_trafego_final = requestData.fonte_de_trafego || requestData.utm_source || null;

    // Fallback de fonte de tráfego e traffic_id pelo domínio do referer
    const refererHeader = req.headers.get('referer') || req.headers.get('referrer') || '';
    let referrerDomain = '';
    try {
      if (refererHeader) {
        const ref = new URL(refererHeader);
        referrerDomain = (ref.hostname || '').toLowerCase();
      }
    } catch (_) {
      // ignora erros de parse de URL
    }
    if (!fonte_de_trafego_final) {
      fonte_de_trafego_final = referrerDomain || null;
    }
    if (!traffic_id) {
      traffic_id = requestData.utm_id || referrerDomain || null;
    }
    
    // Garantir que session_id nunca seja undefined
    const session_id_final = requestData.session_id || `webhook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const { event_type, event_data, produto, tipo_de_funil } = requestData;
    const originalIP = requestData?.ip_address || getClientIP(req);
    const userAgent = requestData?.user_agent || (req.headers.get('user-agent') || '');
    const acceptLanguage = req.headers.get('accept-language') || '';
const acceptEncoding = req.headers.get('accept-encoding') || '';
const effectiveAcceptLanguage = normalizeAcceptLanguage(requestData?.accept_language || acceptLanguage);
const effectiveAcceptEncoding = requestData?.accept_encoding || acceptEncoding;
    const tipo_de_funil_final = standardizeTipoDeFunil(tipo_de_funil);

    // Validação: produto é obrigatório
    if (!produto || typeof produto !== 'string' || produto.trim() === '') {
      console.error('[webhook-track] Produto é obrigatório e não foi fornecido ou é inválido.');
      return new Response(
        JSON.stringify({ success: false, error: 'Produto é obrigatório e não foi fornecido ou é inválido.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // IGNORAR EVENTOS DE ABANDONO AQUI
    if (event_type.toLowerCase() === 'abandonment') {
      console.log(`🚫 Evento de abandono recebido em webhook-track, ignorando. Deve ser tratado por track-abandonment.`);
      return new Response(
        JSON.stringify({ success: true, message: 'Evento de abandono ignorado por webhook-track.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geoData = await getLocation(originalIP); // geoData agora inclui region_name

    const is_bot = isBot(userAgent);
    const { browser, os, device_type } = getBrowserInfo(userAgent);

    console.log(`🔗 Webhook evento: ${event_type} | IP: ${originalIP} | País: ${geoData.country_code} | Bot: ${is_bot} | Device: ${device_type} | Produto: ${produto} | Fonte de Tráfego: ${fonte_de_trafego_final} | Tipo de Funil: ${tipo_de_funil_final} | Traffic ID: ${traffic_id}`); 

    const enrichedEventData = {
      ...event_data,
      ip: originalIP,
      normalized_ip: normalizeIP(originalIP),
      user_agent: userAgent,
      accept_language: effectiveAcceptLanguage,
      accept_encoding: effectiveAcceptEncoding,
      country_code: geoData.country_code,
      country_name: geoData.country_name,
      city: geoData.city,
      region_name: geoData.region_name,
      is_bot,
      browser,
      os,
      device_type,
      fonte_de_trafego: fonte_de_trafego_final,
      tipo_de_funil: tipo_de_funil_final,
      traffic_id: traffic_id
    };

    const rawSupabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const remoteUrlOverride = Deno.env.get('SUPABASE_URL_REMOTE') || 'https://ynxsksgttbzxooixgqzf.supabase.co';
    const supabaseUrl = /127\.0\.0\.1|localhost/.test(rawSupabaseUrl ?? '') ? remoteUrlOverride : rawSupabaseUrl;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey); // Inicializar supabaseAdmin aqui

    console.log(`[webhook-track] ⚙️ SUPABASE_URL raw: ${rawSupabaseUrl}`);
    console.log(`[webhook-track] 🔄 SUPABASE_URL efetivo: ${supabaseUrl}`);
    console.log(`[webhook-track] ⚙️ SERVICE_ROLE_KEY prefixo: ${supabaseServiceKey?.slice(0, 8)}...`);
    console.log(`🔧 [webhook-track] Supabase Admin inicializado`);

    const baseNormalizedIP = normalizeIP(originalIP);
    const fingerprintHash = requestData?.fingerprint
      ? requestData.fingerprint
      : await computeFingerprintHash([
          baseNormalizedIP,
          userAgent,
          effectiveAcceptLanguage
        ]);

    console.log(`🔑 [webhook-track] Fingerprint hash gerado: ${fingerprintHash}`);

    // Consultar sessão existente para evitar sobrescrever UTMs fortes
    const { data: existingSessionData, error: existingSessionError } = await supabaseAdmin
      .schema('public')
      .from('oreino360-sessoes')
      .select('id, fonte_de_trafego, traffic_id')
      .eq('session_id', session_id_final)
      .limit(1);

    if (existingSessionError) {
      console.warn(`[webhook-track] ⚠️ Erro ao consultar sessão existente: ${existingSessionError.message}`);
    }
    const existingSessionRow = existingSessionData?.[0];
    const isStrong = (v?: string | null) => {
      const s = (v ?? '').trim().toLowerCase();
      return s !== '' && s !== 'direct' && s !== 'unknown';
    };

    const sessionPayload: Record<string, unknown> = {
      session_id: session_id_final,
      ip_address: originalIP,
      country_code: geoData.country_code,
      current_step: event_type || 'unknown',
      last_activity: new Date().toISOString(),
      fingerprint_hash: fingerprintHash,
      produto,
      tipo_de_funil: tipo_de_funil_final
    };

    if (!existingSessionRow) {
      // Primeira criação: persistir UTMs mesmo que sejam 'direct'
      sessionPayload.fonte_de_trafego = fonte_de_trafego_final;
      sessionPayload.traffic_id = traffic_id;
    } else {
      const existingFonte = (existingSessionRow.fonte_de_trafego as string | null) ?? null;
      const existingTraffic = (existingSessionRow.traffic_id as string | null) ?? null;
      // Apenas atualizar UTMs se novas forem fortes e existentes fracas/ausentes
      if (isStrong(fonte_de_trafego_final) && !isStrong(existingFonte)) {
        sessionPayload.fonte_de_trafego = fonte_de_trafego_final;
      }
      if (isStrong(traffic_id) && !isStrong(existingTraffic)) {
        sessionPayload.traffic_id = traffic_id;
      }
    }

    console.log(`📝 [webhook-track] Preparando upsert de sessão:`, JSON.stringify(sessionPayload, null, 2));

    const sessionResponse = await fetch(`${supabaseUrl}/rest/v1/oreino360-sessoes?on_conflict=session_id`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
        'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=representation'
      },
      body: JSON.stringify(sessionPayload)
    });

    console.log(`📊 [webhook-track] Resposta do upsert de sessão - Status: ${sessionResponse.status}`);

    if (!sessionResponse.ok) {
      const errText = await sessionResponse.text();
      console.error(`❌ [webhook-track] Falha ao upsert sessão: ${sessionResponse.status} ${sessionResponse.statusText} - ${errText}`);
      console.error(`❌ [webhook-track] Payload da sessão que causou erro:`, JSON.stringify(sessionPayload, null, 2));
      return new Response(JSON.stringify({
        success: false,
        error: 'Falha ao criar/atualizar sessão',
        status: sessionResponse.status,
        details: errText,
        payload: sessionPayload
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const sessionRows = await sessionResponse.json();
    // Se o upsert retornou a linha criada/atualizada, use o id dela; caso contrário (p.ex. conflito sem alteração), use o id da sessão existente
    let sessionUUID: string | undefined = sessionRows?.[0]?.id;
    if (!sessionUUID && existingSessionRow) {
      sessionUUID = existingSessionRow.id as string;
      console.log(`[webhook-track] Upsert de sessão não retornou representação; usando existingSessionRow.id = ${sessionUUID}`);
    }

    console.log(`✅ [webhook-track] Sessão upsertada com sucesso - UUID: ${sessionUUID}`);
    console.log(`✅ [webhook-track] Dados da sessão retornados:`, JSON.stringify(sessionRows, null, 2));

    if (!sessionUUID) {
      console.error(`❌ [webhook-track] sessionUUID é undefined após upsert bem-sucedido`);
      console.error(`❌ [webhook-track] Resposta completa da sessão:`, JSON.stringify(sessionRows, null, 2));
      return new Response(JSON.stringify({
        success: false,
        error: 'sessionUUID não foi retornado após upsert da sessão',
        sessionResponse: sessionRows
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Removido dedup global 24h por fingerprint; visitas/eventos não são suprimidos globalmente.

    const isVisitEvent = event_type === 'visit' || event_type === 'page_view';
    let shouldInsertEvent = true;
    if (!isVisitEvent) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: existingEvents, error: eventDedupError } = await supabaseAdmin
        .schema('public')
        .from('oreino360-eventos')
        .select('id')
        .eq('event_type', event_type)
        .gte('created_at', oneHourAgo)
        .contains('event_data', { fingerprint_hash: fingerprintHash });
      if (eventDedupError) {
        console.warn('Falha ao checar dedup de evento 1h:', eventDedupError.message);
      } else if (Array.isArray(existingEvents) && existingEvents.length > 0) {
        shouldInsertEvent = false;
        console.log(`🔁 Dedup: evento '${event_type}' suprimido nas últimas 1h para fingerprint ${fingerprintHash}`);
      }
    }

    if (shouldInsertEvent) {
      console.log(`📝 [webhook-track] Preparando inserção de evento:`, JSON.stringify({
        session_id: sessionUUID,
        event_type,
        event_data: { ...enrichedEventData, fingerprint_hash: fingerprintHash },
        produto,
        fonte_de_trafego: fonte_de_trafego_final,
        tipo_de_funil: tipo_de_funil
      }, null, 2));

      const eventResponse = await fetch(`${supabaseUrl}/rest/v1/oreino360-eventos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          session_id: sessionUUID,
          event_type,
          event_data: { ...enrichedEventData, fingerprint_hash: fingerprintHash },
          produto,
          fonte_de_trafego: fonte_de_trafego_final,
          tipo_de_funil: tipo_de_funil_final
        })
      });

      console.log(`📊 [webhook-track] Resposta da inserção de evento - Status: ${eventResponse.status}`);

      if (!eventResponse.ok) {
        const errorText = await eventResponse.text();
        console.error(`❌ [webhook-track] Falha ao inserir evento: ${eventResponse.status} ${eventResponse.statusText} - ${errorText}`);
        console.error(`❌ [webhook-track] Payload do evento que causou erro:`, JSON.stringify({
          session_id: sessionUUID,
          event_type,
          event_data: { ...enrichedEventData, fingerprint_hash: fingerprintHash },
          produto,
          fonte_de_trafego: fonte_de_trafego_final,
          tipo_de_funil: tipo_de_funil,
          created_at: new Date().toISOString()
        }, null, 2));
        return new Response(JSON.stringify({
          success: false,
          error: 'Falha ao inserir evento',
          status: eventResponse.status,
          details: errorText,
          eventPayload: {
            session_id: sessionUUID,
            event_type,
            event_data: { ...enrichedEventData, fingerprint_hash: fingerprintHash },
            produto,
            fonte_de_trafego: fonte_de_trafego_final,
            tipo_de_funil: tipo_de_funil
          }
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log(`✅ [webhook-track] Evento inserido com sucesso`);
    } else {
      console.log('⏭️ [webhook-track] Evento suprimido por dedup 1h; seguindo fluxo.');
    }

    // Inserir AI analysis se disponível e houver leadId no evento
    const aiAnalysisData = (event_data?.ai_analysis || event_data?.analysis_data);
    const eventLeadId = (event_data?.leadId || null) as string | null;
    if (aiAnalysisData && eventLeadId) {
      const analysisPayload = {
        lead_id: eventLeadId,
        ai_analysis_data: aiAnalysisData,
        fonte_de_trafego: fonte_de_trafego_final || (event_data?.fonte_de_trafego ?? 'organic')
      };
      const aiResp = await fetch(`${supabaseUrl}/rest/v1/oreino360-lead_ai_analysis`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(analysisPayload)
      });
      if (!aiResp.ok) {
        const errText = await aiResp.text();
        console.error(`[webhook-track] ❌ Falha ao inserir lead_ai_analysis: ${aiResp.status} ${errText}`);
      } else {
        console.log(`[webhook-track] ✅ Lead AI analysis inserido com sucesso para lead ${eventLeadId}`);
      }
    }

    if (event_type === 'lead_submit') {
      const name = (event_data?.name ?? '').toString();
      const email = (event_data?.email ?? '').toString();
      const phone = (event_data?.phone ?? '').toString();
      const trafficId = (event_data?.traffic_id || event_data?.trafficId || '') as string;

      if (!trafficId && !email) {
        console.warn('[webhook-track] Lead_submit sem traffic_id e email. Pulando inserção na tabela de leads.');
      } else {
        // 1. UPSERT na tabela oreino360-leads para obter o lead_id
        const leadUpsertPayload: Record<string, unknown> = {
          traffic_id: trafficId || null,
          created_at: new Date().toISOString()
        };
        if (name) leadUpsertPayload.name = name;
        if (email) leadUpsertPayload.email = email;
        if (phone) leadUpsertPayload.phone = phone;

        const { data: leadData, error: leadError } = await supabaseAdmin
          .schema('public')
          .from('oreino360-leads')
          .upsert(leadUpsertPayload, { onConflict: trafficId ? 'traffic_id' : 'email', ignoreDuplicates: false })
          .select('id'); // Seleciona o ID do lead upsertado

        if (leadError) {
          console.error('[webhook-track] Falha ao upsert lead:', leadError.message);
          throw new Error(`Falha ao upsert lead: ${leadError.message}`);
        }
        const leadId = leadData?.[0]?.id;

        if (leadId) {
          // 2. UPSERT na tabela oreino360-lead_products
          const leadProductPayload = {
            lead_id: leadId,
            produto: produto,
            tipo_de_funil: tipo_de_funil, // Adiciona tipo_de_funil
            last_interaction_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const { error: leadProductError } = await supabaseAdmin
            .schema('public')
            .from('oreino360-lead_products')
            .upsert(leadProductPayload, { onConflict: 'lead_id,produto', ignoreDuplicates: false });

          if (leadProductError) {
            console.error('[webhook-track] Falha ao upsert lead_product:', leadProductError.message);
            throw new Error(`Falha ao upsert lead_product: ${leadProductError.message}`);
          }
          console.log(`[webhook-track] Lead ${leadId} associado ao produto ${produto} e funil ${tipo_de_funil}.`);

          // 3. UPSERT na nova tabela oreino360-lead_traffic_details
          if (fonte_de_trafego_final) {
            const leadTrafficDetailPayload = {
              lead_id: leadId,
              fonte_de_trafego: fonte_de_trafego_final, // Usar fonte_de_trafego_final
              tipo_de_funil: tipo_de_funil, // Adiciona tipo_de_funil
              created_at: new Date().toISOString()
            };

            const { error: leadTrafficError } = await supabaseAdmin
              .schema('public')
              .from('oreino360-lead_traffic_details')
              .upsert(leadTrafficDetailPayload, { onConflict: 'lead_id,fonte_de_trafego', ignoreDuplicates: false });

            if (leadTrafficError) {
              console.error('Falha ao upsert lead_traffic_details:', leadTrafficError.message);
              throw new Error(`Falha ao upsert lead_traffic_details: ${leadTrafficError.message}`);
            }
            console.log(`[webhook-track] Lead ${leadId} associado à fonte ${fonte_de_trafego_final}.`);
          } else {
            console.log('[webhook-track] fonte_de_trafego ausente, pulando upsert em oreino360-lead_traffic_details.');
          }

        } else {
          console.error('[webhook-track] Lead ID não obtido após upsert na tabela oreino360-leads.');
        }
      }
    }

    if (event_type === 'page_view' || event_type === 'visit') {
      console.log(`🌐 [webhook-track] Processando evento de visita/page_view`);
      
      const refererHeader = req.headers.get('referer') || req.headers.get('referrer') || '';
      const landingPage = (event_data?.page || event_data?.url || '/') as string;
      const referrer = (event_data?.referrer || event_data?.referer || refererHeader) as string;
  
      const visitFingerprintHash = fingerprintHash;
  
      console.log(`🔑 [webhook-track] Fingerprint hash para visita: ${visitFingerprintHash}`);
  
      // Dedup de visita por sessão em janela de 1 minuto
      let suppressVisit = false;
      try {
        const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
        const { data: recentVisits, error: visitCheckError } = await supabaseAdmin
          .schema('public')
          .from('oreino360-visitas')
          .select('id')
          .eq('session_id', sessionUUID)
          .gte('created_at', oneMinuteAgo)
          .limit(1);
        if (visitCheckError) {
          console.warn(`[webhook-track] ⚠️ Falha ao checar dedup de visitas: ${visitCheckError.message}`);
        } else if (Array.isArray(recentVisits) && recentVisits.length > 0) {
          suppressVisit = true;
          console.log(`🔁 [webhook-track] Dedup: suprimindo visita nas últimas 1min para sessão ${sessionUUID}`);
        }
      } catch (e) {
        console.warn(`[webhook-track] ⚠️ Erro na checagem de dedup de visitas: ${(e as Error).message}`);
      }

      if (!suppressVisit) {
        console.log(`📝 [webhook-track] Preparando inserção de visita:`, JSON.stringify({
          session_id: sessionUUID,
          ip_address: originalIP,
          country_code: geoData.country_code,
          landing_page: landingPage,
          produto,
          fonte_de_trafego: fonte_de_trafego_final,
          tipo_de_funil: tipo_de_funil_final
        }, null, 2));

        const visitResponse = await fetch(`${supabaseUrl}/rest/v1/oreino360-visitas`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey ?? ''}`,
            'apikey': supabaseServiceKey ?? '',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            session_id: sessionUUID, // Usar sessionUUID (UUID) em vez de session_id_final (string)
            ip_address: originalIP,
            country_code: geoData.country_code,
            country_name: geoData.country_name,
            city: geoData.city,
            region_name: geoData.region_name, // Novo campo
            user_agent: userAgent,
            referrer,
            landing_page: landingPage,
            produto,
            fonte_de_trafego: fonte_de_trafego_final,
            tipo_de_funil: tipo_de_funil_final,
            created_at: new Date().toISOString()
          })
        });

        console.log(`📊 [webhook-track] Resposta da inserção de visita - Status: ${visitResponse.status}`);

        if (!visitResponse.ok) {
          const errText = await visitResponse.text();
          console.error(`❌ [webhook-track] Falha ao inserir visita: ${visitResponse.status} ${visitResponse.statusText} - ${errText}`);
          return new Response(JSON.stringify({
            success: false,
            error: 'Falha ao inserir visita',
            status: visitResponse.status,
            details: errText
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } else {
          console.log(`✅ [webhook-track] Visita registrada para fingerprint ${visitFingerprintHash}`);
        }
      } else {
        console.log(`⏭️ [webhook-track] Visita suprimida por dedup 1min para sessão ${sessionUUID}`);
      }
  
      console.log(`📝 [webhook-track] Preparando upsert de identificador:`, JSON.stringify({
        fingerprint_hash: visitFingerprintHash,
        original_ip: originalIP,
        normalized_ip: normalizeIP(originalIP),
        country_code: geoData.country_code,
        produto,
        fonte_de_trafego: fonte_de_trafego_final,
        tipo_de_funil: tipo_de_funil_final,
        traffic_id: traffic_id
      }, null, 2));

      const normalizedForId = normalizeIP(originalIP);
      const shouldUpsertIdentificador = event_type === 'page_view' || event_type === 'visit';
      
      if (normalizedForId.startsWith('18.229.')) {
        console.log(`[webhook-track] ⏭️ Supressão: ignorando upsert de identificador para IP normalizado ${normalizedForId}.`);
      } else if (!shouldUpsertIdentificador) {
        console.log(`[webhook-track] ⏭️ Upsert de identificador ignorado para evento ${event_type} - apenas page_view/visit fazem upsert`);
      } else {
        const identificadorPayload = {
          fingerprint_hash: visitFingerprintHash,
          original_ip: originalIP,
          normalized_ip: normalizedForId, // Corrigido: campo obrigatório
          user_agent: userAgent,
          accept_language: effectiveAcceptLanguage,
          accept_encoding: effectiveAcceptEncoding,
          country_code: geoData.country_code,
          country_name: geoData.country_name,
          city: geoData.city,
          region_name: geoData.region_name, // Novo campo
          produto, // Garante que o produto é passado para a tabela de identificadores
          fonte_de_trafego: fonte_de_trafego_final, // Usar fonte_de_trafego_final
          tipo_de_funil: tipo_de_funil_final, // Adiciona tipo_de_funil
          traffic_id: traffic_id, // Adicionar traffic_id
        };
  
        const identificadorResponse = await fetch(`${supabaseUrl}/rest/v1/oreino360-identificador?on_conflict=fingerprint_hash`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey ?? ''}`,
            'apikey': supabaseServiceKey ?? '',
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates,return=minimal'
          },
          body: JSON.stringify(identificadorPayload)
        });
  
        console.log(`📊 [webhook-track] Resposta do upsert de identificador - Status: ${identificadorResponse.status}`);
  
        if (!identificadorResponse.ok) {
          const errText = await identificadorResponse.text();
          console.error(`❌ [webhook-track] Falha ao upsert identificador: ${identificadorResponse.status} ${identificadorResponse.statusText} - ${errText}`);
        } else {
          console.log(`✅ [webhook-track] Identificador upserted para fingerprint ${visitFingerprintHash}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Evento registrado com sucesso',
        geo: geoData,
        device_info: { browser, os, device_type, is_bot }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Erro na função:', error);
    
    return new Response(
      JSON.stringify({
        error: (error as Error).message || 'Erro interno do servidor'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});