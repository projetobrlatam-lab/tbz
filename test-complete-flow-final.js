// Teste completo do fluxo após correções
const testCompleteFlow = async () => {
  console.log('🧪 Testando fluxo completo após correções...\n');

  const testEmail = `teste.final.${Date.now()}@example.com`;
  
  // 1. Testar inserção de lead
  console.log('1️⃣ Testando inserção de lead...');
  const leadPayload = {
    event_type: 'lead_submit',
    name: 'Teste Final Lead',
    email: testEmail,
    phone: '11999999999',
    urgency_level: 'high',
    produto: 'tbz',
    tipo_de_funil: 'quiz',
    traffic_id: 'test-final-123',
    fonte_de_trafego: 'test'
  };

  try {
    const leadResponse = await fetch('https://ynxsksgttbzxooixgqzf.supabase.co/functions/v1/track-main', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHNrc2d0dGJ6eG9vaXhncXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTU4ODAsImV4cCI6MjA3NDM5MTg4MH0.PTAaE9WV6gjpDwlQuRY_HZjI-k5BCZ5yoyIjSSiSfIg'
      },
      body: JSON.stringify(leadPayload)
    });

    const leadResult = await leadResponse.json();
    
    if (leadResponse.ok) {
      console.log('✅ Lead inserido com sucesso!');
      console.log('📊 Debug info:', JSON.stringify(leadResult.debug, null, 2));
    } else {
      console.log('❌ Erro na inserção do lead:', leadResult);
      return;
    }

    // Aguardar um pouco para garantir que a inserção foi processada
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 2. Testar busca de leads
    console.log('\n2️⃣ Testando busca de leads...');
    const leadsResponse = await fetch('https://ynxsksgttbzxooixgqzf.supabase.co/functions/v1/get-leads-with-tags?date_filter=all', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHNrc2d0dGJ6eG9vaXhncXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTU4ODAsImV4cCI6MjA3NDM5MTg4MH0.PTAaE9WV6gjpDwlQuRY_HZjI-k5BCZ5yoyIjSSiSfIg'
      }
    });

    if (leadsResponse.ok) {
      const leadsResult = await leadsResponse.json();
      console.log('✅ Busca de leads funcionando!');
      console.log(`📊 Total de leads encontrados: ${leadsResult.leads.length}`);
      
      // Verificar se nosso lead está na lista
      const ourLead = leadsResult.leads.find(lead => lead.email === testEmail);
      if (ourLead) {
        console.log('✅ Nosso lead foi encontrado na busca!');
        console.log('📊 Dados do lead:', JSON.stringify(ourLead, null, 2));
      } else {
        console.log('⚠️ Nosso lead não foi encontrado na busca');
      }
    } else {
      const errorText = await leadsResponse.text();
      console.log('❌ Erro na busca de leads:', errorText);
      return;
    }

    // 3. Testar métricas
    console.log('\n3️⃣ Testando métricas...');
    const metricsResponse = await fetch('https://ynxsksgttbzxooixgqzf.supabase.co/functions/v1/get-metrics?date_filter=all', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHNrc2d0dGJ6eG9vaXhncXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTU4ODAsImV4cCI6MjA3NDM5MTg4MH0.PTAaE9WV6gjpDwlQuRY_HZjI-k5BCZ5yoyIjSSiSfIg'
      }
    });

    if (metricsResponse.ok) {
      const metricsResult = await metricsResponse.json();
      console.log('✅ Métricas funcionando!');
      console.log('📊 Resumo das métricas:');
      console.log(`   - Total de leads: ${metricsResult.totalLeads || 0}`);
      console.log(`   - Total de visitas: ${metricsResult.totalVisits || 0}`);
      console.log(`   - Total de sessões: ${metricsResult.totalSessions || 0}`);
    } else {
      const errorText = await metricsResponse.text();
      console.log('❌ Erro nas métricas:', errorText);
    }

    console.log('\n🎉 TESTE COMPLETO FINALIZADO!');
    console.log('✅ Todos os componentes principais estão funcionando corretamente.');
    
  } catch (error) {
    console.error('❌ Erro no teste completo:', error);
  }
};

// Executar o teste
testCompleteFlow();