import fetch from 'node-fetch';

const SUPABASE_URL = 'https://ynxsksgttbzxooixgqzf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHNrc2d0dGJ6eG9vaXhncXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTU4ODAsImV4cCI6MjA3NDM5MTg4MH0.PTAaE9WV6gjpDwlQuRY_HZjI-k5BCZ5yoyIjSSiSfIg';

async function testEvent(eventType, eventData = {}) {
  const timestamp = Date.now();
  const testData = {
    session_id: `session-${timestamp}`,
    event_type: eventType,
    event_data: JSON.stringify(eventData),
    produto: 'tbz',
    tipo_de_funil: 'Quiz',
    traffic_id: `traffic-${timestamp}`,
    fonte_de_trafego: 'test',
    utm_source: 'test',
    utm_medium: `traffic-${timestamp}`
  };

  console.log(`\n=== Testando evento: ${eventType} ===`);
  console.log('Dados enviados:', JSON.stringify(testData, null, 2));

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/track-main`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    console.log(`Status: ${response.status}`);
    console.log('Resposta:', JSON.stringify(result, null, 2));
    
    return { success: response.ok, status: response.status, data: result };
  } catch (error) {
    console.error(`Erro ao testar ${eventType}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('=== TESTE DE MÚLTIPLOS TIPOS DE EVENTOS ===\n');
  
  const eventTypes = [
    'visit',
    'page_view', 
    'button_click',
    'form_start',
    'quiz_step',
    'quiz_complete',
    'lead_submit'
  ];

  for (const eventType of eventTypes) {
    await testEvent(eventType, { step: 1, action: 'test' });
    // Pequena pausa entre os testes
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n=== TESTES CONCLUÍDOS ===');
}

runTests().catch(console.error);