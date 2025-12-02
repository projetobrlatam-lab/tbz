const SUPABASE_URL = 'https://ynxsksgttbzxooixgqzf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHNrc2d0dGJ6eG9vaXhncXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTU4ODAsImV4cCI6MjA3NDM5MTg4MH0.PTAaE9WV6gjpDwlQuRY_HZjI-k5BCZ5yoyIjSSiSfIg';

async function testLeadWithLogs() {
    console.log('🧪 Testando lead com logs detalhados...\n');
    
    const uniqueId = Date.now();
    const testEmail = `test-${uniqueId}@example.com`;
    
    const payload = {
        event_type: 'lead_submit',
        traffic_id: `traffic-${uniqueId}`,
        session_id: `session-${uniqueId}`,
        fingerprint: `fp-${uniqueId}`,
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ip: '192.168.1.100',
        url: 'https://example.com/quiz',
        referrer: 'https://google.com',
        utm_source: 'test',
        utm_medium: 'debug',
        utm_campaign: 'lead-test',
        lead_data: {
            email: testEmail,
            name: `Test User ${uniqueId}`,
            phone: '+5511999999999',
            quiz_answers: {
                q1: 'answer1',
                q2: 'answer2'
            }
        }
    };
    
    console.log('📤 Enviando payload:', JSON.stringify(payload, null, 2));
    
    try {
        // Enviar evento
        const response = await fetch(`${SUPABASE_URL}/functions/v1/track-main`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify(payload)
        });
        
        const responseText = await response.text();
        console.log('\n📥 Resposta da API:');
        console.log('Status:', response.status);
        console.log('Headers:', Object.fromEntries(response.headers.entries()));
        console.log('Body:', responseText);
        
        // Aguardar um pouco para processamento
        console.log('\n⏳ Aguardando 3 segundos para processamento...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Verificar se o lead foi inserido
        console.log('\n🔍 Verificando se o lead foi inserido no banco...');
        const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/oreino360-leads?email=eq.${testEmail}`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        const leads = await checkResponse.json();
        console.log('Leads encontrados:', leads);
        
        if (leads && leads.length > 0) {
            console.log('✅ Lead encontrado no banco!');
        } else {
            console.log('❌ Lead NÃO encontrado no banco');
        }
        
        // Verificar eventos na tabela de eventos
        console.log('\n🔍 Verificando eventos na tabela oreino360-eventos...');
        const eventsResponse = await fetch(`${SUPABASE_URL}/rest/v1/oreino360-eventos?session_id=eq.${payload.session_id}`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        const events = await eventsResponse.json();
        console.log('Eventos encontrados:', events);
        
    } catch (error) {
        console.error('❌ Erro no teste:', error);
    }
}

testLeadWithLogs();