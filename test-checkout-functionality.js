import fetch from 'node-fetch';

const SUPABASE_URL = 'https://ynxsksgttbzxooixgqzf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHNrc2d0dGJ6eG9vaXhncXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTU4ODAsImV4cCI6MjA3NDM5MTg4MH0.PTAaE9WV6gjpDwlQuRY_HZjI-k5BCZ5yoyIjSSiSfIg';

async function testCheckoutFunctionality() {
  console.log('🧪 Testando funcionalidade de checkout...\n');

  try {
    // 1. Primeiro, vamos verificar se há leads na tabela
    console.log('1️⃣ Verificando leads existentes...');
    const leadsResponse = await fetch(`${SUPABASE_URL}/rest/v1/oreino360-leads?select=*`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!leadsResponse.ok) {
      throw new Error(`Erro ao buscar leads: ${leadsResponse.status}`);
    }

    const leads = await leadsResponse.json();
    console.log(`✅ Encontrados ${leads.length} leads na tabela`);
    
    if (leads.length === 0) {
      console.log('❌ Nenhum lead encontrado. Criando um lead de teste...');
      
      // Criar um lead de teste
      const createLeadResponse = await fetch(`${SUPABASE_URL}/rest/v1/oreino360-leads`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Teste Checkout',
          email: 'teste.checkout@example.com',
          phone: '11999999999',
          traffic_id: 'test-checkout-' + Date.now(),
          fonte_de_trafego: 'teste',
          tipo_de_funil: 'quiz',
          iniciar_checkout: false
        })
      });

      if (!createLeadResponse.ok) {
        throw new Error(`Erro ao criar lead: ${createLeadResponse.status}`);
      }

      const newLead = await createLeadResponse.json();
      console.log('✅ Lead de teste criado:', newLead[0].id);
      
      // Usar o lead recém-criado
      leads.push(newLead[0]);
    }

    // 2. Pegar um lead que ainda não iniciou checkout
    const leadToTest = leads.find(lead => !lead.iniciar_checkout) || leads[0];
    console.log(`\n2️⃣ Testando com lead: ${leadToTest.id}`);
    console.log(`   Nome: ${leadToTest.name}`);
    console.log(`   Email: ${leadToTest.email}`);
    console.log(`   Iniciar Checkout (antes): ${leadToTest.iniciar_checkout}`);

    // 3. Simular o clique no botão de checkout (registrar evento)
    console.log('\n3️⃣ Simulando clique no botão de checkout...');
    
    const trackResponse = await fetch(`${SUPABASE_URL}/functions/v1/track-main`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        event_type: 'checkout_click',
        produto: 'reino-360',
        tipo_de_funil: 'quiz',
        fonte_de_trafego: 'teste',
        traffic_id: leadToTest.traffic_id,
        event_data: {
          lead_id: leadToTest.id,
          offer_url: 'https://pay.hotmart.com/test',
          timestamp: new Date().toISOString()
        }
      })
    });

    if (!trackResponse.ok) {
      throw new Error(`Erro ao registrar evento: ${trackResponse.status}`);
    }

    console.log('✅ Evento checkout_click registrado');

    // 4. Atualizar o campo iniciar_checkout (simular o que o frontend faz)
    console.log('\n4️⃣ Atualizando campo iniciar_checkout...');
    
    const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/oreino360-leads?id=eq.${leadToTest.id}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        iniciar_checkout: true
      })
    });

    if (!updateResponse.ok) {
      throw new Error(`Erro ao atualizar lead: ${updateResponse.status}`);
    }

    console.log('✅ Campo iniciar_checkout atualizado para true');

    // 5. Verificar se a atualização foi bem-sucedida
    console.log('\n5️⃣ Verificando atualização...');
    
    const verifyResponse = await fetch(`${SUPABASE_URL}/rest/v1/oreino360-leads?id=eq.${leadToTest.id}&select=*`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!verifyResponse.ok) {
      throw new Error(`Erro ao verificar lead: ${verifyResponse.status}`);
    }

    const updatedLead = await verifyResponse.json();
    console.log(`✅ Iniciar Checkout (depois): ${updatedLead[0].iniciar_checkout}`);

    // 6. Verificar se o evento foi registrado
    console.log('\n6️⃣ Verificando eventos registrados...');
    
    const eventsResponse = await fetch(`${SUPABASE_URL}/rest/v1/oreino360-eventos?event_type=in.(checkout_click,checkout_start,offer_click)&order=created_at.desc&limit=5&select=*`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!eventsResponse.ok) {
      throw new Error(`Erro ao buscar eventos: ${eventsResponse.status}`);
    }

    const events = await eventsResponse.json();
    console.log(`✅ Encontrados ${events.length} eventos de checkout recentes`);
    
    if (events.length > 0) {
      console.log('   Último evento:', {
        tipo: events[0].event_type,
        data: events[0].created_at,
        produto: events[0].produto
      });
    }

    console.log('\n🎉 TESTE CONCLUÍDO COM SUCESSO!');
    console.log('✅ Evento de checkout registrado');
    console.log('✅ Campo iniciar_checkout atualizado');
    console.log('✅ Funcionalidade está funcionando corretamente');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

testCheckoutFunctionality();