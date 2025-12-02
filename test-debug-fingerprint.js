import crypto from 'crypto';

// Função para calcular fingerprint_hash (mesma lógica do track-main)
function computeFingerprintHash(ip, userAgent, language, referer, utmSource, utmMedium, utmCampaign, utmTerm, utmContent) {
  const parts = [
    ip || '',
    userAgent || '',
    language || '',
    referer || '',
    utmSource || '',
    utmMedium || '',
    utmCampaign || '',
    utmTerm || '',
    utmContent || ''
  ];
  
  const combined = parts.join('|');
  return crypto.createHash('sha256').update(combined).digest('hex');
}

async function testFingerprintConsistency() {
  console.log('🔍 Testando consistência do fingerprint_hash...\n');

  // Dados fixos para garantir mesmo fingerprint
  const fixedData = {
    ip: '127.0.0.1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    language: 'pt-BR',
    referer: 'https://quiz.oreino360.com.br/',
    utmSource: 'instagram',
    utmMedium: 'social',
    utmCampaign: 'quiz-tbz',
    utmTerm: '',
    utmContent: ''
  };

  // Calcular fingerprint_hash
  const fingerprintHash = computeFingerprintHash(
    fixedData.ip,
    fixedData.userAgent,
    fixedData.language,
    fixedData.referer,
    fixedData.utmSource,
    fixedData.utmMedium,
    fixedData.utmCampaign,
    fixedData.utmTerm,
    fixedData.utmContent
  );

  console.log('📊 Fingerprint Hash calculado:', fingerprintHash);

  const sessionId = `session_${Date.now()}`;
  const timestamp = Date.now();
  const email = `debug.fingerprint.${timestamp}@email.com`;

  // 1. Enviar PAGE_VIEW primeiro
  console.log('\n1️⃣ Enviando PAGE_VIEW...');
  
  const pageViewPayload = {
    session_id: sessionId,
    event_type: 'page_view',
    event_data: {
      page: '/quiz',
      utm_source: fixedData.utmSource,
      utm_medium: fixedData.utmMedium,
      utm_campaign: fixedData.utmCampaign,
      utm_term: fixedData.utmTerm,
      utm_content: fixedData.utmContent,
      referer: fixedData.referer
    },
    produto: 'tbz',
    tipo_de_funil: 'quiz',
    traffic_id: 'social',
    fonte_de_trafego: 'instagram',
    isAnonymous: true
  };

  try {
    const pageViewResponse = await fetch('https://ynxsksgttbzxooixgqzf.supabase.co/functions/v1/track-main', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': fixedData.userAgent,
        'Accept-Language': fixedData.language,
        'Referer': fixedData.referer,
        'X-Forwarded-For': fixedData.ip
      },
      body: JSON.stringify(pageViewPayload)
    });

    const pageViewResult = await pageViewResponse.json();
    console.log('✅ PAGE_VIEW Status:', pageViewResponse.status);
    console.log('📄 PAGE_VIEW Response:', JSON.stringify(pageViewResult, null, 2));

    // Aguardar um pouco
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 2. Enviar LEAD_SUBMIT
    console.log('\n2️⃣ Enviando LEAD_SUBMIT...');
    
    const leadSubmitPayload = {
      session_id: sessionId,
      event_type: 'LEAD_SUBMIT',
      event_data: {
        name: `Debug Fingerprint ${timestamp}`,
        email: email,
        phone: '11987654321',
        urgency_level: 'ALTA',
        utm_source: fixedData.utmSource,
        utm_medium: fixedData.utmMedium,
        utm_campaign: fixedData.utmCampaign,
        utm_term: fixedData.utmTerm,
        utm_content: fixedData.utmContent,
        referer: fixedData.referer
      },
      produto: 'tbz',
      tipo_de_funil: 'quiz',
      traffic_id: 'social',
      fonte_de_trafego: 'instagram',
      isAnonymous: false
    };

    const leadSubmitResponse = await fetch('https://ynxsksgttbzxooixgqzf.supabase.co/functions/v1/track-main', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': fixedData.userAgent,
        'Accept-Language': fixedData.language,
        'Referer': fixedData.referer,
        'X-Forwarded-For': fixedData.ip
      },
      body: JSON.stringify(leadSubmitPayload)
    });

    const leadSubmitResult = await leadSubmitResponse.json();
    console.log('✅ LEAD_SUBMIT Status:', leadSubmitResponse.status);
    console.log('📄 LEAD_SUBMIT Response:', JSON.stringify(leadSubmitResult, null, 2));

    // 3. Verificar se o identificador foi criado
    console.log('\n3️⃣ Verificando identificador na tabela...');
    console.log(`Query para verificar: SELECT * FROM "oreino360-identificador" WHERE fingerprint_hash = '${fingerprintHash}';`);

    // 4. Verificar se o lead foi criado
    console.log('\n4️⃣ Verificando lead na tabela...');
    console.log(`Query para verificar: SELECT * FROM "oreino360-leads" WHERE email = '${email}';`);

    console.log('\n🎯 Resumo do teste:');
    console.log('- Fingerprint Hash esperado:', fingerprintHash);
    console.log('- Session ID:', sessionId);
    console.log('- Email do lead:', email);
    console.log('- Ambas as requisições usaram exatamente os mesmos headers e dados');

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testFingerprintConsistency();