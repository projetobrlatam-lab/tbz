// Teste simples para debugar evento visit
const testVisitEvent = async () => {
  console.log('🔍 TESTE VISIT: Iniciando...');
  
  const visitPayload = {
    session_id: 'test_visit_' + Date.now(),
    event_type: 'visit',
    event_data: JSON.stringify({
      url: 'http://localhost:3001/?utm_source=instagram&utm_medium=rodiney2122',
      referrer: null,
      page_title: 'Quiz TBZ',
      funnel_type: 'quiz',
      utm_source: 'instagram',
      utm_medium: 'rodiney2122'
    }),
    produto: 'tbz',
    tipo_de_funil: 'quiz',
    traffic_id: 'rodiney2122',
    fonte_de_trafego: 'instagram',
    utm_source: 'instagram',
    utm_medium: 'rodiney2122',
    isAnonymous: true
  };

  console.log('📤 PAYLOAD:', JSON.stringify(visitPayload, null, 2));

  try {
    const response = await fetch('https://ynxsksgttbzxooixgqzf.supabase.co/functions/v1/track-main', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHNrc2d0dGJ6eG9vaXhncXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTU4ODAsImV4cCI6MjA3NDM5MTg4MH0.PTAaE9WV6gjpDwlQuRY_HZjI-k5BCZ5yoyIjSSiSfIg'
      },
      body: JSON.stringify(visitPayload)
    });

    const result = await response.json();
    console.log('📥 RESPONSE:', result);
    console.log('📊 STATUS:', response.status);
    
    if (result.success) {
      console.log('✅ SUCESSO: Evento visit registrado!');
    } else {
      console.log('❌ ERRO:', result.message);
    }
  } catch (error) {
    console.error('💥 ERRO NA REQUISIÇÃO:', error);
  }
};

testVisitEvent();