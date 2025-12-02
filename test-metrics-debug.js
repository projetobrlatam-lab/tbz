import fetch from 'node-fetch';

const testMetrics = async () => {
  try {
    console.log('🔍 Testando endpoint de métricas...');
    
    const response = await fetch('https://ynxsksgttbzxooixgqzf.supabase.co/functions/v1/get-metrics?date_filter=all', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHNrc2d0dGJ6eG9vaXhncXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTU4ODAsImV4cCI6MjA3NDM5MTg4MH0.PTAaE9WV6gjpDwlQuRY_HZjI-k5BCZ5yoyIjSSiSfIg'
      }
    });

    console.log('📊 Status da resposta:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Métricas obtidas com sucesso!');
      console.log('📈 Dados das métricas:');
      console.log(`   - Total de visitas: ${result.total_visits || 0}`);
      console.log(`   - Total de quiz iniciados: ${result.total_quiz_starts || 0}`);
      console.log(`   - Total de leads: ${result.total_leads || 0}`);
      console.log(`   - Total de quiz completos: ${result.total_quiz_complete || 0}`);
      console.log(`   - Total de checkouts: ${result.total_checkout_starts || 0}`);
      console.log(`   - Total de vendas: ${result.total_sales || 0}`);
      console.log(`   - Valor total de vendas: ${result.total_sales_value || 0}`);
      
      console.log('\n🔍 Dados completos da resposta:');
      console.log(JSON.stringify(result, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ Erro na requisição de métricas:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste de métricas:', error);
  }
};

// Executar o teste
testMetrics();