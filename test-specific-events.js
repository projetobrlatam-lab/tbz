/**
 * Teste específico para debugar eventos page_view e quiz_start
 */

const SUPABASE_URL = 'https://ynxsksgttbzxooixgqzf.supabase.co';
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/track-main`;

async function testSpecificEvent(eventType, additionalData = {}) {
  const payload = {
    event_type: eventType,
    session_id: `debug-session-${Date.now()}`,
    traffic_id: `debug-traffic-${Date.now()}`,
    fingerprint_hash: `debug-fp-${Date.now()}`,
    produto: 'reino-360',
    tipo_de_funil: 'quiz',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    accept_language: 'pt-BR,pt;q=0.9',
    referer: 'https://google.com',
    utm_source: 'google',
    utm_medium: 'cpc',
    utm_campaign: 'debug-test',
    ...additionalData
  };

  console.log(`\n🔍 TESTANDO EVENTO: ${eventType}`);
  console.log('=' .repeat(50));
  console.log('Payload enviado:');
  console.log(JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': payload.user_agent,
        'Accept-Language': payload.accept_language,
        'Referer': payload.referer
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    
    console.log(`\n📊 RESULTADO:`);
    console.log(`Status: ${response.status}`);
    console.log(`Response Headers:`, Object.fromEntries(response.headers.entries()));
    console.log(`Response Body:`, responseText);

    if (!response.ok) {
      console.log(`\n❌ ERRO DETECTADO:`);
      console.log(`- Status Code: ${response.status}`);
      console.log(`- Response: ${responseText}`);
      
      // Tentar parsear como JSON para ver se há mais detalhes
      try {
        const errorData = JSON.parse(responseText);
        console.log(`- Error Details:`, JSON.stringify(errorData, null, 2));
      } catch (e) {
        console.log(`- Raw Error: ${responseText}`);
      }
    } else {
      console.log(`\n✅ SUCESSO!`);
      try {
        const successData = JSON.parse(responseText);
        console.log(`- Success Details:`, JSON.stringify(successData, null, 2));
      } catch (e) {
        console.log(`- Raw Success: ${responseText}`);
      }
    }

  } catch (error) {
    console.log(`\n💥 ERRO DE REDE:`);
    console.log(`- Message: ${error.message}`);
    console.log(`- Stack: ${error.stack}`);
  }

  console.log('\n' + '=' .repeat(50));
}

async function runDebugTests() {
  console.log('🚀 INICIANDO TESTES DE DEBUG ESPECÍFICOS');
  console.log('=' .repeat(60));

  // Teste 1: page_view
  await testSpecificEvent('page_view', {
    page_url: 'https://quiz.reino360.com/',
    page_title: 'Quiz Reino 360'
  });

  // Aguardar entre testes
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Teste 2: quiz_start
  await testSpecificEvent('quiz_start', {
    quiz_id: 'reino-360-quiz',
    quiz_title: 'Descubra seu Perfil no Reino 360'
  });

  console.log('\n🏁 TESTES DE DEBUG CONCLUÍDOS');
}

// Executar os testes
runDebugTests().catch(console.error);