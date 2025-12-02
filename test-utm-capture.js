// Script de teste para verificar a captura de parâmetros UTM
// Este script simula requisições com parâmetros UTM para testar se estão sendo capturados corretamente

const SUPABASE_URL = 'https://ynxsksgttbzxooixgqzf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHNrc2d0dGJ6eG9vaXhncXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTU4ODAsImV4cCI6MjA3NDM5MTg4MH0.PTAaE9WV6gjpDwlQuRY_HZjI-k5BCZ5yoyIjSSiSfIg';

// Função para testar a captura de UTM via public-endpoint
async function testUTMCapture() {
  console.log('🧪 Iniciando teste de captura de UTM...\n');

  // Teste 1: Enviar utm_source e utm_medium via POST
  console.log('📤 Teste 1: Enviando utm_source e utm_medium via POST');
  try {
    const response1 = await fetch(`${SUPABASE_URL}/functions/v1/public-endpoint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        session_id: crypto.randomUUID(),
        event_type: 'page_view',
        produto: 'Quiz TBZ',
        utm_source: 'facebook',
        utm_medium: '@teste_instagram',
        event_data: {
          page: '/quiz',
          title: 'Quiz Test Page'
        }
      })
    });

    const result1 = await response1.text();
    console.log(`Status: ${response1.status}`);
    console.log(`Response: ${result1}\n`);
  } catch (error) {
    console.error('Erro no Teste 1:', error.message, '\n');
  }

  // Teste 2: Enviar fonte_de_trafego e traffic_id (campos antigos) via POST
console.log('📤 Teste 2: Enviando fonte_de_trafego e traffic_id via POST');
  try {
    const response2 = await fetch(`${SUPABASE_URL}/functions/v1/public-endpoint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        session_id: crypto.randomUUID(),
        event_type: 'page_view',
        produto: 'Quiz TBZ',
        fonte_de_trafego: 'instagram',
        traffic_id: '@teste_instagram_old',
        event_data: {
          page: '/quiz',
          title: 'Quiz Test Page Old Format'
        }
      })
    });

    const result2 = await response2.text();
    console.log(`Status: ${response2.status}`);
    console.log(`Response: ${result2}\n`);
  } catch (error) {
    console.error('Erro no Teste 2:', error.message, '\n');
  }

  // Teste 3: Enviar utm_source e utm_medium via GET
  console.log('📤 Teste 3: Enviando utm_source e utm_medium via GET');
  try {
    const sessionId = crypto.randomUUID();
    const getUrl = `${SUPABASE_URL}/functions/v1/public-endpoint?session_id=${sessionId}&event_type=page_view&produto=Quiz%20TBZ&utm_source=google&utm_medium=@teste_instagram_get&page=/quiz&title=Quiz%20Test%20Page%20GET`;
    
    const response3 = await fetch(getUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      }
    });

    const result3 = await response3.text();
    console.log(`Status: ${response3.status}`);
    console.log(`Response: ${result3}\n`);
  } catch (error) {
    console.error('Erro no Teste 3:', error.message, '\n');
  }

  // Teste 4: Testar track-event com utm_source e utm_medium
  console.log('📤 Teste 4: Enviando para track-event com utm_source e utm_medium');
  try {
    const response4 = await fetch(`${SUPABASE_URL}/functions/v1/track-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        event_type: 'lead_submit',
        name: 'João Teste UTM',
        email: 'joao.teste.utm@example.com',
        phone: '11999999999',
        produto: 'Quiz TBZ',
        session_id: crypto.randomUUID(),
        utm_source: 'tiktok',
        utm_medium: '@teste_tiktok',
        diagnosisLevel: 'Iniciante'
      })
    });

    const result4 = await response4.text();
    console.log(`Status: ${response4.status}`);
    console.log(`Response: ${result4}\n`);
  } catch (error) {
    console.error('Erro no Teste 4:', error.message, '\n');
  }

  // Teste 5: Testar track-abandonment com utm_source e utm_medium
  console.log('📤 Teste 5: Enviando para track-abandonment com utm_source e utm_medium');
  try {
    const response5 = await fetch(`${SUPABASE_URL}/functions/v1/track-abandonment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        session_id: crypto.randomUUID(),
        reason: 'user_closed_tab',
        step_where_abandoned: 'question_3',
        produto: 'Quiz TBZ',
        utm_source: 'youtube',
        utm_medium: '@teste_youtube',
        email: 'abandono.teste.utm@example.com'
      })
    });

    const result5 = await response5.text();
    console.log(`Status: ${response5.status}`);
    console.log(`Response: ${result5}\n`);
  } catch (error) {
    console.error('Erro no Teste 5:', error.message, '\n');
  }

  console.log('✅ Testes de captura de UTM concluídos!');
  console.log('📋 Verifique os logs das Edge Functions e o banco de dados para confirmar se os dados UTM foram salvos corretamente.');
}

// Executar os testes
testUTMCapture().catch(console.error);