// Script para testar track-abandonment com session_id null
const SUPABASE_URL = 'https://ynxsksgttbzxooixgqzf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHNrc2d0dGJ6eG9vaXhncXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTU4ODAsImV4cCI6MjA3NDM5MTg4MH0.PTAaE9WV6gjpDwlQuRY_HZjI-k5BCZ5yoyIjSSiSfIg';

// Função para testar abandonment com session_id null
const testAbandonmentWithNullSessionId = async () => {
  console.log('🔍 Testando com session_id: null');
  
  // Testa o track-abandonment com session_id null
  const payload = {
    session_id: null,
    reason: 'test_null_session_id',
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
    
    return { status: response.status, response: result };
  } catch (error) {
    console.error('❌ Erro no track-abandonment:', error);
    return { error: error.message };
  }
};

// Executa o teste
testAbandonmentWithNullSessionId().then(result => {
  console.log('🎯 Resultado final:', result);
});