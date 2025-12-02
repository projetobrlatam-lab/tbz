// Teste para verificar se a correção da deduplicação permite registro de leads
const SUPABASE_URL = 'https://ynxsksgttbzxooixgqzf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHNrc2d0dGJ6eG9vaXhncXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTU4ODAsImV4cCI6MjA3NDM5MTg4MH0.PTAaE9WV6gjpDwlQuRY_HZjI-k5BCZ5yoyIjSSiSfIg';

async function testLeadSubmission() {
  console.log('=== TESTE DE CORREÇÃO DE LEADS ===');
  
  const testCases = [
    {
      name: 'Primeiro evento - visit (deve ser processado)',
      data: {
        event_type: 'visit',
        produto: 'teste-lead-fix',
        session_id: 'test-session-lead-fix-001'
      }
    },
    {
      name: 'Segundo evento - lead_submit (deve ser processado mesmo com deduplicação)',
      data: {
        event_type: 'lead_submit',
        produto: 'teste-lead-fix',
        session_id: 'test-session-lead-fix-001',
        name: 'João Teste Lead Fix',
        email: 'joao.leadfix@teste.com',
        phone: '11999887766',
        traffic_id: 'lead-fix-test-001'
      }
    },
    {
      name: 'Terceiro evento - page_view (deve ser bloqueado por deduplicação)',
      data: {
        event_type: 'page_view',
        produto: 'teste-lead-fix',
        session_id: 'test-session-lead-fix-001'
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n--- ${testCase.name} ---`);
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/track-main`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8'
        },
        body: JSON.stringify(testCase.data)
      });

      const result = await response.json();
      console.log(`Status: ${response.status}`);
      console.log('Resposta:', JSON.stringify(result, null, 2));
      
      if (testCase.data.event_type === 'lead_submit') {
        if (result.success) {
          console.log('✅ SUCESSO: Lead foi processado mesmo com deduplicação!');
        } else {
          console.log('❌ ERRO: Lead foi bloqueado pela deduplicação!');
        }
      }
      
    } catch (error) {
      console.error(`Erro no teste ${testCase.name}:`, error.message);
    }
    
    // Aguardar um pouco entre os testes
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

testLeadSubmission().catch(console.error);