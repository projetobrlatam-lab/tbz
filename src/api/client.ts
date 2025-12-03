import { EventType, DashboardMetrics, Visit, Sale, LeadTagAssignment, LeadWithTags, AbandonmentData, Product } from '../types';
import { supabase } from '../integrations/supabase/client';
import { collectBrowserIdentity, computeFingerprint } from '../utils/browserIdentity';
import { generateSessionId } from '../utils/validation';

const SUPABASE_URL = 'https://awqqqkqvzlggczcoawvi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3cXFxa3F2emxnZ2N6Y29hd3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODE1MTEsImV4cCI6MjA4MDI1NzUxMX0.9e0KXWDZWc0UBr5clyf_bhl0rWEAMYDhXVn0ZwGFqWM';

const isBrowser = typeof window !== 'undefined';

// Funções de utilidade de Session Storage (mantidas para getSessionId)
const safeSessionStorage = {
  get(key: string): string | null {
    if (!isBrowser) return null;
    try {
      return window.sessionStorage.getItem(key);
    } catch (error) {
      console.warn(`[sessionStorage:get] Falha ao ler chave "${key}":`, error);
      return null;
    }
  },
  set(key: string, value: string) {
    if (!isBrowser) return;
    try {
      window.sessionStorage.setItem(key, value);
    } catch (error) {
      console.warn(`[sessionStorage:set] Falha ao gravar chave "${key}":`, error);
    }
  },
  remove(key: string) {
    if (!isBrowser) return;
    try {
      window.sessionStorage.removeItem(key);
    } catch (error) {
      console.warn(`[sessionStorage:remove] Falha ao remover chave "${key}":`, error);
    }
  },
};

const getAuthToken = async (): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return SUPABASE_ANON_KEY;
  }
  return session.access_token;
};

const getSessionId = (): string => {
  if (!isBrowser) {
    return generateSessionId();
  }

  let sessionId = safeSessionStorage.get('quiz_session_id');
  const sessionTimestamp = safeSessionStorage.get('quiz_session_timestamp');

  const SESSION_TIMEOUT = 3600000; // 1 hora em ms

  if (!sessionId || !sessionTimestamp || (Date.now() - parseInt(sessionTimestamp, 10) > SESSION_TIMEOUT)) {
    sessionId = generateSessionId();
    safeSessionStorage.set('quiz_session_id', sessionId);
    safeSessionStorage.set('quiz_session_timestamp', Date.now().toString());
  }

  return sessionId;
};

// Helper para lidar com SessionStorage de forma segura
const getCachedIdentityAndFingerprint = async () => {
  // Tenta recuperar do sessionStorage primeiro
  const cachedFingerprint = safeSessionStorage.get('quiz_fingerprint');
  const cachedIdentityRaw = safeSessionStorage.get('browser_identity');
  if (cachedFingerprint && cachedIdentityRaw) {
    try {
      const parsedIdentity = JSON.parse(cachedIdentityRaw);
      return { identity: parsedIdentity as any, fingerprint: cachedFingerprint };
    } catch {
      // Se falhar em parsear, continua para coletar novamente
    }
  }

  // Se não existir cache, coleta apenas dados do browser (sem IP externo)
  const identity = await collectBrowserIdentity();

  // IMPORTANTE: Não gerar fingerprint no frontend, deixar o backend fazer isso
  // usando o IP correto dos headers da requisição
  const fingerprint = await computeFingerprint([
    '', // IP será determinado pelo backend
    identity?.userAgent || '',
    identity?.acceptLanguage || ''
  ]);

  // Salva em cache para futuras chamadas dentro da mesma sessão
  safeSessionStorage.set('browser_identity', JSON.stringify(identity));
  safeSessionStorage.set('quiz_fingerprint', fingerprint);

  return { identity, fingerprint };
};

export const trackEvent = async (eventType: EventType, payload?: any): Promise<any> => {
  if (eventType === EventType.ABANDONMENT) {
    console.warn('trackEvent foi chamado com EventType.ABANDONMENT. Use recordAbandonment para isso.');
    return { sessionId: getSessionId() };
  }

  try {
    const sessionId = getSessionId();
    const product = payload?.produto ?? 'tbz';
    const funnelType = payload?.tipo_de_funil || 'quiz';

    // REGRA SIMPLES: Apenas UTMs da URL atual, sem fallbacks ou sessionStorage
    const urlParams = new URLSearchParams(window.location.search);
    const utm_source = urlParams.get('utm_source') || null;
    const utm_medium = urlParams.get('utm_medium') || null;

    console.log(`[client.ts] 🎯 UTMs da URL: utm_source=${utm_source}, utm_medium=${utm_medium}`);

    // Utiliza cache de identidade + fingerprint
    const { identity, fingerprint } = await getCachedIdentityAndFingerprint();

    // Preparar event_data como JSON
    const eventDataObj = {
      ...payload,
      name: payload?.name || null,
      email: payload?.email || null,
      phone: payload?.phone || null,
      questionId: payload?.questionId || null,
      url: isBrowser ? window.location.href : null,
      referrer: isBrowser ? document.referrer || null : null,
      page_title: isBrowser ? document.title || null : null,
      diagnosisLevel: payload?.diagnosisLevel,
      funnel_type: funnelType.toLowerCase(),
      utm_source: utm_source,
      utm_medium: utm_medium,
    };

    // Preparar payload para a RPC function (track_event_v2)
    const rpcPayload = {
      p_session_id: sessionId,
      p_event_type: eventType,
      p_event_data: eventDataObj,
      p_produto: product,
      p_fonte_de_trafego: utm_source || 'direct',
      p_tipo_de_funil: funnelType.toLowerCase(),
      p_traffic_id: utm_medium || null,
      p_fingerprint_hash: fingerprint || null,
      p_user_agent: identity?.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : null),
      p_ip: null, // IP será extraído headers se possível, ou ficará null (RPC lida com isso se passado null? Não, RPC precisa do IP. Mas client não tem IP. O Supabase injeta? Não via RPC direto. Precisamos confiar no header x-forwarded-for que o Supabase recebe. Mas no body não vai. O RPC pode pegar `current_setting('request.headers')::json->>'x-forwarded-for'`? Sim, mas é complexo. Vamos mandar null e aceitar que o IP pode não ser gravado corretamente na tabela identificador via RPC direto do client, A MENOS que usemos uma Edge Function. Mas a Edge Function falhou. O RPC é a alternativa. O IP é crítico para fingerprint? O fingerprint já vem calculado do front (com IP anonimizado se possível, ou sem IP). O `identificador` tabela pede `original_ip`. Se mandarmos null, ok. O fingerprint é o que importa para dedup.)
      p_url: isBrowser ? window.location.href : null,
      p_referrer: isBrowser ? document.referrer || null : null,
      p_email: payload?.email || null,
      p_name: payload?.name || null,
      p_phone: payload?.phone || null,
      p_urgency_level: payload?.diagnosticResult?.urgencyLevel || payload?.diagnosisLevel || null
    };

    console.log(`🚀 [DEBUG client.ts] Enviando payload para RPC track_event_v2:`, rpcPayload);

    const url = `${SUPABASE_URL}/rest/v1/rpc/track_event_v2`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Profile': 'tbz',
        'Prefer': 'return=representation' // Para receber o retorno do JSON
      },
      body: JSON.stringify(rpcPayload),
      keepalive: true
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`Erro HTTP ao chamar track_event_v2: ${response.status} - ${text}`);
      // Não lançar erro para não quebrar a navegação do usuário, apenas logar
      return { sessionId };
    }

    const responseData = await response.json();
    console.log('[trackEvent] Resposta RPC:', responseData);

    return { sessionId, lead_id: responseData.session_uuid }; // Retornando session_uuid como lead_id temporariamente se precisar, ou ajustar tipagem
  } catch (error) {
    console.error('Erro ao registrar evento:', error);
    // Não lançar erro
    return { sessionId: getSessionId() };
  }
};



export const assignTagToLead = async (leadId: string, tagName: string, produto: string, description?: string): Promise<LeadTagAssignment | null> => {
  try {
    const authToken = await getAuthToken();

    const response = await fetch(`${SUPABASE_URL}/functions/v1/assign-tag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        lead_id: leadId,
        tag_name: tagName,
        produto: produto,
        description: description,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro HTTP ao atribuir tag: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return {
      ...result.assignment,
      tag_category_inferred: '',
      tag_source_inferred: '',
    };

  } catch (error) {
    console.error('Erro ao atribuir tag ao lead:', error);
    throw error;
  }
};

export const getMetrics = async (dateFilter: string = 'all', customDate?: string, produto?: string, fonteDeTrafego?: string, tipoDeFunil?: string): Promise<DashboardMetrics> => {
  try {
    console.log('[API Client] getMetrics - Parâmetros recebidos:', {
      dateFilter,
      customDate,
      produto,
      fonteDeTrafego,
      tipoDeFunil
    });

    const params = new URLSearchParams();
    params.append('date_filter', dateFilter);
    if (customDate) {
      params.append('custom_date', customDate);
    }
    if (produto && produto !== 'all') {
      params.append('produto', produto);
    }
    if (fonteDeTrafego && fonteDeTrafego !== 'all') {
      params.append('fonte_de_trafego', fonteDeTrafego);
    }
    if (tipoDeFunil && tipoDeFunil !== 'all') {
      params.append('tipo_de_funil', tipoDeFunil);
    }

    console.log('[API Client] getMetrics - URL construída:', `${SUPABASE_URL}/functions/v1/get-metrics?${params.toString()}`);

    const response = await fetch(`${SUPABASE_URL}/functions/v1/get-metrics?${params.toString()}`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
    }

    const metrics = await response.json();
    console.log('[API Client] getMetrics - Resposta da API:', metrics);

    return {
      total_visits: metrics.total_visits || 0,
      total_quiz_starts: metrics.total_quiz_starts || 0,
      total_leads: metrics.total_leads || 0,
      total_quiz_complete: metrics.total_quiz_complete || 0,
      total_checkout_starts: metrics.total_checkout_starts || 0,
      total_sales: metrics.total_sales || 0,
      total_sales_value: metrics.total_sales_value || 0,
      total_abandonments: metrics.total_abandonments || 0,
      total_comments: metrics.total_comments || 0,
      comments_to_visits_conversion: metrics.comments_to_visits_conversion || 0,
      conversion_rates: {
        visit_to_quiz_start: metrics.conversion_rates?.visit_to_quiz_start || 0,
        quiz_start_to_lead: metrics.conversion_rates?.quiz_start_to_lead || 0,
        lead_to_quiz_complete: metrics.conversion_rates?.lead_to_quiz_complete || 0,
        quiz_complete_to_checkout: metrics.conversion_rates?.quiz_complete_to_checkout || 0,
        sales_conversion_from_leads: metrics.conversion_rates?.sales_conversion_from_leads || 0,
      },
      funnel_data: metrics.funnel_data || [],
      abandonment_by_step: metrics.abandonment_by_step || {},
      abandonment_rate: metrics.abandonment_rate || 0,
    };
  } catch (error) {
    console.error('Erro ao obter métricas:', error);
    throw error;
  }
};

export const getVisits = async (dateFilter: string, customDate?: string, produto?: string, fonteDeTrafego?: string, tipoDeFunil?: string): Promise<Visit[]> => {
  try {
    const authToken = await getAuthToken();

    const response = await fetch(`${SUPABASE_URL}/functions/v1/get-visits`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        date_filter: dateFilter,
        custom_date: customDate || undefined,
        produto: produto && produto !== 'all' ? produto : undefined,
        fonte_de_trafego: fonteDeTrafego && fonteDeTrafego !== 'all' ? fonteDeTrafego : undefined,
        tipo_de_funil: tipoDeFunil && tipoDeFunil !== 'all' ? tipoDeFunil : undefined,
      })
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const json = await response.json();
    return json?.visits ?? [];

  } catch (error: unknown) {
    console.error("Erro ao carregar visitas:", error);
    throw error;
  }
};

export const getSales = async (dateFilter: string, customDate?: string, produto?: string, fonteDeTrafego?: string): Promise<Sale[]> => {
  try {
    const authToken = await getAuthToken();

    const response = await fetch(`${SUPABASE_URL}/functions/v1/get-sales`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        date_filter: dateFilter,
        custom_date: customDate || undefined,
        produto: produto && produto !== 'all' ? produto : undefined,
        fonte_de_trafego: fonteDeTrafego && fonteDeTrafego !== 'all' ? fonteDeTrafego : undefined,
      })
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const json = await response.json();
    return json?.sales ?? [];

  } catch (error: unknown) {
    console.error("Erro ao carregar vendas:", error);
    throw error;
  }
};

export const getVisitLocations = async (dateFilter: string, customDate?: string, produto?: string, fonteDeTrafego?: string, tipoDeFunil?: string): Promise<Array<{ region_name: string; count: number }>> => {
  try {
    const authToken = await getAuthToken();
    const params = new URLSearchParams();
    params.append('date_filter', dateFilter);
    if (customDate) params.append('custom_date', customDate);
    if (produto && produto !== 'all') params.append('produto', produto);
    if (fonteDeTrafego && fonteDeTrafego !== 'all') params.append('fonte_de_trafego', fonteDeTrafego);
    if (tipoDeFunil && tipoDeFunil !== 'all') params.append('tipo_de_funil', tipoDeFunil);

    const response = await fetch(`${SUPABASE_URL}/functions/v1/get-visit-locations?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro HTTP ao buscar localizações: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.locations.map((loc: any) => ({
      region_name: loc.region_name,
      count: loc.count
    })) || [];
  } catch (error) {
    console.error('Erro ao obter localizações de visitas:', error);
    throw error;
  }
};

export const getSalesByProduct = async (dateFilter: string, customDate?: string): Promise<Array<{ produto: string; count: number }>> => {
  try {
    const authToken = await getAuthToken();
    const params = new URLSearchParams();
    params.append('date_filter', dateFilter);
    if (customDate) params.append('custom_date', customDate);

    const response = await fetch(`${SUPABASE_URL}/functions/v1/get-sales-by-product?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro HTTP ao buscar vendas por produto: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.sales_by_product || [];
  } catch (error) {
    console.error('Erro ao obter vendas por produto:', error);
    throw error;
  }
};

export const getLeadsWithTags = async (
  dateFilter: string,
  customDate?: string,
  produto?: string,
  tagSourceFilter?: string,
  fonteDeTrafego?: string,
  tipoDeFunil?: string
): Promise<LeadWithTags[]> => {
  const params = new URLSearchParams();
  params.append('date_filter', dateFilter);
  if (customDate) params.append('custom_date', customDate);
  if (produto && produto !== 'all') params.append('produto', produto);
  if (tagSourceFilter && tagSourceFilter !== 'all') params.append('tag_source', tagSourceFilter);
  if (fonteDeTrafego && fonteDeTrafego !== 'all') params.append('fonte_de_trafego', fonteDeTrafego);
  if (tipoDeFunil && tipoDeFunil !== 'all') params.append('tipo_de_funil', tipoDeFunil);

  console.log('[API Client] getLeadsWithTags - Parâmetros enviados:', {
    dateFilter,
    customDate,
    produto,
    tagSourceFilter,
    fonteDeTrafego,
    tipoDeFunil
  });
  console.log('[API Client] URL construída:', `${SUPABASE_URL}/functions/v1/get-leads-with-tags?${params.toString()}`);

  const response = await fetch(`${SUPABASE_URL}/functions/v1/get-leads-with-tags?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  console.log('[API Client] Resposta da API:', data);
  return data.leads || [];
};

export const getSingleLead = async (leadId: string): Promise<LeadWithTags | null> => {
  try {
    const authToken = await getAuthToken();

    const response = await fetch(`${SUPABASE_URL}/functions/v1/get-single-lead`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ lead_id: leadId })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro HTTP ao buscar lead: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.lead || null;
  } catch (error) {
    console.error('Erro ao obter lead individual:', error);
    throw error;
  }
};

export const clearAllMetrics = async (): Promise<void> => {
  const authToken = await getAuthToken();
  const response = await fetch(`${SUPABASE_URL}/functions/v1/clear-metrics`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
      'apikey': SUPABASE_ANON_KEY,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
};

export const getAbandonmentData = async (
  dateFilter: string,
  customDate?: string,
  produto?: string,
  fonteDeTrafego?: string,
  tipoDeFunil?: string
): Promise<AbandonmentData[]> => {
  const params = new URLSearchParams();
  params.append('dateFilter', dateFilter);

  if (customDate) {
    params.append('customDate', customDate);
  }
  if (produto && produto !== 'all') {
    params.append('produto', produto);
  }
  if (fonteDeTrafego && fonteDeTrafego !== 'all') {
    params.append('fonteDeTrafego', fonteDeTrafego);
  }
  if (tipoDeFunil && tipoDeFunil !== 'all') {
    params.append('tipoDeFunil', tipoDeFunil);
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/get-abandonment?${params.toString()}`, {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// --- Product Management ---

export const recordAbandonment = async (
  step: string,
  reason: string = 'fechamento_janela',
  produto: string,
  fonteDeTrafego: string,
  tipoDeFunil: string,
  leadEmail?: string,
  instagramId?: string | null
): Promise<void> => {
  try {
    const sessionId = getSessionId();

    if (!produto || !tipoDeFunil) {
      console.error('Produto ou Tipo de Funil ausente para recordAbandonment.');
      return;
    }

    // Tentar pegar fingerprint do cache se existir
    const cachedFingerprint = safeSessionStorage.get('quiz_fingerprint');

    // Preparar payload para a RPC function (track_abandonment_v2)
    const rpcPayload = {
      p_session_id: sessionId,
      p_reason: reason,
      p_step: step,
      p_produto: produto,
      p_fonte_de_trafego: fonteDeTrafego,
      p_tipo_de_funil: tipoDeFunil,
      p_email: leadEmail || null,
      p_traffic_id: instagramId || null,
      p_fingerprint_hash: cachedFingerprint || null,
      p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      p_ip: null // IP será extraído headers se possível, ou ficará null
    };

    // URL para a RPC function
    const url = `${SUPABASE_URL}/rest/v1/rpc/track_abandonment_v2`;

    // Usar fetch com keepalive para garantir envio no fechamento da aba
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Profile': 'tbz', // Importante: aponta para o schema tbz onde a função está
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(rpcPayload),
      keepalive: true
    });

    console.log('[recordAbandonment] Dados de abandono enviados via RPC (track_abandonment_v2).', rpcPayload);

  } catch (error) {
    console.error('Erro ao registrar abandono:', error);
  }
};

// --- Product Management ---

export const getProducts = async (): Promise<Product[]> => {
  try {
    const { data, error } = await supabase
      .schema('tbz')
      .from('produtos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    throw error;
  }
};

export const createProduct = async (name: string, slug: string): Promise<Product> => {
  try {
    const { data, error } = await supabase
      .schema('tbz')
      .from('produtos')
      .insert([{ name, slug, active: true }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    throw error;
  }
};

export const updateProduct = async (id: string, updates: Partial<Product>): Promise<Product> => {
  try {
    const { data, error } = await supabase
      .schema('tbz')
      .from('produtos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    throw error;
  }
};

export const deleteProduct = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .schema('tbz')
      .from('produtos')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Erro ao deletar produto:', error);
    throw error;
  }
};