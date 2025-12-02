// Script para testar o payload exato que o frontend está enviando
const testFrontendPayload = async () => {
  try {
    // Simular o payload que o frontend está enviando
    const payload = {
      session_id: "test-session-123",
      reason: "fechamento_janela",
      step_where_abandoned: "pergunta_1",
      produto: "Treino Bíceps Zona",
      fonte_de_trafego: "direct",
      traffic_id: "test-traffic-123",
      tipo_de_funil: "quiz",
      email: "test@example.com"
    };

    console.log('Payload sendo enviado:', JSON.stringify(payload, null, 2));

    const response = await fetch('https://ynxsksgttbzxooixgqzf.supabase.co/functions/v1/track-abandonment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHNrc2d0dGJ6eG9vaXhncXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTU4ODAsImV4cCI6MjA3NDM5MTg4MH0.PTAaE9WV6gjpDwlQuRY_HZjI-k5BCZ5yoyIjSSiSfIg'
      },
      body: JSON.stringify(payload)
    });

    console.log('Status da resposta:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('Resposta da função:', result);
      console.log('✅ Abandono registrado com sucesso!');
    } else {
      const errorText = await response.text();
      console.error('❌ Erro na resposta:', response.status, errorText);
    }

  } catch (error) {
    console.error('❌ Erro ao testar payload:', error);
  }
};

// Executar o teste
testFrontendPayload();