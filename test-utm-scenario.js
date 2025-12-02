import fetch from 'node-fetch';

async function testUTMScenario() {
  console.log('🧪 Testando cenário UTM específico do usuário');
  
  const payload = {
    produto: "tbz",
    tipo_de_funil: "quiz",
    utm_source: "instagram",
    utm_medium: "rodiney2122",
    page_url: "http://localhost:3000/tbz?utm_source=instagram&utm_medium=rodiney2122"
  };
  
  console.log('📋 Payload:', JSON.stringify(payload, null, 2));
  
  try {
    const response = await fetch('https://ynxsksgttbzxooixgqzf.supabase.co/functions/v1/public-endpoint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    console.log('📊 Status:', response.status);
    
    const result = await response.json();
    console.log('📄 Resposta completa:', JSON.stringify(result, null, 2));
    
    if (result.debug) {
      console.log('\n🔍 Informações de Debug:');
      console.log('- hasFormData:', result.debug.hasFormData);
      console.log('- hasCompleteFormData:', result.debug.hasCompleteFormData);
      console.log('- existingLeadFound:', result.debug.existingLeadFound);
      console.log('- leadCreationAttempted:', result.debug.leadCreationAttempted);
      console.log('- traffic_id:', result.debug.traffic_id);
      console.log('- searchQueries:', result.debug.searchQueries);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testUTMScenario();