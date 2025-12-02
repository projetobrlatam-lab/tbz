// Teste de reload: primeira chamada com UTMs fortes, segunda chamada sem UTMs
const SUPABASE_URL = 'https://ynxsksgttbzxooixgqzf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHNrc2d0dGJ6eG9vaXhncXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTU4ODAsImV4cCI6MjA3NDM5MTg4MH0.PTAaE9WV6gjpDwlQuRY_HZjI-k5BCZ5yoyIjSSiSfIg';

async function run() {
  // Use a sessionId fixo para comparar antes e depois
  const sessionId = process.env.SESSION_ID || '6216d60c-9f8e-472f-80c8-c59d94e6d7ba';
  console.log('🧪 Teste de reload com sessionId:', sessionId);

  // Segunda chamada: simular reload sem UTMs (ou valores fracos)
  console.log('\n🔁 Chamada de reload sem UTMs (espera preservar UTMs fortes existentes)');
  const payloadReload = {
    session_id: sessionId,
    event_type: 'page_view',
    produto: 'Quiz TBZ'
    // intencionalmente sem utm_source/utm_medium
  };

  try {
    const respReload = await fetch(`${SUPABASE_URL}/functions/v1/public-endpoint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(payloadReload)
    });
    const text = await respReload.text();
    console.log('📊 Status reload:', respReload.status);
    console.log('Resposta reload:', text);
  } catch (e) {
    console.error('❌ Erro no reload:', e);
  }
}

run();