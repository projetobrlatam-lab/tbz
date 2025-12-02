const SUPABASE_URL = 'https://ynxsksgttbzxooixgqzf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHNrc2d0dGJ6eG9vaXhncXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTU4ODAsImV4cCI6MjA3NDM5MTg4MH0.PTAaE9WV6gjpDwlQuRY_HZjI-k5BCZ5yoyIjSSiSfIg';

async function testTagAssignment() {
  console.log('🧪 Iniciando teste de atribuição de tags...');
  
  const testTrafficId = `test-urgency-${Date.now()}`;
  const testEmail = `test-urgency-${Date.now()}@example.com`;
  
  try {
    // 1. Enviar evento de visita
    console.log('📍 Enviando evento de visita...');
    const visitResponse = await fetch(`${SUPABASE_URL}/functions/v1/track-main`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        event_type: 'visit',
        traffic_id: testTrafficId,
        utm_source: 'instagram',
        tipo_de_funil: 'quiz',
        produto: 'tbz'
      })
    });
    
    if (!visitResponse.ok) {
      throw new Error(`Visit failed: ${visitResponse.status} ${await visitResponse.text()}`);
    }
    
    console.log('✅ Evento de visita enviado com sucesso');
    
    // 2. Enviar lead com urgência em inglês
    console.log('📧 Enviando lead com urgência "emergency"...');
    const leadResponse = await fetch(`${SUPABASE_URL}/functions/v1/track-main`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        event_type: 'lead_submit',
        traffic_id: testTrafficId,
        email: testEmail,
        name: 'Test User Urgency',
        phone: '+5511999999999',
        utm_source: 'instagram',
        tipo_de_funil: 'quiz',
        produto: 'tbz',
        diagnostic_result: {
          urgencyLevel: 'emergency',
          score: 85,
          recommendations: ['Test recommendation']
        }
      })
    });
    
    if (!leadResponse.ok) {
      throw new Error(`Lead submit failed: ${leadResponse.status} ${await leadResponse.text()}`);
    }
    
    console.log('✅ Lead enviado com sucesso');
    
    // 3. Aguardar processamento
    console.log('⏳ Aguardando processamento...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 4. Verificar se o lead foi criado com urgência em português
    console.log('🔍 Verificando lead criado...');
    const verifyResponse = await fetch(`${SUPABASE_URL}/functions/v1/get-single-lead`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        traffic_id: testTrafficId
      })
    });
    
    if (verifyResponse.ok) {
      const leadData = await verifyResponse.json();
      console.log('📊 Dados do lead:', JSON.stringify(leadData, null, 2));
      
      if (leadData.urgency_level === 'EMERGENCIAL') {
        console.log('✅ SUCESSO: Urgência convertida corretamente para português!');
      } else {
        console.log(`❌ ERRO: Urgência não convertida. Esperado: "EMERGENCIAL", Recebido: "${leadData.urgency_level}"`);
      }
      
      if (leadData.tags && leadData.tags.length > 0) {
        console.log('✅ SUCESSO: Tags atribuídas:', leadData.tags);
      } else {
        console.log('❌ ERRO: Nenhuma tag foi atribuída');
      }
    } else {
      console.log(`❌ Erro ao verificar lead: ${verifyResponse.status} ${await verifyResponse.text()}`);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testTagAssignment();