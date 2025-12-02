const SUPABASE_URL = 'https://ynxsksgttbzxooixgqzf.supabase.co/functions/v1/public-endpoint';

async function testScenario(scenarioName, description, payload, shouldCreateLead, shouldBeValid = null) {
  console.log(`\n🧪 Testando: ${scenarioName}`);
  console.log(`📝 Descrição: ${description}`);
  console.log(`📋 Payload:`, JSON.stringify(payload, null, 2));
  
  try {
    const response = await fetch(SUPABASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    console.log(`📊 Status: ${response.status}`);
    
    if (!response.ok) {
      console.log(`❌ ERRO: Resposta não OK - ${response.status}`);
      const errorText = await response.text();
      console.log(`📄 Erro:`, errorText);
      return false;
    }
    
    const result = await response.json();
    console.log(`📄 Resposta:`, JSON.stringify(result, null, 2));
    
    const leadWasCreated = result.leadId !== null && result.leadId !== undefined;
    
    if (shouldCreateLead && leadWasCreated) {
      console.log(`✅ CORRETO: Lead foi criado como esperado (ID: ${result.leadId})`);
      if (shouldBeValid !== null) {
        console.log(`🔍 Lead deve ser ${shouldBeValid ? 'VÁLIDO' : 'INVÁLIDO'}`);
        
        // Verificar se o lead foi criado com o status correto
        if (result.leadId) {
          await checkLeadValidity(result.leadId, shouldBeValid);
        }
      }
      return true;
    } else if (!shouldCreateLead && !leadWasCreated) {
      console.log(`✅ CORRETO: Lead não foi criado como esperado`);
      return true;
    } else if (shouldCreateLead && !leadWasCreated) {
      console.log(`❌ ERRO: Lead deveria ter sido criado mas não foi!`);
      return false;
    } else if (!shouldCreateLead && leadWasCreated) {
      console.log(`❌ ERRO: Lead não deveria ter sido criado mas foi! (ID: ${result.leadId})`);
      return false;
    }
    
  } catch (error) {
    console.log(`❌ ERRO na requisição:`, error.message);
    return false;
  }
}

async function checkLeadValidity(leadId, expectedValidity) {
  try {
    // Fazer uma consulta para verificar o status is_valid_lead
    const checkResponse = await fetch(`https://ynxsksgttbzxooixgqzf.supabase.co/rest/v1/oreino360-leads?id=eq.${leadId}&select=is_valid_lead`, {
      method: 'GET',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHNrc2d0dGJ6eG9vaXhncXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTU4ODAsImV4cCI6MjA3NDM5MTg4MH0.PTAaE9WV6gjpDwlQuRY_HZjI-k5BCZ5yoyIjSSiSfIg',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHNrc2d0dGJ6eG9vaXhncXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTU4ODAsImV4cCI6MjA3NDM5MTg4MH0.PTAaE9WV6gjpDwlQuRY_HZjI-k5BCZ5yoyIjSSiSfIg'
      }
    });
    
    if (checkResponse.ok) {
      const leadData = await checkResponse.json();
      console.log(`🔍 Dados do lead:`, JSON.stringify(leadData, null, 2));
      
      if (leadData.length > 0) {
        const isValid = leadData[0].is_valid_lead;
        if (isValid === expectedValidity) {
          console.log(`✅ VALIDAÇÃO CORRETA: Lead é ${isValid ? 'VÁLIDO' : 'INVÁLIDO'} como esperado`);
        } else {
          console.log(`❌ VALIDAÇÃO INCORRETA: Lead é ${isValid ? 'VÁLIDO' : 'INVÁLIDO'}, mas deveria ser ${expectedValidity ? 'VÁLIDO' : 'INVÁLIDO'}`);
        }
      } else {
        console.log(`❌ ERRO: Lead não encontrado no banco de dados`);
      }
    } else {
      console.log(`❌ ERRO ao verificar validade do lead: ${checkResponse.status}`);
    }
  } catch (error) {
    console.log(`❌ ERRO ao verificar validade do lead:`, error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Iniciando testes detalhados da função public-endpoint...\n');
  
  const testScenarios = [
    {
      name: "Cenário 1: Apenas traffic_id (NÃO deve criar lead)",
      description: "Apenas traffic_id sem dados do formulário - não deve criar lead",
      payload: {
        produto: "tbz",
        tipo_de_funil: "quiz",
        utm_medium: "test_traffic_only_" + Date.now(),
        utm_source: "test_source",
        page_url: "https://test.com"
      },
      shouldCreateLead: false
    },
    {
      name: "Cenário 2: Dados parciais do formulário (deve criar lead INVÁLIDO)",
      description: "Dados parciais (só nome) - deve criar lead inválido",
      payload: {
        produto: "tbz",
        tipo_de_funil: "quiz",
        utm_medium: "test_partial_" + Date.now(),
        utm_source: "test_source",
        name: "João Teste",
        page_url: "https://test.com"
      },
      shouldCreateLead: true,
      shouldBeValid: false
    },
    {
      name: "Cenário 3: Dados completos do formulário (deve criar lead VÁLIDO)",
      description: "Dados completos - deve criar lead válido",
      payload: {
        produto: "tbz",
        tipo_de_funil: "quiz",
        utm_medium: "test_complete_" + Date.now(),
        utm_source: "test_source",
        name: "Maria Completa",
        email: "maria@teste.com",
        phone: "(11) 99999-9999",
        page_url: "https://test.com"
      },
      shouldCreateLead: true,
      shouldBeValid: true
    },
    {
      name: "Cenário 4: Apenas email (deve criar lead INVÁLIDO)",
      description: "Apenas email - deve criar lead inválido",
      payload: {
        produto: "tbz",
        tipo_de_funil: "quiz",
        utm_medium: "test_email_only_" + Date.now(),
        utm_source: "test_source",
        email: "email@teste.com",
        page_url: "https://test.com"
      },
      shouldCreateLead: true,
      shouldBeValid: false
    },
    {
      name: "Cenário 5: Nome + Email (deve criar lead INVÁLIDO)",
      description: "Nome e email mas sem telefone - deve criar lead inválido",
      payload: {
        produto: "tbz",
        tipo_de_funil: "quiz",
        utm_medium: "test_name_email_" + Date.now(),
        utm_source: "test_source",
        name: "Pedro Parcial",
        email: "pedro@teste.com",
        page_url: "https://test.com"
      },
      shouldCreateLead: true,
      shouldBeValid: false
    }
  ];
  
  const results = [];
  
  for (const scenario of testScenarios) {
    const result = await testScenario(
      scenario.name,
      scenario.description,
      scenario.payload,
      scenario.shouldCreateLead,
      scenario.shouldBeValid
    );
    results.push({ scenario: scenario.name, success: result });
    
    // Aguardar um pouco entre os testes
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Resumo dos resultados
  console.log('\n📊 RESUMO DOS TESTES:');
  console.log('='.repeat(50));
  
  let passedTests = 0;
  results.forEach(result => {
    const status = result.success ? '✅ PASSOU' : '❌ FALHOU';
    console.log(`${status} - ${result.scenario}`);
    if (result.success) passedTests++;
  });
  
  console.log(`\n🎯 Resultado final: ${passedTests}/${results.length} testes passaram`);
  
  if (passedTests === results.length) {
    console.log('🎉 TODOS OS TESTES PASSARAM! A correção está funcionando corretamente.');
  } else {
    console.log('⚠️ Alguns testes falharam. Verifique os logs acima para mais detalhes.');
  }
}

// Executar os testes
runAllTests().catch(console.error);