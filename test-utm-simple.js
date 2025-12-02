// Teste simples para reproduzir o problema de UTMs não capturadas
console.log('🧪 Testando captura de UTMs...');

// Simular o payload exato que o frontend envia
const payload = {
  session_id: crypto.randomUUID(),
  event_type: 'visit',
  produto: 'Quiz TBZ',
  fonte_de_trafego: 'instagram',
  traffic_id: 'rodiney2122',
  utm_source: 'instagram',
  utm_medium: 'rodiney2122',
  tipo_de_funil: 'quiz'
};

console.log('📤 Payload de teste:');
console.log(JSON.stringify(payload, null, 2));

// Testar a Edge Function
async function testEdgeFunction() {
  try {
    console.log('\n🚀 Enviando para Edge Function...');
    
    const response = await fetch('https://ynxsksgttbzxooixgqzf.supabase.co/functions/v1/public-endpoint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHNrc2d0dGJ6eG9vaXhncXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTU4ODAsImV4cCI6MjA3NDM5MTg4MH0.PTAaE9WV6gjpDwlQuRY_HZjI-k5BCZ5yoyIjSSiSfIg'
      },
      body: JSON.stringify(payload)
    });

    console.log('📊 Status da resposta:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Resposta da Edge Function:');
      console.log(JSON.stringify(result, null, 2));
    } else {
      const error = await response.text();
      console.log('❌ Erro na Edge Function:');
      console.log(error);
    }
    
  } catch (error) {
    console.error('💥 Erro ao testar Edge Function:', error);
  }
}

// Executar o teste
testEdgeFunction();