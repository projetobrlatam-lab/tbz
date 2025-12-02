/**
 * Teste completo do fluxo de tracking do quiz após as correções
 * Este script testa todos os eventos do quiz em sequência
 */

const SUPABASE_URL = 'https://ynxsksgttbzxooixgqzf.supabase.co';
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/track-main`;

// Simular dados de sessão consistentes
const sessionData = {
  session_id: `test-session-${Date.now()}`,
  traffic_id: `test-traffic-${Date.now()}`,
  fingerprint_hash: `test-fp-${Date.now()}`,
  user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  accept_language: 'pt-BR,pt;q=0.9,en;q=0.8',
  referer: 'https://google.com',
  utm_source: 'google',
  utm_medium: 'cpc',
  utm_campaign: 'quiz-test',
  utm_content: 'test-ad',
  utm_term: 'reino-360'
};

async function sendTrackingEvent(eventType, additionalData = {}) {
  const payload = {
    event_type: eventType,
    session_id: sessionData.session_id,
    traffic_id: sessionData.traffic_id,
    fingerprint_hash: sessionData.fingerprint_hash,
    produto: 'reino-360',
    tipo_de_funil: 'quiz',
    user_agent: sessionData.user_agent,
    accept_language: sessionData.accept_language,
    referer: sessionData.referer,
    utm_source: sessionData.utm_source,
    utm_medium: sessionData.utm_medium,
    utm_campaign: sessionData.utm_campaign,
    utm_content: sessionData.utm_content,
    utm_term: sessionData.utm_term,
    ...additionalData
  };

  console.log(`\n🚀 Enviando evento: ${eventType}`);
  console.log('Payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': sessionData.user_agent,
        'Accept-Language': sessionData.accept_language,
        'Referer': sessionData.referer
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    console.log(`✅ Status: ${response.status}`);
    console.log(`📝 Response: ${responseText}`);

    if (!response.ok) {
      console.error(`❌ Erro no evento ${eventType}: ${response.status} - ${responseText}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`❌ Erro de rede no evento ${eventType}:`, error.message);
    return false;
  }
}

async function testCompleteQuizFlow() {
  console.log('🎯 INICIANDO TESTE COMPLETO DO FLUXO DE TRACKING DO QUIZ');
  console.log('=' .repeat(60));
  console.log(`Session ID: ${sessionData.session_id}`);
  console.log(`Traffic ID: ${sessionData.traffic_id}`);
  console.log(`Fingerprint Hash: ${sessionData.fingerprint_hash}`);
  console.log('=' .repeat(60));

  const results = [];

  // 1. Page View (entrada no quiz)
  console.log('\n📄 TESTE 1: PAGE VIEW');
  const pageViewSuccess = await sendTrackingEvent('page_view', {
    page_url: 'https://quiz.reino360.com/',
    page_title: 'Quiz Reino 360'
  });
  results.push({ event: 'page_view', success: pageViewSuccess });

  // Aguardar um pouco entre eventos
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 2. Quiz Start
  console.log('\n🎮 TESTE 2: QUIZ START');
  const quizStartSuccess = await sendTrackingEvent('quiz_start', {
    quiz_id: 'reino-360-quiz',
    quiz_title: 'Descubra seu Perfil no Reino 360'
  });
  results.push({ event: 'quiz_start', success: quizStartSuccess });

  await new Promise(resolve => setTimeout(resolve, 1000));

  // 3. Question Views (simular algumas perguntas)
  const questions = [
    { id: 'q1', text: 'Qual é seu maior desafio financeiro?' },
    { id: 'q2', text: 'Quanto você gostaria de ganhar por mês?' },
    { id: 'q3', text: 'Qual é seu nível de experiência?' }
  ];

  for (let i = 0; i < questions.length; i++) {
    console.log(`\n❓ TESTE ${3 + i}: QUESTION VIEW - ${questions[i].id}`);
    const questionSuccess = await sendTrackingEvent('question_view', {
      question_id: questions[i].id,
      question_text: questions[i].text,
      question_number: i + 1,
      total_questions: questions.length
    });
    results.push({ event: `question_view_${questions[i].id}`, success: questionSuccess });
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // 4. Lead Submit
  console.log('\n📧 TESTE 6: LEAD SUBMIT');
  const leadSubmitSuccess = await sendTrackingEvent('lead_submit', {
    name: 'João Silva Teste',
    email: `joao.teste.${Date.now()}@email.com`,
    phone: '11999887766',
    quiz_result: 'Empreendedor Iniciante',
    quiz_score: 75,
    lead_magnet: 'Guia Completo do Reino 360'
  });
  results.push({ event: 'lead_submit', success: leadSubmitSuccess });

  // 5. Resumo dos resultados
  console.log('\n' + '=' .repeat(60));
  console.log('📊 RESUMO DOS RESULTADOS');
  console.log('=' .repeat(60));

  let successCount = 0;
  let failCount = 0;

  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.event}: ${result.success ? 'SUCESSO' : 'FALHOU'}`);
    
    if (result.success) {
      successCount++;
    } else {
      failCount++;
    }
  });

  console.log('\n' + '-' .repeat(40));
  console.log(`✅ Sucessos: ${successCount}`);
  console.log(`❌ Falhas: ${failCount}`);
  console.log(`📈 Taxa de sucesso: ${((successCount / results.length) * 100).toFixed(1)}%`);

  if (failCount === 0) {
    console.log('\n🎉 TODOS OS TESTES PASSARAM! O fluxo de tracking está funcionando corretamente.');
  } else {
    console.log('\n⚠️  ALGUNS TESTES FALHARAM. Verifique os logs acima para mais detalhes.');
  }

  console.log('\n' + '=' .repeat(60));
  console.log('🔍 PRÓXIMOS PASSOS PARA VERIFICAÇÃO MANUAL:');
  console.log('1. Verificar se os registros foram criados nas tabelas:');
  console.log('   - oreino360-identificador');
  console.log('   - oreino360-eventos');
  console.log('   - oreino360-leads (se lead_submit passou)');
  console.log('   - oreino360-visitas');
  console.log('2. Verificar se não há registros duplicados');
  console.log('3. Verificar se a geolocalização está sendo capturada');
  console.log('4. Verificar se os UTMs estão sendo preservados');
  console.log('=' .repeat(60));
}

// Executar o teste
testCompleteQuizFlow().catch(console.error);