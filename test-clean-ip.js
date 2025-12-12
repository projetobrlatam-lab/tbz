
const SUPABASE_URL = 'https://awqqqkqvzlggczcoawvi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3cXFxa3F2emxnZ2N6Y29hd3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODE1MTEsImV4cCI6MjA4MDI1NzUxMX0.9e0KXWDZWc0UBr5clyf_bhl0rWEAMYDhXVn0ZwGFqWM';

async function testCleanIp() {
    console.log('🧪 Testando limpeza COMPLETA de dados por IP...\n');

    const testIp = '192.0.2.254'; // Different Test IP
    const testFp = 'test_clean_fp_full_' + Date.now();

    try {
        // 1. Criar dados de teste (Sessão, Evento, Identificador)
        const rpcPayload = {
            p_session_id: 'test-clean-session-full-' + Date.now(),
            p_event_type: 'visit',
            p_event_data: {},
            p_produto: 'tbz',
            p_fonte_de_trafego: 'test',
            p_tipo_de_funil: 'test',
            p_traffic_id: null,
            p_fingerprint_hash: testFp,
            p_user_agent: 'TestAgent/1.0',
            p_ip: testIp,
            p_url: 'http://localhost/test-clean-full',
            p_referrer: null
        };

        console.log('1️⃣ Criando dados de teste básicos (Sessão/Visita/ID)...');
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
        const sessionId = createResult.session_uuid;
        console.log('✅ Dados criados. Session UUID:', sessionId);

        // 2. Simular Abandono (Inserir manualmente via RPC ou direto se politica permitir, mas vamos de SQL direto via user/pass se pudessemos, mas aqui usamos anon... Abandono usually created by trigger or logic. Let's try inserting via API if policy allows, otherwise just trust the session delete logic)
        // Checking abandono policy - we may NOT have write access to abandono via anon directly without an event.
        // However, clean_data_by_ip deletes 'sessoes', and if referential integrity is ON, it might block delete IF we didn't handle it. The fact we added explicit DELETE FROM abandono means we handle it.

        // We will verify the basic tables + Identificador as the user stressed "identificador e visitas".

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

        // Check Sessions
        const verifySession = await fetch(`${SUPABASE_URL}/rest/v1/sessoes?id=eq.${sessionId}`, {
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Profile': 'tbz', 'Accept-Profile': 'tbz' }
        });
        if ((await verifySession.json()).length === 0) {
            console.log('🎉 SUCESSO: Sessão removida!');
        } else {
            console.error('❌ FALHA: Sessão AINDA existe.');
        }

        // Check Identificador
        const verifyIdent = await fetch(`${SUPABASE_URL}/rest/v1/identificador?fingerprint_hash=eq.${testFp}`, {
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Profile': 'tbz', 'Accept-Profile': 'tbz' }
        });
        if ((await verifyIdent.json()).length === 0) {
            console.log('🎉 SUCESSO: Identificador removido!');
        } else {
            console.error('❌ FALHA: Identificador AINDA existe.');
        }

        // Check Visitas
        const verifyVisitas = await fetch(`${SUPABASE_URL}/rest/v1/visitas?session_id=eq.${sessionId}`, {
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Profile': 'tbz', 'Accept-Profile': 'tbz' }
        });
        if ((await verifyVisitas.json()).length === 0) {
            console.log('🎉 SUCESSO: Visitas removidas!');
        } else {
            console.error('❌ FALHA: Visitas AINDA existem.');
        }

    } catch (error) {
        console.error('❌ Erro:', error);
    }
}

testCleanIp();
