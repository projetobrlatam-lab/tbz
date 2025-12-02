import { useState, useEffect, useCallback } from 'react';
import { generateSessionId } from '../utils/validation';
import { useParams } from 'react-router-dom';

const SESSION_TIMEOUT = 3600000; // 1 hora em ms

export const useSession = () => {
  const params = useParams();
  const productSlug = params['*'] || params.slug || params.productSlug;
  
  // Extrair produto do pathname se não estiver nos params
  const pathname = window.location.pathname;
  const pathSegments = pathname.split('/').filter(segment => segment.length > 0);
  const productFromPath = pathSegments[0] || null;
  
  // Prioridade: 1. params > 2. pathname > 3. fallback 'tbz'
  const currentProduct = productSlug || productFromPath || 'tbz';

  const [sessionId, setSessionId] = useState<string>('');
  const [produto, setProduto] = useState<string>(currentProduct);
  const [fonteDeTrafego, setFonteDeTrafego] = useState<string>(''); // Inicializa vazio
  const [tipoDeFunil, setTipoDeFunil] = useState<string>('quiz');
  const [instagramId, setInstagramId] = useState<string | null>(null); 
  const [isSessionReady, setIsSessionReady] = useState(false);

  const initializeSession = useCallback(() => {
    setProduto(currentProduct);
    
    let existingSessionId = sessionStorage.getItem('quiz_session_id');
    const sessionTimestamp = sessionStorage.getItem('quiz_session_timestamp');
    
    const isSessionExpired = sessionTimestamp && (Date.now() - parseInt(sessionTimestamp) > SESSION_TIMEOUT);
    const isNewSession = !existingSessionId || !sessionTimestamp;

    // 1. Gerar ou validar Session ID
    if (isNewSession || isSessionExpired) {
      existingSessionId = generateSessionId();
      sessionStorage.setItem('quiz_session_id', existingSessionId);
      sessionStorage.setItem('quiz_session_timestamp', Date.now().toString());
      
      // Só limpamos UTMs se a sessão expirou por timeout, não em reloads
      if (isSessionExpired) {
        console.log('🧹 [DEBUG useSession] Sessão expirada - limpando UTMs antigos');
        sessionStorage.removeItem('utm_source');
        sessionStorage.removeItem('utm_medium');
      } else {
        console.log('🔄 [DEBUG useSession] Nova sessão - mantendo UTMs existentes');
      }
    }
    
    if (existingSessionId) {
      setSessionId(existingSessionId);
    } else {
      setSessionId(generateSessionId());
    }

    const urlParams = new URLSearchParams(window.location.search);
    
    // Lendo e limpando strings vazias (se for string vazia, retorna null)
    const utmSourceFromUrl = urlParams.get('utm_source')?.trim() || null;
    const utmMediumFromUrl = urlParams.get('utm_medium')?.trim() || null;

    console.log(`🔍 [DEBUG useSession] URL atual: ${window.location.href}`);
    console.log(`🔍 [DEBUG useSession] URL Search: ${window.location.search}`);
    console.log(`🔍 [DEBUG useSession] UTM Source da URL: "${utmSourceFromUrl}"`);
    console.log(`🔍 [DEBUG useSession] UTM Medium da URL: "${utmMediumFromUrl}"`);
    console.log(`🔍 [DEBUG useSession] Session Storage utm_source: "${sessionStorage.getItem('utm_source')}"`);
    console.log(`🔍 [DEBUG useSession] Session Storage utm_medium: "${sessionStorage.getItem('utm_medium')}"`);

    // 2. Determinar valores finais e persistir
    let finalFonteDeTrafego: string;
    let finalInstagramId: string | null;

    // Lógica para Fonte de Tráfego (utm_source)
    // Prioridade: 1. URL > 2. Session Storage
    if (utmSourceFromUrl) {
      finalFonteDeTrafego = utmSourceFromUrl;
      sessionStorage.setItem('utm_source', finalFonteDeTrafego);
      console.log(`✅ [DEBUG useSession] Fonte de tráfego definida pela URL: "${finalFonteDeTrafego}"`);
    } else if (sessionStorage.getItem('utm_source')) {
      finalFonteDeTrafego = sessionStorage.getItem('utm_source')!.trim();
      console.log(`📦 [DEBUG useSession] Fonte de tráfego do Session Storage: "${finalFonteDeTrafego}"`);
    } else {
      finalFonteDeTrafego = '';
      console.log(`🔄 [DEBUG useSession] Fonte de tráfego não definida`);
    }

    // Lógica para Instagram ID (utm_medium)
    // Prioridade: 1. URL > 2. Session Storage > 3. null
    if (utmMediumFromUrl) {
      finalInstagramId = utmMediumFromUrl;
      sessionStorage.setItem('utm_medium', finalInstagramId);
      console.log(`✅ [DEBUG useSession] Instagram ID definido pela URL: "${finalInstagramId}"`);
    } else if (sessionStorage.getItem('utm_medium')) {
      finalInstagramId = sessionStorage.getItem('utm_medium')!.trim();
      console.log(`📦 [DEBUG useSession] Instagram ID do Session Storage: "${finalInstagramId}"`);
    } else {
      finalInstagramId = null;
      console.log(`🔄 [DEBUG useSession] Instagram ID fallback: null`);
    }

    console.log(`[useSession] Final Fonte de Trafego: ${finalFonteDeTrafego}`);
    console.log(`[useSession] Final Instagram ID: ${finalInstagramId}`);

    setFonteDeTrafego(finalFonteDeTrafego);
    setInstagramId(finalInstagramId);
    
    // O tipo de funil é fixo como 'quiz' para esta aplicação
    setTipoDeFunil('quiz');
    setIsSessionReady(true);

  }, [currentProduct]);

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  const updateSessionActivity = useCallback(() => {
    sessionStorage.setItem('quiz_session_timestamp', Date.now().toString());
  }, []);

  return {
    sessionId,
    produto,
    fonteDeTrafego, // string
    tipoDeFunil,
    instagramId, // string | null
    updateSessionActivity,
    isSessionReady
  };
};