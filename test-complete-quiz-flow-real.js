const SUPABASE_URL = 'https://ynxsksgttbzxooixgqzf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHNrc2d0dGJ6eG9vaXhncXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTU4ODAsImV4cCI6MjA3NDM5MTg4MH0.PTAaE9WV6gjpDwlQuRY_HZjI-k5BCZ5yoyIjSSiSfIg';

// Simular um fluxo completo de quiz
async function testCompleteQuizFlow() {
    console.log('🚀 Iniciando teste do fluxo completo do quiz...\n');
    
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();
    
    // Simular UTM parameters como se viesse do Instagram
    const utmParams = {
        utm_source: 'instagram',
        utm_medium: 'social',
        utm_campaign: 'quiz_harmonia',
        utm_content: 'post_organico'
    };
    
    console.log('📊 Parâmetros UTM simulados:', utmParams);
    console.log('🆔 Session ID:', sessionId);
    console.log('');
    
    try {
        // 1. PAGE_VIEW - Entrada no quiz
        console.log('1️⃣ Enviando PAGE_VIEW...');
        const pageViewPayload = {
            session_id: sessionId,
            event_type: 'PAGE_VIEW',
            event_data: JSON.stringify({
                url: 'http://localhost:3001/',
                referrer: 'https://instagram.com',
                page_title: 'Quiz - Diagnóstico da Harmonia Conjugal',
                utm_source: utmParams.utm_source,
                utm_medium: utmParams.utm_medium,
                utm_campaign: utmParams.utm_campaign,
                utm_content: utmParams.utm_content
            }),
            produto: 'quiz-harmonia-conjugal',
            tipo_de_funil: 'quiz',
            traffic_id: utmParams.utm_medium,
            fonte_de_trafego: utmParams.utm_source,
            utm_source: utmParams.utm_source,
            utm_medium: utmParams.utm_medium,
            isAnonymous: true
        };
        
        const pageViewResponse = await fetch(`${SUPABASE_URL}/functions/v1/track-main`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify(pageViewPayload)
        });
        
        console.log('   Status:', pageViewResponse.status);
        if (pageViewResponse.ok) {
            const pageViewResult = await pageViewResponse.json();
            console.log('   ✅ PAGE_VIEW enviado com sucesso');
        } else {
            console.log('   ❌ Erro no PAGE_VIEW:', await pageViewResponse.text());
        }
        
        // Aguardar um pouco entre eventos
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 2. QUIZ_START - Início do quiz
        console.log('\n2️⃣ Enviando QUIZ_START...');
        const quizStartPayload = {
            session_id: sessionId,
            event_type: 'QUIZ_START',
            event_data: JSON.stringify({
                url: 'http://localhost:3001/',
                referrer: 'https://instagram.com',
                page_title: 'Quiz - Diagnóstico da Harmonia Conjugal',
                utm_source: utmParams.utm_source,
                utm_medium: utmParams.utm_medium
            }),
            produto: 'quiz-harmonia-conjugal',
            tipo_de_funil: 'quiz',
            traffic_id: utmParams.utm_medium,
            fonte_de_trafego: utmParams.utm_source,
            utm_source: utmParams.utm_source,
            utm_medium: utmParams.utm_medium,
            isAnonymous: true
        };
        
        const quizStartResponse = await fetch(`${SUPABASE_URL}/functions/v1/track-main`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify(quizStartPayload)
        });
        
        console.log('   Status:', quizStartResponse.status);
        if (quizStartResponse.ok) {
            console.log('   ✅ QUIZ_START enviado com sucesso');
        } else {
            console.log('   ❌ Erro no QUIZ_START:', await quizStartResponse.text());
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 3. Simular algumas respostas do quiz
        const questions = [1, 2, 3, 4, 5];
        for (const questionNum of questions) {
            console.log(`\n3️⃣.${questionNum} Enviando resposta da pergunta ${questionNum}...`);
            
            const questionPayload = {
                session_id: sessionId,
                event_type: 'QUESTION_ANSWER',
                event_data: JSON.stringify({
                    question_number: questionNum,
                    answer: questionNum % 2 === 0 ? 'A' : 'B', // Alternar respostas
                    url: 'http://localhost:3001/',
                    utm_source: utmParams.utm_source,
                    utm_medium: utmParams.utm_medium
                }),
                produto: 'quiz-harmonia-conjugal',
                tipo_de_funil: 'quiz',
                traffic_id: utmParams.utm_medium,
                fonte_de_trafego: utmParams.utm_source,
                utm_source: utmParams.utm_source,
                utm_medium: utmParams.utm_medium,
                isAnonymous: true
            };
            
            const questionResponse = await fetch(`${SUPABASE_URL}/functions/v1/track-main`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify(questionPayload)
            });
            
            console.log(`   Status: ${questionResponse.status}`);
            if (questionResponse.ok) {
                console.log(`   ✅ Pergunta ${questionNum} enviada com sucesso`);
            } else {
                console.log(`   ❌ Erro na pergunta ${questionNum}:`, await questionResponse.text());
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // 4. LEAD_SUBMIT - Submissão do lead (o mais importante!)
        console.log('\n4️⃣ Enviando LEAD_SUBMIT (CRÍTICO)...');
        
        const leadData = {
            name: `Teste Fluxo Completo ${timestamp}`,
            email: `teste.fluxo.${timestamp}@email.com`,
            phone: '11987654321'
        };
        
        // Simular resultado do diagnóstico
        const diagnosticResult = {
            urgencyLevel: 'ALTA',
            score: 85,
            category: 'CRITICA'
        };
        
        const leadPayload = {
            session_id: sessionId,
            event_type: 'LEAD_SUBMIT',
            event_data: JSON.stringify({
                name: leadData.name,
                email: leadData.email,
                phone: leadData.phone,
                url: 'http://localhost:3001/',
                referrer: 'https://instagram.com',
                page_title: 'Quiz - Diagnóstico da Harmonia Conjugal',
                diagnosisLevel: diagnosticResult.urgencyLevel,
                funnel_type: 'quiz',
                utm_source: utmParams.utm_source,
                utm_medium: utmParams.utm_medium,
                diagnosticResult: diagnosticResult
            }),
            produto: 'quiz-harmonia-conjugal',
            tipo_de_funil: 'quiz',
            traffic_id: utmParams.utm_medium,
            fonte_de_trafego: utmParams.utm_source,
            utm_source: utmParams.utm_source,
            utm_medium: utmParams.utm_medium,
            diagnosisLevel: diagnosticResult.urgencyLevel,
            diagnosticResult: diagnosticResult,
            isAnonymous: false,
            urgency_level: diagnosticResult.urgencyLevel
        };
        
        console.log('📋 Dados do lead:', leadData);
        console.log('🔍 Diagnóstico:', diagnosticResult);
        
        const leadResponse = await fetch(`${SUPABASE_URL}/functions/v1/track-main`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify(leadPayload)
        });
        
        console.log('   Status:', leadResponse.status);
        const leadResult = await leadResponse.text();
        
        if (leadResponse.ok) {
            console.log('   ✅ LEAD_SUBMIT enviado com sucesso!');
            console.log('   📄 Resposta:', leadResult);
        } else {
            console.log('   ❌ ERRO CRÍTICO no LEAD_SUBMIT!');
            console.log('   📄 Erro:', leadResult);
        }
        
        // 5. Verificar se o lead foi inserido na tabela
        console.log('\n5️⃣ Verificando se o lead foi inserido na tabela...');
        
        await new Promise(resolve => setTimeout(resolve, 2000)); // Aguardar inserção
        
        // Fazer uma consulta para verificar se o lead existe
        const checkQuery = `
            SELECT id, name, email, phone, traffic_id, fonte_de_trafego, urgency_level, created_at
            FROM "oreino360-leads" 
            WHERE email = '${leadData.email}'
            ORDER BY created_at DESC 
            LIMIT 1
        `;
        
        console.log('🔍 Consultando lead na tabela...');
        // Esta parte seria feita via Supabase client, mas vamos simular
        console.log('   Query:', checkQuery);
        
        console.log('\n📊 RESUMO DO TESTE:');
        console.log('='.repeat(50));
        console.log(`Session ID: ${sessionId}`);
        console.log(`Lead Email: ${leadData.email}`);
        console.log(`Traffic ID: ${utmParams.utm_medium}`);
        console.log(`Fonte: ${utmParams.utm_source}`);
        console.log(`Status Lead Submit: ${leadResponse.status}`);
        console.log('='.repeat(50));
        
    } catch (error) {
        console.error('❌ Erro durante o teste:', error);
    }
}

// Executar o teste
testCompleteQuizFlow();