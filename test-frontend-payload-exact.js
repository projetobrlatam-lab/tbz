// Teste que simula EXATAMENTE o payload do frontend
// Para identificar o erro 400 específico

const SUPABASE_URL = 'https://ynxsksgttbzxooixgqzf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHNrc2d0dGJ6eG9vaXhncXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTU4ODAsImV4cCI6MjA3NDM5MTg4MH0.PTAaE9WV6gjpDwlQuRY_HZjI-k5BCZ5yoyIjSSiSfIg';

async function testExactFrontendPayload() {
  console.log('🧪 TESTE: Simulando payload EXATO do frontend...');
  
  const uniqueId = Date.now();
  
  // Simular exatamente como o client.ts constrói o payload
  const eventDataObj = {
    name: `Teste Frontend ${uniqueId}`,
    email: `teste.frontend.${uniqueId}@email.com`,
    phone: '11999999999',
    questionId: null,
    url: 'http://localhost:3001/quiz',
    referrer: null,
    page_title: 'Quiz TBZ',
    diagnosisLevel: 'high',
    funnel_type: 'quiz',
    utm_source: 'instagram',
    utm_medium: 'social',
    diagnosticResult: {
      urgencyLevel: 'ALTA',
      recommendations: ['Teste']
    }
  };

  const eventPayload = {
    session_id: `session-${uniqueId}`,
    event_type: 'lead_submit',
    event_data: JSON.stringify(eventDataObj),
    produto: 'tbz',
    tipo_de_funil: 'quiz',
    traffic_id: 'social', // utm_medium
    fonte_de_trafego: 'instagram', // utm_source
    utm_source: 'instagram',
    utm_medium: 'social',
    diagnosisLevel: 'high',
    diagnosticResult: {
      urgencyLevel: 'ALTA',
      recommendations: ['Teste']
    },
    isAnonymous: false,
    // Campos adicionados pelo LEAD_SUBMIT
    name: `Teste Frontend ${uniqueId}`,
    email: `teste.frontend.${uniqueId}@email.com`,
    phone: '11999999999',
    urgency_level: 'ALTA'
  };

  console.log('📦 Payload completo:', JSON.stringify(eventPayload, null, 2));

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/track-main`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(eventPayload)
    });

    const responseText = await response.text();
    console.log('📊 Status:', response.status);
    console.log('📄 Resposta:', responseText);

    if (!response.ok) {
      console.error('❌ ERRO ENCONTRADO!');
      console.error('Status:', response.status);
      console.error('Resposta:', responseText);
      
      // Tentar parsear como JSON para ver detalhes do erro
      try {
        const errorData = JSON.parse(responseText);
        console.error('💥 Detalhes do erro:', errorData);
      } catch (e) {
        console.error('💥 Erro não é JSON válido');
      }
    } else {
      console.log('✅ Sucesso!');
      try {
        const responseData = JSON.parse(responseText);
        console.log('📋 Dados da resposta:', responseData);
      } catch (e) {
        console.log('📋 Resposta não é JSON válido');
      }
    }

  } catch (error) {
    console.error('💥 Erro na requisição:', error);
  }
}

testExactFrontendPayload().catch(console.error);