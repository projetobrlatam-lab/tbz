// Teste específico para debugar inserção de leads
const testLeadInsertion = async () => {
  const testPayload = {
    event_type: 'lead_submit',
    name: 'Teste Debug Lead',
    email: 'teste.debug@example.com',
    phone: '11999999999',
    urgency_level: 'high',
    produto: 'tbz',
    tipo_de_funil: 'quiz',
    traffic_id: 'test-traffic-123',
    fonte_de_trafego: 'test'
  };

  console.log('🧪 Testando inserção de lead...');
  console.log('📊 Payload:', JSON.stringify(testPayload, null, 2));

  try {
    const response = await fetch('https://ynxsksgttbzxooixgqzf.supabase.co/functions/v1/track-main', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHNrc2d0dGJ6eG9vaXhncXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjkxNzE1NzIsImV4cCI6MjA0NDc0NzU3Mn0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8'
      },
      body: JSON.stringify(testPayload)
    });

    const result = await response.json();
    
    console.log('📈 Status da resposta:', response.status);
    console.log('📊 Resultado:', JSON.stringify(result, null, 2));

    if (response.ok) {
      console.log('✅ Requisição bem-sucedida');
      
      // Verificar se o lead foi inserido
      console.log('🔍 Verificando se o lead foi inserido...');
      
      // Aguardar um pouco para garantir que a inserção foi processada
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verificar na tabela de leads
      const checkResponse = await fetch('https://ynxsksgttbzxooixgqzf.supabase.co/rest/v1/oreino360-leads?email=eq.teste.debug@example.com', {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHNrc2d0dGJ6eG9vaXhncXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjkxNzE1NzIsImV4cCI6MjA0NDc0NzU3Mn0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHNrc2d0dGJ6eG9vaXhncXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjkxNzE1NzIsImV4cCI6MjA0NDc0NzU3Mn0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8'
        }
      });
      
      const leadData = await checkResponse.json();
      console.log('📊 Dados do lead na tabela:', JSON.stringify(leadData, null, 2));
      
      if (leadData && leadData.length > 0) {
        console.log('✅ Lead encontrado na tabela!');
      } else {
        console.log('❌ Lead NÃO encontrado na tabela!');
      }
      
    } else {
      console.log('❌ Erro na requisição:', result);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
};

// Executar o teste
testLeadInsertion();