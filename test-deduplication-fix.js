// Teste para verificar se a correção de deduplicação está funcionando
const SUPABASE_URL = 'https://ynxsksgttbzxooixgqzf.supabase.co';

async function testTrackMainWithFingerprint() {
  console.log('🧪 Testando track-main com fingerprint_hash...');
  
  const payload = {
    event_type: 'quiz_start',
    session_id: `test-session-${Date.now()}`,
    produto: 'tbz',
    tipo_de_funil: 'Quiz',
    utm_source: 'test',
    event_data: {
      step: 1,
      question: 'Qual é o seu objetivo principal?',
      timestamp: new Date().toISOString()
    }
  };

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/track-main`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'X-Forwarded-For': '192.168.1.100'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.text();
    console.log('✅ Resposta track-main:', response.status, result);
    
    // Aguardar um pouco e tentar novamente para testar deduplicação
    console.log('⏳ Aguardando 2 segundos para testar deduplicação...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const response2 = await fetch(`${SUPABASE_URL}/functions/v1/track-main`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'X-Forwarded-For': '192.168.1.100'
      },
      body: JSON.stringify(payload)
    });

    const result2 = await response2.text();
    console.log('🔁 Resposta deduplicação track-main:', response2.status, result2);
    
  } catch (error) {
    console.error('❌ Erro no teste track-main:', error);
  }
}

async function testTrackAbandonmentWithFingerprint() {
  console.log('🧪 Testando track-abandonment com fingerprint_hash...');
  
  const payload = {
    session_id: `test-session-${Date.now()}`,
    reason: 'fechamento_janela',
    step_where_abandoned: 'step_2',
    produto: 'tbz',
    tipo_de_funil: 'Quiz',
    utm_source: 'test'
  };

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/track-abandonment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'X-Forwarded-For': '192.168.1.100'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.text();
    console.log('✅ Resposta track-abandonment:', response.status, result);
    
    // Aguardar um pouco e tentar novamente para testar deduplicação
    console.log('⏳ Aguardando 2 segundos para testar deduplicação...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const response2 = await fetch(`${SUPABASE_URL}/functions/v1/track-abandonment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'X-Forwarded-For': '192.168.1.100'
      },
      body: JSON.stringify(payload)
    });

    const result2 = await response2.text();
    console.log('🔁 Resposta deduplicação track-abandonment:', response2.status, result2);
    
  } catch (error) {
    console.error('❌ Erro no teste track-abandonment:', error);
  }
}

async function runTests() {
  console.log('🚀 Iniciando testes de deduplicação...\n');
  
  await testTrackMainWithFingerprint();
  console.log('\n' + '='.repeat(50) + '\n');
  await testTrackAbandonmentWithFingerprint();
  
  console.log('\n✨ Testes concluídos!');
}

runTests();