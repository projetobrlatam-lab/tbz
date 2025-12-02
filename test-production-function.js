// Teste para verificar se track-abandonment em produção cria sessão quando não existe
const testProductionFunction = async () => {
  const testSessionId = crypto.randomUUID();
  console.log('🧪 Testing production function with new session_id:', testSessionId);
  
  const payload = {
    session_id: testSessionId,
    event_type: 'abandonment',
    produto: 'tbz',
    fonte_de_trafego: 'test',
    tipo_de_funil: 'Quiz',
    email: 'test@example.com'
  };

  try {
    // URL da função em produção (substitua pela URL real)
    const response = await fetch('https://your-project.supabase.co/functions/v1/track-abandonment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_ANON_KEY' // Substitua pela chave real
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log('📊 Response status:', response.status);
    console.log('📊 Response body:', JSON.stringify(result, null, 2));
    
    if (response.status === 200) {
      console.log('✅ SUCCESS: Session creation and abandonment tracking worked!');
      console.log('🆔 Session ID used:', result.session_id);
      console.log('🆔 Abandonment ID:', result.abandonment_id);
    } else {
      console.log('❌ FAILED: Session creation failed');
    }
  } catch (error) {
    console.error('❌ ERROR:', error);
  }
};

// Descomente a linha abaixo e configure as URLs/chaves para testar em produção
// testProductionFunction();