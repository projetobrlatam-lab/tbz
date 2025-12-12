

const SUPABASE_URL = 'https://awqqqkqvzlggczcoawvi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3cXFxa3F2emxnZ2N6Y29hd3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODE1MTEsImV4cCI6MjA4MDI1NzUxMX0.9e0KXWDZWc0UBr5clyf_bhl0rWEAMYDhXVn0ZwGFqWM';

async function testBotFiltering() {
    console.log('🧪 Testando filtro de robôs...\n');

    const botUserAgent = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
    const uniqueFP = 'bot_fp_' + Date.now();

    try {
        const rpcPayload = {
            p_session_id: 'bot-session-' + Date.now(),
            p_event_type: 'visit',
            p_event_data: {},
            p_produto: 'tbz',
            p_fonte_de_trafego: 'organic',
            p_tipo_de_funil: 'blog',
            p_traffic_id: null,
            p_fingerprint_hash: uniqueFP,
            p_user_agent: botUserAgent,
            p_ip: '66.249.66.1',
            p_url: 'http://localhost/test-bot',
            p_referrer: null
        };

        console.log(`1️⃣ Enviando evento com User-Agent de Bot: ${botUserAgent}`);
        const rpcResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/track_event_v2`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY,
                'Content-Profile': 'tbz'
            },
            body: JSON.stringify(rpcPayload)
        });

        if (!rpcResponse.ok) {
            const text = await rpcResponse.text();
            throw new Error(`Erro na RPC: ${rpcResponse.status} - ${text}`);
        }

        const rpcResult = await rpcResponse.json();
        console.log('✅ RPC executada:', rpcResult);

        if (rpcResult.is_bot === true) {
            console.log('✅ Sistema identificou corretamente como robô (is_bot: true)');
        } else {
            console.error('❌ FALHA: Sistema NÃO identificou como robô');
        }

        // Verificar tabela identificador (não deve ter o registro)
        console.log('\n2️⃣ Verificando tabela identificador (deve estar vazia para este FP)...');
        const identResponse = await fetch(`${SUPABASE_URL}/rest/v1/identificador?fingerprint_hash=eq.${uniqueFP}`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Content-Profile': 'tbz',
                'Accept-Profile': 'tbz'
            }
        });

        const identData = await identResponse.json();
        if (identData.length === 0) {
            console.log('✅ SUCESSO: Robô NÃO foi registrado na tabela identificador');
        } else {
            console.error('❌ FALHA: Robô FOI registrado na tabela identificador', identData);
        }

        // Verificar tabela visitas (deve ter o registro)
        // Verificar tabela visitas (deve ter o registro)
        console.log('\n3️⃣ Verificando tabela visitas (deve ter o registro)...');

        const sessionIdToCheck = rpcResult.session_uuid;
        if (!sessionIdToCheck) {
            throw new Error('RPC não retornou session_uuid');
        }

        console.log(`   Buscando visitas para session_id: ${sessionIdToCheck}`);

        const visitResponse = await fetch(`${SUPABASE_URL}/rest/v1/visitas?session_id=eq.${sessionIdToCheck}`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Content-Profile': 'tbz',
                'Accept-Profile': 'tbz'
            }
        });

        const visitData = await visitResponse.json();

        if (visitData.length > 0) {
            console.log('✅ SUCESSO: Visita foi registrada corretamente!');
            console.log('   Dados da visita:', visitData[0]);
        } else {
            console.error('❌ FALHA: Visita NÃO encontrada para a sessão.');
        }

    } catch (error) {
        console.error('❌ Erro no teste:', error);
    }
}

testBotFiltering();
