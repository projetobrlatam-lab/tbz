
const SUPABASE_URL = 'https://awqqqkqvzlggczcoawvi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3cXFxa3F2emxnZ2N6Y29hd3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODE1MTEsImV4cCI6MjA4MDI1NzUxMX0.9e0KXWDZWc0UBr5clyf_bhl0rWEAMYDhXVn0ZwGFqWM';

async function testCleanIp() {
    console.log('🧪 Testando limpeza de dados por IP...\n');

    const testIp = '192.0.2.255'; // TEST-NET-3 IP (Safe)
    const testFp = 'test_clean_fp_' + Date.now();

    try {
        // 1. Criar dados de teste (Sessão, Evento, Identificador)
        const rpcPayload = {
            p_session_id: 'test-clean-session-' + Date.now(),
            p_event_type: 'visit',
            p_event_data: {},
            p_produto: 'tbz',
            p_fonte_de_trafego: 'test',
            p_tipo_de_funil: 'test',
            p_traffic_id: null,
            p_fingerprint_hash: testFp,
            p_user_agent: 'TestAgent/1.0',
            p_ip: testIp,
            p_url: 'http://localhost/test-clean',
            p_referrer: null
        };

        console.log('1️⃣ Criando dados de teste...');
        const createResp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/track_event_v2`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY,
                'Content-Profile': 'tbz'
            },
            body: JSON.stringify(rpcPayload)
        });

        if (!createResp.ok) throw new Error('Falha ao criar dados de teste');
        const createResult = await createResp.json();
        console.log('✅ Dados criados. Session UUID:', createResult.session_uuid);

        // 2. Verificar que dados existem
        const sessionId = createResult.session_uuid;
        const checkResp = await fetch(`${SUPABASE_URL}/rest/v1/sessoes?id=eq.${sessionId}`, {
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Profile': 'tbz', 'Accept-Profile': 'tbz' }
        });
        const checkData = await checkResp.json();
        if (checkData.length === 0) throw new Error('Dados de teste não encontrados antes da limpeza');
        console.log('✅ Dados confirmados no banco.');

        // 3. Executar limpeza
        console.log(`\n2️⃣ Executando clean_data_by_ip para IP: ${testIp}...`);
        const cleanResp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/clean_data_by_ip`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY,
                'Content-Profile': 'tbz'
            },
            body: JSON.stringify({ p_ip_address: testIp })
        });

        if (!cleanResp.ok) {
            const errText = await cleanResp.text();
            throw new Error(`Falha na limpeza: ${errText}`);
        }
        console.log('✅ RPC de limpeza executada com sucesso.');

        // 4. Verificar remoção
        console.log('\n3️⃣ Verificando se os dados foram removidos...');
        const verifyResp = await fetch(`${SUPABASE_URL}/rest/v1/sessoes?id=eq.${sessionId}`, {
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Profile': 'tbz', 'Accept-Profile': 'tbz' }
        });
        const verifyData = await verifyResp.json();

        if (verifyData.length === 0) {
            console.log('🎉 SUCESSO: Sessão removida corretamente!');
        } else {
            console.error('❌ FALHA: Sessão AINDA existe no banco.', verifyData);
        }

        // Verificar identificador
        const checkIdent = await fetch(`${SUPABASE_URL}/rest/v1/identificador?fingerprint_hash=eq.${testFp}`, {
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Profile': 'tbz', 'Accept-Profile': 'tbz' }
        });
        const identData = await checkIdent.json();
        if (identData.length === 0) {
            console.log('🎉 SUCESSO: Identificador removido corretamente!');
        } else {
            console.error('❌ FALHA: Identificador AINDA existe.', identData);
        }

    } catch (error) {
        console.error('❌ Erro:', error);
    }
}

testCleanIp();
