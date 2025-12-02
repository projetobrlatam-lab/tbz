// Teste simples para verificar se lead_submit está funcionando
const SUPABASE_URL = 'https://ynxsksgttbzxooixgqzf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHNrc2d0dGJ6eG9vaXhncXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTU4ODAsImV4cCI6MjA3NDM5MTg4MH0.PTAaE9WV6gjpDwlQuRY_HZjI-k5BCZ5yoyIjSSiSfIg';

async function testLeadOnly() {
  console.log('=== TESTE SIMPLES DE LEAD ===');
  
  const leadData = {
    event_type: 'lead_submit',
    produto: 'tbz',
    session_id: 'test-session-simple-' + Date.now(),
    name: 'Maria Teste Simples',
    email: 'maria.simples@teste.com',
    phone: '11888777666',
    traffic_id: 'simple-test-' + Date.now()
  };

  console.log('Enviando lead:', JSON.stringify(leadData, null, 2));
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/track-main`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8'
      },
      body: JSON.stringify(leadData)
    });

    const result = await response.json();
    console.log(`Status: ${response.status}`);
    console.log('Resposta:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ SUCESSO: Lead foi processado!');
    } else {
      console.log('❌ ERRO: Lead não foi processado!');
    }
    
  } catch (error) {
    console.error('Erro no teste:', error.message);
  }
}

testLeadOnly().catch(console.error);