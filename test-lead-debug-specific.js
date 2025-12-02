import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ynxsksgttbzxooixgqzf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHNrc2d0dGJ6eG9vaXhncXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTU4ODAsImV4cCI6MjA3NDM5MTg4MH0.PTAaE9WV6gjpDwlQuRY_HZjI-k5BCZ5yoyIjSSiSfIg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testLeadProcessing() {
  console.log('=== TESTE DE PROCESSAMENTO DE LEAD ESPECÍFICO ===');
  
  const uniqueId = Date.now();
  const testData = {
    session_id: `session-${uniqueId}`,
    event_type: 'lead_submit',
    traffic_id: `traffic-${uniqueId}`,
    name: `Test User ${uniqueId}`,
    email: `test${uniqueId}@example.com`,
    phone: `+55119${uniqueId.toString().slice(-8)}`,
    produto: 'tbz',
    tipo_de_funil: 'quiz',
    utm_source: 'test',
    utm_medium: 'test'
  };

  console.log('Dados do teste:', JSON.stringify(testData, null, 2));

  try {
    // 1. Enviar requisição para a API
    console.log('\n1. Enviando requisição para track-main...');
    const response = await fetch(`${SUPABASE_URL}/functions/v1/track-main`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(testData)
    });

    const responseData = await response.json();
    console.log('Status da resposta:', response.status);
    console.log('Dados da resposta:', JSON.stringify(responseData, null, 2));

    // 2. Verificar se o lead foi inserido na tabela oreino360-leads
    console.log('\n2. Verificando lead na tabela oreino360-leads...');
    const { data: leadData, error: leadError } = await supabase
      .from('oreino360-leads')
      .select('*')
      .or(`traffic_id.eq.${testData.traffic_id},email.eq.${testData.email}`)
      .order('created_at', { ascending: false })
      .limit(1);

    if (leadError) {
      console.error('Erro ao buscar lead:', leadError);
    } else {
      console.log('Lead encontrado:', leadData);
    }

    // 3. Verificar se o evento foi inserido na tabela oreino360-eventos
    console.log('\n3. Verificando evento na tabela oreino360-eventos...');
    const { data: eventData, error: eventError } = await supabase
      .from('oreino360-eventos')
      .select('*')
      .eq('event_type', 'lead_submit')
      .order('created_at', { ascending: false })
      .limit(5);

    if (eventError) {
      console.error('Erro ao buscar evento:', eventError);
    } else {
      console.log('Eventos recentes encontrados:', eventData);
    }

    // 4. Verificar se a sessão foi criada
    console.log('\n4. Verificando sessão na tabela oreino360-sessoes...');
    const { data: sessionData, error: sessionError } = await supabase
      .from('oreino360-sessoes')
      .select('*')
      .eq('session_id', testData.session_id)
      .maybeSingle();

    if (sessionError) {
      console.error('Erro ao buscar sessão:', sessionError);
    } else {
      console.log('Sessão encontrada:', sessionData);
    }

    // 5. Análise dos resultados
    console.log('\n=== ANÁLISE DOS RESULTADOS ===');
    console.log('API Response Status:', response.status);
    console.log('API Response Success:', responseData.success);
    console.log('Lead inserido:', leadData && leadData.length > 0 ? 'SIM' : 'NÃO');
    console.log('Evento inserido:', eventData && eventData.length > 0 ? 'SIM' : 'NÃO');
    console.log('Sessão criada:', sessionData ? 'SIM' : 'NÃO');

    if (response.status === 200 && responseData.success && (!leadData || leadData.length === 0)) {
      console.log('\n⚠️ PROBLEMA IDENTIFICADO: API retorna sucesso mas lead não é inserido!');
      console.log('Possíveis causas:');
      console.log('- Erro silencioso na inserção do lead');
      console.log('- Condição de validação falhando');
      console.log('- Problema com session_id não sendo UUID válido');
      console.log('- Erro na lógica de upsert');
    }

  } catch (error) {
    console.error('Erro no teste:', error);
  }
}

testLeadProcessing();