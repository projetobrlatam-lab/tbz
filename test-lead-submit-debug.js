// Teste específico para debug do lead_submit
// Simula exatamente o que o frontend está enviando

const testLeadSubmit = async () => {
  // Gerar um traffic_id único para evitar conflitos de unique constraint
  const uniqueTrafficId = 'test_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
  const payload = {
    event_type: 'lead_submit',
    name: 'João Silva',
    email: 'joao.silva.test@gmail.com',
    phone: '(21) 99999-9999',
    traffic_id: uniqueTrafficId,
    fonte_de_trafego: 'instagram',
    utm_source: 'instagram',
    utm_medium: 'social',
    utm_campaign: 'quiz-tbz',
    diagnosisLevel: 'high',
    product: 'tbz'
  };

  console.log('🧪 TESTE: Enviando payload de lead_submit:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch('https://ynxsksgttbzxooixgqzf.supabase.co/functions/v1/track-main', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHNrc2d0dGJ6eG9vaXhncXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTU4ODAsImV4cCI6MjA3NDM5MTg4MH0.PTAaE9WV6gjpDwlQuRY_HZjI-k5BCZ5yoyIjSSiSfIg'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.text();
    console.log('✅ TESTE: Resposta da edge function:', response.status, result);

    if (response.ok) {
      console.log('✅ TESTE: Edge function executou com sucesso');
      console.log('🔍 TESTE: Verificando se o lead foi salvo na tabela...');
    } else {
      console.error('❌ TESTE: Erro na edge function:', response.status, result);
    }

  } catch (error) {
    console.error('❌ TESTE: Erro na requisição:', error);
  }
};

// Executar o teste
testLeadSubmit();