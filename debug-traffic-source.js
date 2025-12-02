const SUPABASE_URL = 'https://ynxsksgttbzxooixgqzf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHNrc2d0dGJ6eG9vaXhncXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTU4ODAsImV4cCI6MjA3NDM5MTg4MH0.PTAaE9WV6gjpDwlQuRY_HZjI-k5BCZ5yoyIjSSiSfIg';

async function testTrafficSource() {
  console.log('🔍 Testando diferentes cenários de fonte de tráfego...\n');

  // Teste 1: Payload com utm_source definido
  console.log('=== TESTE 1: Com utm_source ===');
  const payload1 = {
    session_id: 'test-session-' + Date.now(),
    reason: 'fechamento_janela',
    step_where_abandoned: 'pergunta_1',
    produto: 'Treino Bíceps Zona',
    fonte_de_trafego: '', // Vazio
    tipo_de_funil: 'quiz',
    utm_source: 'instagram', // UTM definido
    utm_medium: 'story'
  };

  console.log('Payload enviado:', JSON.stringify(payload1, null, 2));

  try {
    const response1 = await fetch(`${SUPABASE_URL}/functions/v1/track-abandonment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify(payload1)
    });

    const result1 = await response1.text();
    console.log(`Status: ${response1.status}`);
    console.log(`Resposta: ${result1}\n`);
  } catch (error) {
    console.error('Erro no teste 1:', error);
  }

  // Teste 2: Payload sem UTMs, apenas fonte_de_trafego
  console.log('=== TESTE 2: Sem UTMs, apenas fonte_de_trafego ===');
  const payload2 = {
    session_id: 'test-session-' + Date.now(),
    reason: 'fechamento_janela',
    step_where_abandoned: 'pergunta_1',
    produto: 'Treino Bíceps Zona',
    fonte_de_trafego: 'facebook', // Definido
    tipo_de_funil: 'quiz',
    traffic_id: 'fb123'
  };

  console.log('Payload enviado:', JSON.stringify(payload2, null, 2));

  try {
    const response2 = await fetch(`${SUPABASE_URL}/functions/v1/track-abandonment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify(payload2)
    });

    const result2 = await response2.text();
    console.log(`Status: ${response2.status}`);
    console.log(`Resposta: ${result2}\n`);
  } catch (error) {
    console.error('Erro no teste 2:', error);
  }

  // Teste 3: Payload vazio (como o frontend pode estar enviando)
  console.log('=== TESTE 3: Fonte de tráfego vazia ===');
  const payload3 = {
    session_id: 'test-session-' + Date.now(),
    reason: 'fechamento_janela',
    step_where_abandoned: 'pergunta_1',
    produto: 'Treino Bíceps Zona',
    fonte_de_trafego: '', // Vazio
    tipo_de_funil: 'quiz'
  };

  console.log('Payload enviado:', JSON.stringify(payload3, null, 2));

  try {
    const response3 = await fetch(`${SUPABASE_URL}/functions/v1/track-abandonment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify(payload3)
    });

    const result3 = await response3.text();
    console.log(`Status: ${response3.status}`);
    console.log(`Resposta: ${result3}\n`);
  } catch (error) {
    console.error('Erro no teste 3:', error);
  }
}

testTrafficSource().catch(console.error);