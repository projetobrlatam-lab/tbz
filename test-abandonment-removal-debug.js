// Teste específico para debug da remoção de abandonos
const payload = {
  "event_type": "lead_submit",
  "session_id": "cd1e9a93-f73f-4adc-bc7f-8d956e0d0d6a",
  "traffic_id": "rodiney2122",
  "fonte_de_trafego": "instagram",
  "tipo_de_funil": "quiz",
  "produto": "tbz",
  "lead_data": {
    "name": "Teste Remoção Debug",
    "email": "teste.remocao.debug@example.com",
    "phone": "11999999999"
  },
  "quiz_data": {
    "answers": {
      "pergunta_1": "resposta_1",
      "pergunta_2": "resposta_2"
    },
    "urgency_level": "ALTA"
  },
  "timestamp": new Date().toISOString(),
  "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "accept_language": "pt-BR,pt;q=0.9,en;q=0.8",
  "ip_address": "177.84.45.17"
};

console.log('Payload para teste de remoção de abandonos:');
console.log(JSON.stringify(payload, null, 2));

// Comando curl para executar
const curlCommand = `curl -X POST "https://ynxsksgttbzxooixgqzf.supabase.co/functions/v1/track-main" \\
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHNrc2d0dGJ6eG9vaXhncXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTU4ODAsImV4cCI6MjA3NDM5MTg4MH0.PTAaE9WV6gjpDwlQuRY_HZjI-k5BCZ5yoyIjSSiSfIg" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(payload)}'`;

console.log('\nComando curl:');
console.log(curlCommand);