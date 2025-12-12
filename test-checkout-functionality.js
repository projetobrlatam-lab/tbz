

const SUPABASE_URL = 'https://awqqqkqvzlggczcoawvi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3cXFxa3F2emxnZ2N6Y29hd3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODE1MTEsImV4cCI6MjA4MDI1NzUxMX0.9e0KXWDZWc0UBr5clyf_bhl0rWEAMYDhXVn0ZwGFqWM';

async function testCheckoutFunctionality() {
  console.log('🧪 Testando funcionalidade de checkout...\n');

  try {
    // 1. Simular lead_submit via RPC para obter um lead_id válido
    console.log('1️⃣ Simulando lead_submit via RPC...');
    const uniqueEmail = `test.checkout.${Date.now()}@example.com`;
    const rpcPayload = {
      p_session_id: 'test-session-' + Date.now(),
      p_event_type: 'lead_submit',
      p_event_data: { name: 'Test User', email: uniqueEmail, phone: '11999999999' },
      p_produto: 'tbz',
      p_fonte_de_trafego: 'direct',
      p_tipo_de_funil: 'quiz',
      p_traffic_id: null,
      p_fingerprint_hash: 'test_fp_' + Date.now(),
      p_user_agent: 'node-test-script',
      p_ip: null,
      p_url: 'http://localhost/test',
      p_referrer: null,
      p_email: uniqueEmail,
      p_name: 'Test User',
      p_phone: '11999999999',
      p_urgency_level: 'high'
    };

    const rpcResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/track_event_v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Profile': 'tbz',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(rpcPayload)
    });

    if (!rpcResponse.ok) {
      throw new Error(`Erro na RPC track_event_v2: ${rpcResponse.status} - ${await rpcResponse.text()}`);
    }

    const rpcResult = await rpcResponse.json();
    console.log('✅ RPC executada com sucesso:', rpcResult);

    const leadId = rpcResult.lead_id;
    if (!leadId) {
      throw new Error('❌ RPC não retornou lead_id!');
    }
    console.log(`✅ lead_id recebido: ${leadId}`);

    // 2. Simular clique de oferta (checkout)
    console.log('\n2️⃣ Simulando oferta click (checkout)...');
    const offerPayload = {
      p_session_id: rpcPayload.p_session_id,
      p_event_type: 'offer_click',
      p_event_data: { leadId: leadId },
      p_produto: 'tbz',
      p_fonte_de_trafego: 'direct',
      p_tipo_de_funil: 'quiz',
      p_traffic_id: null,
      p_fingerprint_hash: rpcPayload.p_fingerprint_hash,
      p_user_agent: 'node-test-script'
    };

    await fetch(`${SUPABASE_URL}/rest/v1/rpc/track_event_v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Profile': 'tbz',
      },
      body: JSON.stringify(offerPayload)
    });
    console.log('✅ Evento offer_click enviado');


    // 3. Atualizar o flag checkout_initiated (simulando App.tsx)
    console.log('\n3️⃣ Atualizando campo checkout_initiated...');

    const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${leadId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Content-Profile': 'tbz',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        checkout_initiated: true
      })
    });

    if (!updateResponse.ok) {
      // Tentar ler o erro
      const text = await updateResponse.text();
      throw new Error(`Erro ao atualizar lead: ${updateResponse.status} - ${text}`);
    }

    console.log('✅ Campo checkout_initiated atualizado para true');


    // 4. Verificar se a atualização persistiu
    console.log('\n4️⃣ Verificando integridade dos dados...');

    const verifyResponse = await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${leadId}&select=*`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Content-Profile': 'tbz',
        'Accept-Profile': 'tbz'
      }
    });

    if (!verifyResponse.ok) {
      const text = await verifyResponse.text();
      throw new Error(`Erro ao buscar lead: ${verifyResponse.status} - ${text}`);
    }

    const verifyData = await verifyResponse.json();
    const lead = verifyData[0];

    console.log('📋 Dados do lead:', lead);

    if (lead.checkout_initiated === true) {
      console.log('🎉 SUCESSO: checkout_initiated está TRUE');
    } else {
      console.error('❌ FALHA: checkout_initiated não é true');
    }

  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
}

testCheckoutFunctionality();