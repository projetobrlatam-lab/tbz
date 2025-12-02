const SUPABASE_URL = 'https://ynxsksgttbzxooixgqzf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHNrc2d0dGJ6eG9vaXhncXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTU4ODAsImV4cCI6MjA3NDM5MTg4MH0.PTAaE9WV6gjpDwlQuRY_HZjI-k5BCZ5yoyIjSSiSfIg';

async function testLeadCreation() {
  console.log('🧪 Teste simples de criação de lead...');
  
  const testTrafficId = `test-simple-${Date.now()}`;
  
  // 1. Enviar evento de visita
  console.log('📍 Enviando evento de visita...');
  const visitPayload = {
    session_id: `session-${Date.now()}`,
    event_type: 'visit',
    traffic_id: testTrafficId,
    utm_source: 'test',
    tipo_de_funil: 'quiz'
  };
  
  console.log('Visit payload:', JSON.stringify(visitPayload, null, 2));
  
  const visitResponse = await fetch(`${SUPABASE_URL}/functions/v1/track-main`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(visitPayload)
  });
  
  const visitResult = await visitResponse.text();
  console.log('Visit response status:', visitResponse.status);
  console.log('Visit response:', visitResult);
  
  if (!visitResponse.ok) {
    console.error('❌ Erro no evento de visita');
    return;
  }
  
  console.log('✅ Evento de visita enviado');
  
  // 2. Aguardar um pouco
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 3. Enviar lead
  console.log('📧 Enviando lead...');
  const leadPayload = {
    session_id: `session-${Date.now()}`,
    event_type: 'lead_submit',
    traffic_id: testTrafficId,
    name: 'Test User',
    email: 'test@example.com',
    phone: '11999999999',
    diagnosticResult: {
      urgencyLevel: 'emergency',
      score: 85
    },
    utm_source: 'test',
    tipo_de_funil: 'quiz'
  };
  
  console.log('Lead payload:', JSON.stringify(leadPayload, null, 2));
  
  const leadResponse = await fetch(`${SUPABASE_URL}/functions/v1/track-main`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(leadPayload)
  });
  
  const leadResult = await leadResponse.text();
  console.log('Lead response status:', leadResponse.status);
  console.log('Lead response:', leadResult);
  
  if (!leadResponse.ok) {
    console.error('❌ Erro no envio do lead');
    return;
  }
  
  console.log('✅ Lead enviado');
  
  // 4. Aguardar processamento
  console.log('⏳ Aguardando processamento...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // 5. Verificar se o lead foi criado no banco
  console.log('🔍 Verificando se o lead foi criado...');
  
  // Fazer uma consulta direta ao Supabase para verificar
  const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/oreino360-leads?traffic_id=eq.${testTrafficId}&select=*`, {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  
  const checkResult = await checkResponse.json();
  console.log('Check response status:', checkResponse.status);
  console.log('Leads encontrados:', JSON.stringify(checkResult, null, 2));
  
  if (checkResult && checkResult.length > 0) {
    console.log('✅ Lead encontrado no banco de dados!');
    console.log('Lead ID:', checkResult[0].id);
    console.log('Urgency Level:', checkResult[0].urgency_level);
  } else {
    console.log('❌ Lead NÃO foi encontrado no banco de dados');
  }
}

testLeadCreation().catch(console.error);