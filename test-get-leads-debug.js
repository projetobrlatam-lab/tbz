// Teste específico para debugar get-leads-with-tags
const testGetLeads = async () => {
  console.log('🧪 Testando função get-leads-with-tags...');

  try {
    const response = await fetch('https://ynxsksgttbzxooixgqzf.supabase.co/functions/v1/get-leads-with-tags?date_filter=all', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHNrc2d0dGJ6eG9vaXhncXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTU4ODAsImV4cCI6MjA3NDM5MTg4MH0.PTAaE9WV6gjpDwlQuRY_HZjI-k5BCZ5yoyIjSSiSfIg'
      }
    });

    console.log('📈 Status da resposta:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Sucesso! Resultado:', JSON.stringify(result, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ Erro na resposta:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
};

// Executar o teste
testGetLeads();