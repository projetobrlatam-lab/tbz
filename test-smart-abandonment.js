/**
 * Teste da lógica inteligente de abandono
 * Testa cenários de:
 * 1. Primeiro abandono
 * 2. Segundo abandono (deve atualizar, não criar novo)
 * 3. Usuário vira lead (deve remover abandono)
 * 4. Tentativa de abandono após virar lead (deve ser ignorada)
 */

const SUPABASE_URL = 'https://ynxsksgttbzxooixgqzf.supabase.co';
const TRACK_ABANDONMENT_URL = `${SUPABASE_URL}/functions/v1/track-abandonment`;
const TRACK_MAIN_URL = `${SUPABASE_URL}/functions/v1/track-main`;

// Dados de teste consistentes
const testData = {
  session_id: `test-session-${Date.now()}`,
  traffic_id: `test-traffic-${Date.now()}`,
  email: `test-${Date.now()}@example.com`,
  user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  accept_language: 'pt-BR,pt;q=0.9,en;q=0.8',
  ip_address: '192.168.1.100',
  utm_source: 'test',
  utm_medium: 'test',
  utm_campaign: 'test',
  produto: 'tbz',
  tipo_de_funil: 'quiz'
};

async function makeRequest(url, payload) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHNrc2d0dGJ6eG9vaXhncXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1NTI5NzQsImV4cCI6MjA1MDEyODk3NH0.Ej6Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    return {
      status: response.status,
      data: result
    };
  } catch (error) {
    return {
      status: 'ERROR',
      error: error.message
    };
  }
}

async function testSmartAbandonment() {
  console.log('🧪 === TESTE DA LÓGICA INTELIGENTE DE ABANDONO ===\n');
  
  // Cenário 1: Primeiro abandono
  console.log('📍 Cenário 1: Primeiro abandono na pergunta 3');
  const abandonment1 = await makeRequest(TRACK_ABANDONMENT_URL, {
    ...testData,
    event_type: 'quiz_abandoned',
    step_where_abandoned: 'pergunta_3',
    reason: 'fechamento_janela'
  });
  
  console.log(`Status: ${abandonment1.status}`);
  console.log(`Response:`, abandonment1.data);
  console.log('');
  
  // Aguardar um pouco
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Cenário 2: Segundo abandono (deve atualizar)
  console.log('📍 Cenário 2: Segundo abandono na pergunta 5 (deve atualizar registro existente)');
  const abandonment2 = await makeRequest(TRACK_ABANDONMENT_URL, {
    ...testData,
    event_type: 'quiz_abandoned',
    step_where_abandoned: 'pergunta_5',
    reason: 'timeout'
  });
  
  console.log(`Status: ${abandonment2.status}`);
  console.log(`Response:`, abandonment2.data);
  console.log('');
  
  // Aguardar um pouco
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Cenário 3: Usuário completa quiz e vira lead
  console.log('📍 Cenário 3: Usuário completa quiz e vira lead (deve remover abandono)');
  const leadSubmit = await makeRequest(TRACK_MAIN_URL, {
    ...testData,
    event_type: 'lead_submit',
    nome: 'Teste Smart Abandonment',
    telefone: '11999999999',
    is_valid_lead: true
  });
  
  console.log(`Status: ${leadSubmit.status}`);
  console.log(`Response:`, leadSubmit.data);
  console.log('');
  
  // Aguardar um pouco
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Cenário 4: Tentativa de abandono após virar lead (deve ser ignorada)
  console.log('📍 Cenário 4: Tentativa de abandono após virar lead (deve ser ignorada)');
  const abandonment3 = await makeRequest(TRACK_ABANDONMENT_URL, {
    ...testData,
    event_type: 'quiz_abandoned',
    step_where_abandoned: 'pergunta_2',
    reason: 'fechamento_janela'
  });
  
  console.log(`Status: ${abandonment3.status}`);
  console.log(`Response:`, abandonment3.data);
  console.log('');
  
  console.log('✅ Teste concluído! Verifique os logs das funções para detalhes.');
  console.log(`📊 Dados de teste usados:`);
  console.log(`   Session ID: ${testData.session_id}`);
  console.log(`   Traffic ID: ${testData.traffic_id}`);
  console.log(`   Email: ${testData.email}`);
}

// Executar teste
testSmartAbandonment().catch(console.error);