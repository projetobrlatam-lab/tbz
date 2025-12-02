// Teste detalhado para debug do processamento de leads
const SUPABASE_URL = 'https://ynxsksgttbzxooixgqzf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHNrc2d0dGJ6eG9vaXhncXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTU4ODAsImV4cCI6MjA3NDM5MTg4MH0.PTAaE9WV6gjpDwlQuRY_HZjI-k5BCZ5yoyIjSSiSfIg';

async function testLeadDetailed() {
  console.log('=== TESTE DETALHADO DE LEAD DEBUG ===');
  
  // Primeiro, vamos fazer um teste com um fingerprint único
  const timestamp = Date.now();
  const uniqueFingerprint = `test-fingerprint-${timestamp}`;
  
  const leadData = {
    event_type: 'lead_submit',
    produto: 'tbz',
    session_id: `test-session-${timestamp}`,
    name: 'João Debug Test',
    email: `joao.debug.${timestamp}@teste.com`,
    phone: '11999888777',
    traffic_id: `debug-test-${timestamp}`,
    fingerprint_hash: uniqueFingerprint
  };

  console.log('Enviando lead com dados únicos:', JSON.stringify(leadData, null, 2));
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/track-main`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'X-Forwarded-For': '203.0.113.1' // IP público para teste
      },
      body: JSON.stringify(leadData)
    });

    const result = await response.json();
    console.log(`Status HTTP: ${response.status}`);
    console.log('Headers de resposta:', Object.fromEntries(response.headers.entries()));
    console.log('Resposta completa:', JSON.stringify(result, null, 2));
    
    // Verificar se o lead foi realmente inserido no banco
    console.log('\n=== VERIFICANDO NO BANCO DE DADOS ===');
    
    // Aguardar um pouco para garantir que a inserção foi processada
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verificar na tabela de leads
    const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/oreino360-leads?traffic_id=eq.debug-test-${timestamp}&select=*`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    const leadInDb = await checkResponse.json();
    console.log('Lead encontrado no banco:', JSON.stringify(leadInDb, null, 2));
    
    if (leadInDb && leadInDb.length > 0) {
      console.log('✅ SUCESSO: Lead foi inserido no banco de dados!');
    } else {
      console.log('❌ PROBLEMA: Lead não foi encontrado no banco de dados!');
    }
    
  } catch (error) {
    console.error('Erro no teste:', error.message);
  }
}

testLeadDetailed().catch(console.error);