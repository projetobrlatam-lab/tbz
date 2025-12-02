import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ynxsksgttbzxooixgqzf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHNrc2d0dGJ6eG9vaXhncXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzY5NzIsImV4cCI6MjA1MDU1Mjk3Mn0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';
const supabase = createClient(supabaseUrl, supabaseKey);

const TRACK_MAIN_URL = 'https://ynxsksgttbzxooixgqzf.supabase.co/functions/v1/track-main';

async function testTagScenario(scenarioName, payload, expectedTags) {
  console.log(`\n=== TESTANDO CENÁRIO: ${scenarioName} ===`);
  
  try {
    // 1. Enviar evento para track-main
    const response = await fetch(TRACK_MAIN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log('Resposta do track-main:', result);

    if (!response.ok) {
      console.error('❌ Erro na requisição:', result);
      return false;
    }

    // 2. Se foi um lead_submit, verificar as tags atribuídas
    if (payload.event_type === 'lead_submit' && result.leadProcessed && result.leadId) {
      console.log('Lead processado com ID:', result.leadId);
      
      // Aguardar um pouco para garantir que as tags foram processadas
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Buscar tags atribuídas ao lead
      const { data: assignedTags, error } = await supabase
        .from('oreino360-lead_tag_assignments')
        .select(`
          tag_id,
          oreino360-tags!inner(name, color)
        `)
        .eq('lead_id', result.leadId);

      if (error) {
        console.error('❌ Erro ao buscar tags:', error);
        return false;
      }

      console.log('Tags atribuídas:', assignedTags);
      
      // Verificar se as tags esperadas foram atribuídas
      const assignedTagNames = assignedTags.map(t => t['oreino360-tags'].name);
      console.log('Nomes das tags atribuídas:', assignedTagNames);
      console.log('Tags esperadas:', expectedTags);
      
      const hasAllExpectedTags = expectedTags.every(expectedTag => 
        assignedTagNames.includes(expectedTag)
      );
      
      if (hasAllExpectedTags) {
        console.log('✅ Todas as tags esperadas foram atribuídas!');
        return true;
      } else {
        console.log('❌ Nem todas as tags esperadas foram atribuídas');
        const missingTags = expectedTags.filter(tag => !assignedTagNames.includes(tag));
        console.log('Tags faltando:', missingTags);
        return false;
      }
    } else {
      console.log('✅ Evento processado com sucesso (não é lead_submit)');
      return true;
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 INICIANDO TESTES DE CENÁRIOS DE TAGS');
  
  const timestamp = Date.now();
  let passedTests = 0;
  let totalTests = 0;

  // CENÁRIO 1: Lead Desqualificado (abandono na página inicial)
  totalTests++;
  const test1 = await testTagScenario(
    'Lead Desqualificado - Abandono Página Inicial',
    {
      traffic_id: `test-desqualificado-${timestamp}`,
      event_type: 'page_view',
      timestamp: new Date().toISOString(),
      url: 'https://exemplo.com',
      produto: 'tbz',
      tipo_de_funil: 'Quiz',
      utm_source: 'facebook',
      // Não tem quiz_started = true, então é abandono inicial
    },
    [] // Page view não gera lead, então não esperamos tags
  );
  if (test1) passedTests++;

  // CENÁRIO 2: Abandono em Pergunta Específica
  totalTests++;
  const test2 = await testTagScenario(
    'Abandono Pergunta 5',
    {
      traffic_id: `test-abandono-p5-${timestamp}`,
      event_type: 'quiz_abandoned',
      timestamp: new Date().toISOString(),
      url: 'https://exemplo.com/quiz',
      produto: 'tbz',
      tipo_de_funil: 'Quiz',
      utm_source: 'instagram',
      current_question: 5
    },
    [] // Quiz abandoned não gera lead, então não esperamos tags
  );
  if (test2) passedTests++;

  // CENÁRIO 3: Lead Qualificado (completou quiz e fez cadastro)
  totalTests++;
  const test3 = await testTagScenario(
    'Lead Qualificado - Completou Quiz',
    {
      traffic_id: `test-qualificado-${timestamp}`,
      event_type: 'lead_submit',
      timestamp: new Date().toISOString(),
      url: 'https://exemplo.com/quiz-complete',
      produto: 'tbz',
      tipo_de_funil: 'Quiz',
      utm_source: 'google',
      nome: 'João Teste Qualificado',
      email: `joao.qualificado.${timestamp}@teste.com`,
      telefone: '11999999999'
    },
    ['Lead Qualificado', 'GOOGLE_LEAD', 'TBZ_INTERESSADO']
  );
  if (test3) passedTests++;

  // CENÁRIO 4: Checkout Iniciado
  totalTests++;
  const test4 = await testTagScenario(
    'Checkout Iniciado',
    {
      traffic_id: `test-checkout-${timestamp}`,
      event_type: 'checkout_click',
      timestamp: new Date().toISOString(),
      url: 'https://exemplo.com/checkout',
      produto: 'tbz',
      tipo_de_funil: 'Quiz',
      utm_source: 'facebook',
      nome: 'Maria Teste Checkout',
      email: `maria.checkout.${timestamp}@teste.com`,
      telefone: '11888888888'
    },
    [] // Checkout click não é lead_submit, então não gera lead
  );
  if (test4) passedTests++;

  // CENÁRIO 5: Lead Qualificado + Checkout (simulando fluxo completo)
  totalTests++;
  const leadEmail = `fluxo.completo.${timestamp}@teste.com`;
  
  // Primeiro: Lead submit (qualificado)
  const test5a = await testTagScenario(
    'Fluxo Completo - Lead Submit',
    {
      traffic_id: `test-fluxo-${timestamp}`,
      event_type: 'lead_submit',
      timestamp: new Date().toISOString(),
      url: 'https://exemplo.com/quiz-complete',
      produto: 'tbz',
      tipo_de_funil: 'Quiz',
      utm_source: 'instagram',
      nome: 'Ana Teste Fluxo',
      email: leadEmail,
      telefone: '11777777777'
    },
    ['Lead Qualificado', 'INSTAGRAM_LEAD', 'TBZ_INTERESSADO']
  );

  // Aguardar um pouco antes do próximo evento
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Segundo: Checkout iniciado (mesmo lead)
  const test5b = await testTagScenario(
    'Fluxo Completo - Checkout Click',
    {
      traffic_id: `test-fluxo-checkout-${timestamp}`,
      event_type: 'checkout_started',
      timestamp: new Date().toISOString(),
      url: 'https://exemplo.com/checkout',
      produto: 'tbz',
      tipo_de_funil: 'Quiz',
      utm_source: 'instagram',
      nome: 'Ana Teste Fluxo',
      email: leadEmail,
      telefone: '11777777777'
    },
    ['Checkout Iniciado', 'INSTAGRAM_LEAD', 'TBZ_INTERESSADO']
  );

  if (test5a && test5b) passedTests++;

  // RESUMO DOS TESTES
  console.log('\n' + '='.repeat(50));
  console.log('📊 RESUMO DOS TESTES DE TAGS');
  console.log('='.repeat(50));
  console.log(`✅ Testes aprovados: ${passedTests}/${totalTests}`);
  console.log(`❌ Testes falharam: ${totalTests - passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('🎉 TODOS OS TESTES PASSARAM! Sistema de tags funcionando perfeitamente.');
  } else {
    console.log('⚠️  Alguns testes falharam. Verifique os logs acima para detalhes.');
  }
  
  console.log('='.repeat(50));
}

// Executar os testes
runAllTests().catch(console.error);