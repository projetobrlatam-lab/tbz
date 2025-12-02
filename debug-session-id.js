// Script para debugar session_id do frontend
const SUPABASE_URL = 'https://ynxsksgttbzxooixgqzf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHNrc2d0dGJ6eG9vaXhncXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTU4ODAsImV4cCI6MjA3NDM5MTg4MH0.PTAaE9WV6gjpDwlQuRY_HZjI-k5BCZ5yoyIjSSiSfIg';

// Simula a função generateSessionId do frontend
const generateSessionId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Função para verificar se session_id existe na tabela
const checkSessionExists = async (sessionId) => {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/oreino360-sessoes?session_id=eq.${sessionId}`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    return data.length > 0;
  } catch (error) {
    console.error('Erro ao verificar session:', error);
    return false;
  }
};

// Função para testar abandonment com session_id inexistente
const testAbandonmentWithNewSessionId = async () => {
  const newSessionId = generateSessionId();
  console.log('🔍 Testando com novo session_id:', newSessionId);
  
  // Verifica se existe na tabela de sessões
  const exists = await checkSessionExists(newSessionId);
  console.log('📊 Session existe na tabela oreino360-sessoes:', exists);
  
  // Testa o track-abandonment
  const payload = {
    session_id: newSessionId,
    reason: 'test_new_session_id',
    step_where_abandoned: 'step_1',
    produto: 'Quiz TBZ',
    fonte_de_trafego: 'direct',
    tipo_de_funil: 'quiz',
    email: null,
    traffic_id: null
  };

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/track-abandonment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const result = await response.text();
    console.log('📤 Status da resposta:', response.status);
    console.log('📥 Resposta:', result);
    
    return { sessionId: newSessionId, status: response.status, response: result };
  } catch (error) {
    console.error('❌ Erro no track-abandonment:', error);
    return { sessionId: newSessionId, error: error.message };
  }
};

// Executa o teste
testAbandonmentWithNewSessionId().then(result => {
  console.log('🎯 Resultado final:', result);
});