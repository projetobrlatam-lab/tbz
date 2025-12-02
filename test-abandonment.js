// Script de teste para a função track-abandonment
const testPayload = {
  session_id: "550f7fcf-9af1-42b0-a883-e0133e41928", // UUID válido
  reason: "fechamento_janela",
  step_where_abandoned: "pergunta_3",
  produto: "Oreino360",
  fonte_de_trafego: "organic",
  tipo_de_funil: "quiz",
  email: "test@example.com",
  traffic_id: "test123"
};

async function testTrackAbandonment() {
  try {
    console.log('Testando função track-abandonment...');
    console.log('Payload:', JSON.stringify(testPayload, null, 2));
    
    const response = await fetch('https://ynxsksgttbzxooixgqzf.supabase.co/functions/v1/track-abandonment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHNrc2d0dGJ6eG9vaXhncXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTU4ODAsImV4cCI6MjA3NDM5MTg4MH0.PTAaE9WV6gjpDwlQuRY_HZjI-k5BCZ5yoyIjSSiSfIg'
      },
      body: JSON.stringify(testPayload)
    });

    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    const responseText = await response.text();
    console.log('Response:', responseText);
    
    if (response.ok) {
      console.log('✅ Função executada com sucesso!');
    } else {
      console.log('❌ Erro na execução da função');
    }
    
  } catch (error) {
    console.error('❌ Erro ao chamar a função:', error);
  }
}

// Executar o teste
testTrackAbandonment();