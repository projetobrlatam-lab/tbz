// Teste que simula exatamente o payload do frontend
// Para comparar com o teste que funciona

const testFrontendPayload = async () => {
  // Simular dados como o frontend envia
  const sessionId = 'session_' + Date.now();
  const instagramId = 'instagram_test_' + Date.now();
  
  // Dados do lead como vem do formulário
  const leadData = {
    name: 'Maria Silva Frontend',
    email: 'maria.frontend@gmail.com',
    phone: '(11) 98765-4321',
    diagnosisLevel: 2
  };

  // Event data como o frontend serializa
  const eventDataObj = {
    name: leadData.name,
    email: leadData.email,
    phone: leadData.phone,
    questionId: null,
    url: 'http://localhost:3001',
    referrer: null,
    page_title: 'Quiz TBZ',
    diagnosisLevel: leadData.diagnosisLevel,
    funnel_type: 'quiz',
    utm_source: 'instagram',
    utm_medium: 'social'
  };

  // Payload exatamente como o frontend envia
  const frontendPayload = {
    session_id: sessionId,
    event_type: 'lead_submit',
    event_data: JSON.stringify(eventDataObj),
    produto: 'tbz',
    tipo_de_funil: 'quiz',
    traffic_id: instagramId,
    fonte_de_trafego: 'instagram',
    utm_source: 'instagram',
    utm_medium: 'social',
    diagnosisLevel: leadData.diagnosisLevel,
    isAnonymous: false,
    name: leadData.name,
    email: leadData.email,
    phone: leadData.phone
  };

  console.log('🔍 TESTE FRONTEND: Enviando payload como o frontend:', JSON.stringify(frontendPayload, null, 2));

  try {
    const response = await fetch('https://ynxsksgttbzxooixgqzf.supabase.co/functions/v1/track-main', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHNrc2d0dGJ6eG9vaXhncXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTU4ODAsImV4cCI6MjA3NDM5MTg4MH0.PTAaE9WV6gjpDwlQuRY_HZjI-k5BCZ5yoyIjSSiSfIg'
      },
      body: JSON.stringify(frontendPayload)
    });

    const result = await response.text();
    console.log('✅ TESTE FRONTEND: Resposta da edge function:', response.status, result);

    if (response.ok) {
      console.log('✅ TESTE FRONTEND: Edge function executou com sucesso');
      console.log('🔍 TESTE FRONTEND: Verificando se o lead foi salvo na tabela...');
      
      // Aguardar um pouco para o processamento
      setTimeout(() => {
        console.log('🔍 TESTE FRONTEND: Agora verifique no banco se o lead foi salvo com traffic_id:', instagramId);
      }, 2000);
    } else {
      console.error('❌ TESTE FRONTEND: Erro na edge function:', response.status, result);
    }

  } catch (error) {
    console.error('❌ TESTE FRONTEND: Erro na requisição:', error);
  }
};

// Executar o teste
testFrontendPayload();