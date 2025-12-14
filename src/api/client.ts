import { EventType, DashboardMetrics, Visit, Sale, LeadTagAssignment, LeadWithTags, AbandonmentData, Product } from '../types';
import { supabase } from '../integrations/supabase/client';
import { collectBrowserIdentity, computeFingerprint, BrowserIdentity } from '../utils/browserIdentity';
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

// Cache de identidade e fingerprint para a sessão
let identityCache: {
  identity: BrowserIdentity;
  fingerprint: string;
} | null = null;

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

const getIdentityAndFingerprint = async () => {
  if (identityCache) return identityCache;

  // Tentar recuperar do sessionStorage
  const cachedFingerprint = safeSessionStorage.get('quiz_fingerprint');
  const cachedIdentityRaw = safeSessionStorage.get('browser_identity');

  if (cachedFingerprint && cachedIdentityRaw) {
    try {
      const parsedIdentity = JSON.parse(cachedIdentityRaw);
      identityCache = { identity: parsedIdentity, fingerprint: cachedFingerprint };
      return identityCache;
    } catch { }
  }

  // Coleta nova (inclui hardware signals + network location com retry/failover)
  const identity = await collectBrowserIdentity();
  const fingerprint = await computeFingerprint(identity);

  // Cache
  safeSessionStorage.set('browser_identity', JSON.stringify(identity));
  safeSessionStorage.set('quiz_fingerprint', fingerprint);

  identityCache = { identity, fingerprint };
  return identityCache;
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

    const urlParams = new URLSearchParams(window.location.search);
    const utm_source = urlParams.get('utm_source') || null;
    const utm_medium = urlParams.get('utm_medium') || null;

    console.log(`[client.ts] 🎯 UTMs da URL: utm_source=${utm_source}, utm_medium=${utm_medium}`);

    // Obter identidade robusta (inclui localização)
    const { identity, fingerprint } = await getIdentityAndFingerprint();
    const location = identity.geo; // Location agora vem do identity

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

    // Traduzir nível de urgência para português
    const translateUrgency = (level: string | null): string | null => {
      if (!level) return null;
      const map: Record<string, string> = {
        'emergency': 'Emergencial',
        'critical': 'Crítica',
        'high': 'Alta'
      };
      return map[level.toLowerCase()] || level;
    };

    const urgencyLevel = payload?.diagnosticResult?.urgencyLevel || payload?.diagnosisLevel || null;
    const translatedUrgency = translateUrgency(urgencyLevel);

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
      p_ip: identity.ipv4 || null, // IP agora vem do provider de identity
      p_url: isBrowser ? window.location.href : null,
      p_referrer: isBrowser ? document.referrer || null : null,
      p_email: payload?.email || null,
      p_name: payload?.name || null,
      p_phone: payload?.phone || null,
      p_urgency_level: translatedUrgency,
      p_country_code: location?.country || null,
      p_region_name: location?.region || null,
      p_city: location?.city || null
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
    const authToken = await getAuthToken();

    const rpcParams = {
      p_date_filter: dateFilter,
      p_custom_date: customDate || '',
      p_produto: produto || 'all',
      p_fonte_de_trafego: fonteDeTrafego || 'all',
      p_tipo_de_funil: tipoDeFunil || 'all'
    };

    console.log('[API Client] getMetrics - Chamando RPC get_dashboard_metrics:', rpcParams);

    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_dashboard_metrics`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Content-Profile': 'tbz',
      },
      body: JSON.stringify(rpcParams)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro HTTP ao buscar métricas: ${response.status} - ${errorText}`);
    }

    const metrics = await response.json();
    console.log('[API Client] getMetrics - Resposta do RPC:', metrics);

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

    const rpcParams = {
      p_date_filter: dateFilter,
      p_custom_date: customDate || null,
      p_produto: produto || 'all',
      p_fonte_de_trafego: fonteDeTrafego || 'all',
      p_tipo_de_funil: tipoDeFunil || 'all'
    };

    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_visits_data`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Content-Profile': 'tbz',
      },
      body: JSON.stringify(rpcParams)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro ao buscar visitas:', errorText);
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const visits = await response.json();

    // Mapear retorno do RPC para interface Visit se necessário (mas os nomes batem)
    return visits.map((v: any) => ({
      id: v.id,
      ip_address: v.ip_address,
      country_code: v.country_code,
      country_name: v.country_code === 'BR' ? 'Brasil' : v.country_code, // Simplificação, idealmente viria do banco
      region_name: v.region_name,
      city: v.city,
      produto: v.produto,
      fonte_de_trafego: v.fonte_de_trafego,
      tipo_de_funil: v.tipo_de_funil,
      created_at: v.created_at
    }));

  } catch (error: unknown) {
    console.error("Erro ao carregar visitas:", error);
    throw error;
  }
};

export const getSales = async (dateFilter: string, customDate?: string, produto?: string, fonteDeTrafego?: string): Promise<Sale[]> => {
  try {
    const authToken = await getAuthToken();

    const rpcParams = {
      p_date_filter: dateFilter,
      p_custom_date: customDate || '',
      p_produto: produto || 'all',
      p_fonte_de_trafego: fonteDeTrafego || 'all'
    };

    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_sales`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Content-Profile': 'tbz',
      },
      body: JSON.stringify(rpcParams)
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const sales = await response.json();
    return sales || [];

  } catch (error: unknown) {
    console.error("Erro ao carregar vendas:", error);
    throw error;
  }
};

export const getVisitLocations = async (dateFilter: string, customDate?: string, produto?: string, fonteDeTrafego?: string, tipoDeFunil?: string): Promise<Array<{ region_name: string; count: number }>> => {
  try {
    const authToken = await getAuthToken();

    const rpcParams = {
      p_date_filter: dateFilter,
      p_custom_date: customDate || '',
      p_produto: produto || 'all',
      p_fonte_de_trafego: fonteDeTrafego || 'all',
      p_tipo_de_funil: tipoDeFunil || 'all'
    };

    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_visit_locations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Content-Profile': 'tbz',
      },
      body: JSON.stringify(rpcParams)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro HTTP ao buscar localizações: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.map((loc: any) => ({
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

    const rpcParams = {
      p_date_filter: dateFilter,
      p_custom_date: customDate || ''
    };

    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_sales_by_product`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Content-Profile': 'tbz',
      },
      body: JSON.stringify(rpcParams)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro HTTP ao buscar vendas por produto: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data || [];
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
  const authToken = await getAuthToken();

  const rpcParams = {
    p_date_filter: dateFilter,
    p_custom_date: customDate || '',
    p_produto: produto || 'all',
    p_tag_source: tagSourceFilter || 'all',
    p_fonte_de_trafego: fonteDeTrafego || 'all',
    p_tipo_de_funil: tipoDeFunil || 'all'
  };

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_leads_data`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'Content-Profile': 'tbz',
    },
    body: JSON.stringify(rpcParams)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Erro ao buscar leads:', errorText);
    throw new Error(`Erro HTTP: ${response.status}`);
  }

  const leads = await response.json();

  // Mapear retorno do RPC para interface LeadWithTags
  return leads.map((l: any) => ({
    id: l.id,
    name: l.name,
    email: l.email,
    phone: l.phone,
    urgency_level: l.urgency_level,
    created_at: l.created_at,
    product_name: l.product_name,
    traffic_id: l.traffic_id,
    fonte_de_trafego: l.fonte_de_trafego,
    tipo_de_funil: l.tipo_de_funil,
    iniciar_checkout: l.checkout_initiated,
    tags: l.tags || []
  }));
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

  // Usar RPC para limpar métricas de forma segura e ordenada
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/clear_all_metrics`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
      'apikey': SUPABASE_ANON_KEY,
      'Content-Profile': 'tbz', // Importante: aponta para o schema tbz
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
  const authToken = await getAuthToken();

  const rpcParams = {
    p_date_filter: dateFilter,
    p_custom_date: customDate || '',
    p_produto: produto || 'all',
    p_fonte_de_trafego: fonteDeTrafego || 'all',
    p_tipo_de_funil: tipoDeFunil || 'all'
  };

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_abandonment_data`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`, // Usa token se disponível, ou anon se não
      'apikey': SUPABASE_ANON_KEY,
      'Content-Profile': 'tbz',
    },
    body: JSON.stringify(rpcParams)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Erro ao buscar dados de abandono:', errorText);
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
    const { identity, fingerprint } = await getIdentityAndFingerprint();
    const location = identity.geo;

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
      p_fingerprint_hash: fingerprint || null,
      p_user_agent: identity?.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : null),
      p_ip: identity.ipv4 || null,
      p_country_code: location?.country || null,
      p_region_name: location?.region || null,
      p_city: location?.city || null
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

export const cleanDataByIp = async (ip: string) => {
  const authToken = await getAuthToken();

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/clean_data_by_ip`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
      'apikey': SUPABASE_ANON_KEY,
      'Content-Profile': 'tbz'
    },
    body: JSON.stringify({ p_ip_address: ip })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Erro ao limpar dados por IP:', errorText);
    throw new Error(`Erro HTTP: ${response.status} - ${errorText}`);
  }
};