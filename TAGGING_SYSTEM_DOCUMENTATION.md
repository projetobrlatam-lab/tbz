# Sistema de Tagueamento - Documentação

## Visão Geral

O sistema de tagueamento foi implementado na função `track-main-v2` para automatizar a criação de tags baseadas nos eventos de interação dos usuários. Este sistema permite rastrear o progresso dos usuários através do funil de conversão e qualificar leads automaticamente.

## Estrutura do Sistema

### 1. Tabelas Principais

#### `oreino360-identificador`
Armazena informações únicas de cada visitante:
- `id`: UUID único do identificador
- `fingerprint_hash`: Hash único do dispositivo/navegador
- `traffic_id`: ID único do tráfego/sessão
- `original_ip` / `normalized_ip`: Endereços IP original e normalizado
- `user_agent`: String do navegador
- `accept_language`: Idioma preferido
- `country_code`, `country_name`, `city`, `region_name`: Dados de geolocalização
- `produto`: Produto associado (padrão: 'tbz')
- `tipo_de_funil`: Tipo do funil (padrão: 'Quiz')
- `fonte_de_trafego`: Origem do tráfego (UTM source)

#### `oreino360-visit_tags`
Armazena as tags automáticas baseadas nos eventos:
- `id`: UUID único da tag
- `identifier_id`: Referência ao identificador
- `tag_name`: Nome da tag (ex: "Pergunta 1", "Pergunta 2")
- `tag_description`: Descrição automática da tag
- `traffic_id`: ID do tráfego associado
- `step_reached`: Etapa alcançada no funil
- `qualification_level`: Nível de qualificação do lead
- `produto`: Produto associado
- `fonte_de_trafego`: Origem do tráfego
- `tipo_de_funil`: Tipo do funil

### 2. Lógica de Tagueamento

#### Eventos Suportados

1. **question_view**: Visualização de pergunta
   - Tag: "Pergunta X" (onde X é o número da pergunta)
   - Step: "pergunta_X"
   - Qualificação: "qualificacao_baixa"

2. **question_answer**: Resposta a pergunta
   - Tag: "Resposta X" (onde X é o número da pergunta)
   - Step: "resposta_X"
   - Qualificação: "qualificacao_media"

3. **quiz_complete**: Quiz completado
   - Tag: "Quiz Completo"
   - Step: "quiz_completo"
   - Qualificação: "qualificacao_alta"

4. **lead_form_view**: Visualização do formulário de lead
   - Tag: "Formulário Visualizado"
   - Step: "formulario_visualizado"
   - Qualificação: "qualificacao_alta"

5. **lead_form_submit**: Envio do formulário de lead
   - Tag: "Lead Capturado"
   - Step: "lead_capturado"
   - Qualificação: "lead_qualificado"

#### Algoritmo de Qualificação

```javascript
const getQualificationLevel = (eventType, questionNumber) => {
  switch (eventType) {
    case 'question_view':
      return 'qualificacao_baixa';
    case 'question_answer':
      return 'qualificacao_media';
    case 'quiz_complete':
    case 'lead_form_view':
      return 'qualificacao_alta';
    case 'lead_form_submit':
      return 'lead_qualificado';
    default:
      return 'qualificacao_baixa';
  }
};
```

### 3. Fluxo de Funcionamento

1. **Recebimento do Evento**: A função recebe dados do evento via POST
2. **Upsert do Identificador**: Cria ou atualiza o registro do identificador
3. **Verificação de Condições**: Verifica se deve criar tag baseado no evento
4. **Criação da Tag**: Insere nova tag na tabela `visit_tags`
5. **Resposta**: Retorna confirmação do processamento

### 4. Condições para Criação de Tags

As tags são criadas quando:
- O evento é um dos tipos suportados
- Para `question_view` e `question_answer`: deve existir `event_data.question_number`
- O `traffic_id` é válido
- Não existe tag duplicada para o mesmo evento/pergunta

### 5. Exemplo de Uso

```json
{
  "fingerprint_hash": "user_fingerprint_123",
  "traffic_id": "traffic_session_456",
  "event_type": "question_view",
  "event_data": {
    "question_number": 2
  },
  "ip": "192.168.1.1",
  "user_agent": "Mozilla/5.0...",
  "accept_language": "pt-BR",
  "country_code": "BR",
  "country_name": "Brazil",
  "city": "São Paulo",
  "region_name": "São Paulo",
  "produto": "tbz",
  "tipo_de_funil": "Quiz",
  "utm_source": "facebook"
}
```

### 6. Resposta da API

```json
{
  "success": true,
  "message": "Event tracked and tagged based on TrafficD",
  "traffic_id": "traffic_session_456",
  "event_type": "question_view"
}
```

## Monitoramento e Debugging

### Logs Disponíveis
- Logs da função edge podem ser acessados via Supabase Dashboard
- Erros são logados com detalhes específicos
- Status HTTP 200 indica sucesso, 500 indica erro interno

### Consultas Úteis

```sql
-- Verificar identificadores criados
SELECT * FROM "oreino360-identificador" 
WHERE traffic_id = 'seu_traffic_id' 
ORDER BY created_at DESC;

-- Verificar tags criadas
SELECT * FROM "oreino360-visit_tags" 
WHERE traffic_id = 'seu_traffic_id' 
ORDER BY created_at DESC;

-- Análise de qualificação por fonte
SELECT fonte_de_trafego, qualification_level, COUNT(*) 
FROM "oreino360-visit_tags" 
GROUP BY fonte_de_trafego, qualification_level;
```

## Manutenção

### Atualizações Futuras
- Novos tipos de evento podem ser adicionados na função `assignVisitTagsByTrafficId`
- Níveis de qualificação podem ser refinados conforme necessário
- Lógica de deduplicação pode ser ajustada

### Considerações de Performance
- A função utiliza upsert para evitar duplicatas
- Índices nas tabelas otimizam consultas por `traffic_id`
- Logs são mantidos para auditoria e debugging

---

**Última atualização**: 23 de outubro de 2025
**Versão da função**: track-main-v2
**Autor**: Sistema automatizado de documentação