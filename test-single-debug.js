import fetch from 'node-fetch';

async function testSingleScenario() {
  const payload = {
    produto: "tbz",
    tipo_de_funil: "quiz",
    utm_medium: `test_debug_${Date.now()}`,
    utm_source: "test_source",
    name: "Test Name",
    page_url: "https://test.com"
  };

  console.log('🧪 Testando cenário com debug');
  console.log('📋 Payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch('https://ynxsksgttbzxooixgqzf.supabase.co/functions/v1/public-endpoint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();
    
    console.log('📊 Status:', response.status);
    console.log('📄 Resposta completa:', JSON.stringify(responseData, null, 2));
    
    if (responseData.debug) {
      console.log('\n🔍 Informações de Debug:');
      console.log('- hasFormData:', responseData.debug.hasFormData);
      console.log('- hasCompleteFormData:', responseData.debug.hasCompleteFormData);
      console.log('- existingLeadFound:', responseData.debug.existingLeadFound);
      console.log('- leadCreationAttempted:', responseData.debug.leadCreationAttempted);
      console.log('- traffic_id:', responseData.debug.traffic_id);
      console.log('- searchQueries:', responseData.debug.searchQueries);
    } else {
      console.log('❌ Nenhuma informação de debug encontrada na resposta');
    }

  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
  }
}

testSingleScenario();