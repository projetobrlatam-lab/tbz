// Teste para verificar se track-abandonment cria sessão quando não existe
const testSessionCreation = async () => {
  const testSessionId = crypto.randomUUID();
  console.log('🧪 Testing session creation with new session_id:', testSessionId);
  
  const payload = {
    session_id: testSessionId,
    event_type: 'abandonment',
    produto: 'tbz',
    fonte_de_trafego: 'test',
    tipo_de_funil: 'Quiz',
    email: 'test@example.com'
  };

  try {
    const response = await fetch('http://127.0.0.1:54321/functions/v1/track-abandonment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log('📊 Response status:', response.status);
    console.log('📊 Response body:', JSON.stringify(result, null, 2));
    
    if (response.status === 200) {
      console.log('✅ SUCCESS: Session creation and abandonment tracking worked!');
    } else {
      console.log('❌ FAILED: Session creation failed');
    }
  } catch (error) {
    console.error('❌ ERROR:', error);
  }
};

testSessionCreation();