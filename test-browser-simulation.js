// Teste completo para simular exatamente o que o navegador está enviando
const testBrowserSimulation = async () => {
  try {
    console.log('🔍 Testando simulação completa do navegador...\n');

    // 1. Simular dados que o frontend coleta
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 2. Payload exato que o frontend deveria enviar
    const payload = {
      session_id: sessionId,
      reason: "fechamento_janela",
      step_where_abandoned: "pergunta_1",
      produto: "Treino Bíceps Zona",
      fonte_de_trafego: "direct", // Corrigido para usar fonte_de_trafego
      traffic_id: null, // Pode ser null quando não há Instagram ID
      tipo_de_funil: "quiz",
      email: undefined // Pode ser undefined quando não há email
    };

    console.log('📤 Payload sendo enviado:');
    console.log(JSON.stringify(payload, null, 2));
    console.log('');

    // 3. Testar com fetch (como o frontend faz)
    const response = await fetch('https://ynxsksgttbzxooixgqzf.supabase.co/functions/v1/track-abandonment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHNrc2d0dGJ6eG9vaXhncXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTU4ODAsImV4cCI6MjA3NDM5MTg4MH0.PTAaE9WV6gjpDwlQuRY_HZjI-k5BCZ5yoyIjSSiSfIg',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHNrc2d0dGJ6eG9vaXhncXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTU4ODAsImV4cCI6MjA3NDM5MTg4MH0.PTAaE9WV6gjpDwlQuRY_HZjI-k5BCZ5yoyIjSSiSfIg'
      },
      body: JSON.stringify(payload),
      keepalive: true
    });

    console.log(`📊 Status da resposta: ${response.status}`);
    console.log(`📊 Status text: ${response.statusText}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Resposta da função:');
      console.log(JSON.stringify(result, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ Erro na resposta:');
      console.log(`Status: ${response.status}`);
      console.log(`Texto do erro: ${errorText}`);
    }

    // 4. Testar variações do payload
    console.log('\n🔄 Testando variações do payload...\n');

    // Teste com email válido
    const payloadWithEmail = {
      ...payload,
      email: "test@example.com"
    };

    console.log('📤 Testando com email:');
    const responseWithEmail = await fetch('https://ynxsksgttbzxooixgqzf.supabase.co/functions/v1/track-abandonment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHNrc2d0dGJ6eG9vaXhncXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTU4ODAsImV4cCI6MjA3NDM5MTg4MH0.PTAaE9WV6gjpDwlQuRY_HZjI-k5BCZ5yoyIjSSiSfIg'
      },
      body: JSON.stringify(payloadWithEmail)
    });

    console.log(`Status com email: ${responseWithEmail.status}`);
    if (responseWithEmail.ok) {
      const result = await responseWithEmail.json();
      console.log('✅ Sucesso com email:', result);
    } else {
      const errorText = await responseWithEmail.text();
      console.log('❌ Erro com email:', errorText);
    }

  } catch (error) {
    console.error('❌ Erro geral no teste:', error);
  }
};

// Executar o teste
testBrowserSimulation();