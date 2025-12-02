/**
 * Utilitários compartilhados entre todas as edge functions
 * Centraliza funções comuns para evitar duplicação de código
 */

// ============================================================================
// FINGERPRINT UTILITIES
// ============================================================================

/**
 * Computa hash SHA-256 determinístico para fingerprinting
 * Usado para identificar usuários únicos de forma consistente
 */
export async function computeFingerprintHash(parts: string[]): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(parts.filter(Boolean).join('|'));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Valida se uma string é um UUID válido
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Normaliza Accept-Language header
 */
export function normalizeAcceptLanguage(acceptLanguage: string): string {
  return (acceptLanguage || '').split(',')[0].split(';')[0].trim().toLowerCase();
}

// ============================================================================
// NETWORK UTILITIES
// ============================================================================

/**
 * Extrai IP do cliente de forma consistente
 */
export function getClientIP(req: Request): string {
  return req.headers.get('cf-connecting-ip') || 
         req.headers.get('x-real-ip') || 
         req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
         'unknown';
}

/**
 * Normaliza IP para fingerprinting consistente
 */
export function normalizeIP(ip: string): string {
  if (!ip || ip === 'unknown') return 'unknown';
  
  // Remove porta se presente
  const cleanIP = ip.split(':')[0];
  
  // Para IPv4, mantém apenas os primeiros 3 octetos para privacidade
  if (cleanIP.includes('.')) {
    const parts = cleanIP.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }
  }
  
  // Para IPv6, mantém apenas os primeiros 4 grupos
  if (cleanIP.includes('::')) {
    const parts = cleanIP.split('::');
    return `${parts[0]}::`;
  }
  
  return cleanIP;
}

// ============================================================================
// DATA STANDARDIZATION
// ============================================================================

/**
 * Padroniza tipo_de_funil para sempre usar minúsculo
 * Evita inconsistências entre "Quiz" e "quiz"
 */
export function standardizeTipoDeFunil(tipoDeFunil: string | null): string {
  if (!tipoDeFunil || typeof tipoDeFunil !== 'string') {
    return 'quiz';
  }
  return tipoDeFunil.toLowerCase().trim() || 'quiz';
}

/**
 * Padroniza produto para sempre usar minúsculo
 */
export function standardizeProduto(produto: string | null): string {
  if (!produto || typeof produto !== 'string') {
    return 'tbz';
  }
  return produto.toLowerCase().trim() || 'tbz';
}

// ============================================================================
// CORS UTILITIES
// ============================================================================

/**
 * Headers CORS padrão para todas as edge functions
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// ============================================================================
// DEDUPLICATION UTILITIES
// ============================================================================

/**
 * Verifica se um identificador já existe nas últimas 24 horas
 * Usado para deduplicação global de visitas
 */
export async function checkGlobalDeduplication(
  supabaseAdmin: any,
  fingerprintHash: string
): Promise<boolean> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const { data: existingIdentifier, error } = await supabaseAdmin
    .schema('public')
    .from('oreino360-identificador')
    .select('created_at')
    .eq('fingerprint_hash', fingerprintHash)
    .maybeSingle();

  if (error && (error as any).code !== 'PGRST116') {
    console.error(`[dedup] Error checking existing identifier: ${error?.message}`);
    return false; // Em caso de erro, não bloqueia
  }

  if (existingIdentifier && new Date(existingIdentifier.created_at).getTime() > new Date(twentyFourHoursAgo).getTime()) {
    console.log(`[dedup] 🔁 Global Dedup: Visit suppressed for fingerprint '${fingerprintHash}' due to activity within 24 hours.`);
    return true; // Deve ser suprimido
  }

  return false; // Não deve ser suprimido
}

/**
 * Verifica deduplicação de eventos específicos na última hora
 */
export async function checkEventDeduplication(
  supabaseAdmin: any,
  fingerprintHash: string,
  eventType: string
): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  const { data: existingEvents, error } = await supabaseAdmin
    .schema('public')
    .from('oreino360-eventos')
    .select('id')
    .eq('event_type', eventType)
    .gte('created_at', oneHourAgo)
    .contains('event_data', { fingerprint_hash: fingerprintHash })
    .limit(1);

  if (error) {
    console.warn(`[dedup] Falha ao checar dedup de evento '${eventType}':`, error.message);
    return false; // Em caso de erro, não bloqueia
  }

  if (Array.isArray(existingEvents) && existingEvents.length > 0) {
    console.log(`[dedup] 🔁 Event Dedup: Evento '${eventType}' suprimido nas últimas 1h para fingerprint ${fingerprintHash}`);
    return true; // Deve ser suprimido
  }

  return false; // Não deve ser suprimido
}