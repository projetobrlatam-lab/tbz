// Teste final após redeploy para verificar se leads estão funcionando
const SUPABASE_URL = 'https://ynxsksgttbzxooixgqzf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHNrc2d0dGJ6eG9vaXhncXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTU4ODAsImV4cCI6MjA3NDM5MTg4MH0.PTAaE9WV6gjpDwlQuRY_HZjI-k5BCZ5yoyIjSSiSfIg';

async function testLeadAfterDeploy() {
  console.log('=== TESTE FINAL APÓS REDEPLOY ===');
  
  const timestamp = Date.now();
  
  const leadData = {
    event_type: 'lead_submit',
    produto: 'tbz',
    session_id: `final-test-${timestamp}`,
    name: 'Maria Final Test',
    email: `maria.final.${timestamp}@teste.com`,
    phone: '11777666555',
    traffic_id: `final-test-${timestamp}`
  };

  console.log('Enviando lead após redeploy:', JSON.stringify(leadData, null, 2));
  
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
    
    // Aguardar processamento
    console.log('\nAguardando processamento...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verificar no banco
    console.log('Verificando no banco de dados...');
    const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/oreino360-leads?traffic_id=eq.final-test-${timestamp}&select=*`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    const leadInDb = await checkResponse.json();
    console.log('Lead no banco:', JSON.stringify(leadInDb, null, 2));
    
    if (result.success && result.message === 'Event tracked successfully') {
      console.log('✅ SUCESSO: Resposta da API está correta!');
    } else {
      console.log('❌ PROBLEMA: Resposta da API ainda não está correta!');
    }
    
    if (leadInDb && leadInDb.length > 0) {
      console.log('✅ SUCESSO: Lead foi inserido no banco de dados!');
      console.log('🎉 CORREÇÃO FUNCIONOU: A tabela oreino360-leads está funcionando novamente!');
    } else {
      console.log('❌ PROBLEMA: Lead ainda não está sendo inserido no banco!');
    }
    
  } catch (error) {
    console.error('Erro no teste:', error.message);
  }
}

testLeadAfterDeploy().catch(console.error);