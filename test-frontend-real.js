// Teste real do front-end - simulando exatamente o que acontece no navegador
const SUPABASE_URL = 'https://ynxsksgttbzxooixgqzf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHNrc2d0dGJ6eG9vaXhncXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzNzE1NzEsImV4cCI6MjA3Njk0NzU3MX0.Ej7Wd8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

// Simulando dados do front-end
const leadData = {
  name: 'Teste Frontend Real',
  email: 'teste.frontend.real@email.com',
  phone: '(11) 99999-9999'
};

const diagnosticResult = {
  urgencyLevel: 'alta',
  diagnostic: 'Necessita de tratamento imediato'
};

const diagnosisLevel = 'alta';

// Simulando UTM parameters
const urlParams = new URLSearchParams('?utm_source=instagram&utm_medium=cpc&utm_campaign=test');

// Construindo o payload exatamente como o client.ts faz
const eventPayload = {
  event_type: 'lead_submit', // ✅ CORRIGIDO: event_type em vez de eventType
  timestamp: Date.now(),
  url: 'http://localhost:3001',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  ...leadData,
  ...diagnosticResult,
  diagnosisLevel,
  traffic_id: `frontend-real-${Date.now()}`,
  fonte_de_trafego: urlParams.get('utm_source') || 'direct'
};

// Adicionando urgency_level ao payload principal (como fizemos no client.ts)
if (diagnosticResult && diagnosticResult.urgencyLevel) {
  eventPayload.urgency_level = diagnosticResult.urgencyLevel;
}

console.log('🔍 Payload que será enviado:', JSON.stringify(eventPayload, null, 2));

// Enviando para o track-main
fetch(`${SUPABASE_URL}/functions/v1/track-main`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  },
  body: JSON.stringify(eventPayload)
})
.then(response => {
  console.log('✅ Status da resposta:', response.status);
  return response.text();
})
.then(data => {
  console.log('📝 Resposta do servidor:', data);
})
.catch(error => {
  console.error('❌ Erro:', error);
});