export interface QuizAnswer {
  questionId: number;
  selectedOption: number; // 0, 1, ou 2 (índice da opção selecionada)
}

export type UrgencyLevel = 'high' | 'critical' | 'emergency';

export interface DiagnosticResult {
  urgencyLevel: UrgencyLevel;
  score: number;
  reasoning: string;
  keyFactors: string[];
}

/**
 * Analisa as respostas do quiz e determina o nível de urgência do diagnóstico
 * Baseado na intensidade emocional e gravidade da situação familiar
 */
export function analyzeDiagnostic(answers: QuizAnswer[]): DiagnosticResult {
  let emergencyScore = 0;
  let criticalScore = 0;
  let highScore = 0;
  const keyFactors: string[] = [];

  // Converte respostas para um mapa para facilitar acesso
  const answerMap = new Map(answers.map(a => [a.questionId, a.selectedOption]));

  // ANÁLISE POR CATEGORIA E GRAVIDADE

  // 1. REALIDADE ATUAL - Presença de filhos e idade
  const childrenWitness = answerMap.get(1); // Filhos presenciam brigas
  const childrenAge = answerMap.get(2); // Idade dos filhos

  if (childrenWitness === 0) { // "Sim, e isso me mata por dentro todos os dias"
    emergencyScore += 3;
    keyFactors.push("Filhos presenciam brigas diariamente");
  } else if (childrenWitness === 1) { // "Às vezes, mas tento esconder"
    criticalScore += 2;
    keyFactors.push("Filhos percebem os conflitos");
  }

  if (childrenAge === 2) { // "Adolescentes (13+ anos) - pode ser tarde demais"
    emergencyScore += 2;
    keyFactors.push("Filhos adolescentes em risco");
  } else if (childrenAge === 1) { // "Pré-adolescentes (7-12 anos) - estou na última chance"
    criticalScore += 2;
    keyFactors.push("Última chance com pré-adolescentes");
  } else if (childrenAge === 0) { // "Pequenos (0-6 anos) - ainda posso protegê-los"
    highScore += 1;
    keyFactors.push("Filhos pequenos ainda podem ser protegidos");
  }

  // 2. SINAIS DE ALERTA - Frequência e intensidade
  const fightFrequency = answerMap.get(3); // Frequência das discussões
  const childrenPlea = answerMap.get(4); // Filhos imploraram para parar
  const motherFeeling = answerMap.get(5); // Como a mãe se sente
  const desperation = answerMap.get(6); // O que mais desespera
  const husbandReaction = answerMap.get(7); // Reação do marido
  const childrenChanges = answerMap.get(8); // Mudanças nos filhos

  if (fightFrequency === 0) { // "Várias vezes por semana - virou um inferno"
    emergencyScore += 3;
    keyFactors.push("Conflitos múltiplos semanais");
  } else if (fightFrequency === 1) { // "Pelo menos uma vez por semana - intensamente"
    criticalScore += 2;
    keyFactors.push("Conflitos semanais intensos");
  } else if (fightFrequency === 2) { // "Algumas vezes por mês, mas são brigas destruidoras"
    highScore += 1;
    keyFactors.push("Conflitos mensais destrutivos");
  }

  if (childrenPlea === 0) { // "Sim, e isso despedaçou meu coração completamente"
    emergencyScore += 4;
    keyFactors.push("Filhos imploraram para parar as brigas");
  } else if (childrenPlea === 1) { // "Eles choram ou ficam apavorados"
    criticalScore += 3;
    keyFactors.push("Filhos demonstram terror durante conflitos");
  }

  if (motherFeeling === 0) { // "Destruída - sou a pior mãe do mundo"
    emergencyScore += 2;
    keyFactors.push("Mãe em estado de desespero total");
  } else if (motherFeeling === 1) { // "Desesperada - não consigo parar"
    criticalScore += 2;
    keyFactors.push("Mãe reconhece perda de controle");
  }

  if (childrenChanges === 0) { // "Sim, eles estão mais agressivos e nervosos"
    emergencyScore += 3;
    keyFactors.push("Filhos apresentando agressividade");
  } else if (childrenChanges === 1) { // "Ficaram mais quietos e retraídos"
    criticalScore += 2;
    keyFactors.push("Filhos se retraindo emocionalmente");
  } else if (childrenChanges === 2) { // "Começaram a ter pesadelos ou problemas na escola"
    emergencyScore += 4;
    keyFactors.push("Filhos com sintomas de trauma");
  }

  // 3. O FUTURO DELES - Medo e consciência do dano
  const traumaFear = answerMap.get(9); // Medo de traumatizar
  const envyFeeling = answerMap.get(10); // Inveja de outros casais
  const futureFear = answerMap.get(11); // Maior medo sobre o futuro
  const nightmares = answerMap.get(12); // Pesadelos com confronto futuro

  if (traumaFear === 2) { // "Tenho certeza de que já causei danos irreparáveis"
    emergencyScore += 3;
    keyFactors.push("Consciência de danos irreparáveis");
  } else if (traumaFear === 0) { // "Sim, tenho pavor de estar destruindo eles"
    criticalScore += 2;
    keyFactors.push("Pavor de estar destruindo os filhos");
  }

  if (nightmares === 0) { // "Sim, acordo suando pensando nisso"
    emergencyScore += 2;
    keyFactors.push("Pesadelos com confronto futuro dos filhos");
  }

  // 4. SUA DECISÃO - Motivação para mudança (pontos positivos)
  const sacrifice = answerMap.get(13); // Faria qualquer coisa pelos filhos
  const timeChange = answerMap.get(14); // Mudaria se pudesse voltar no tempo
  const childrenValue = answerMap.get(15); // Quanto vale o futuro dos filhos

  // Todas as respostas da categoria "SUA DECISÃO" são positivas
  // Elas não aumentam urgência, mas confirmam motivação para mudança

  // CÁLCULO FINAL DO DIAGNÓSTICO
  const totalScore = emergencyScore + criticalScore + highScore;
  
  let urgencyLevel: UrgencyLevel;
  let reasoning: string;

  if (emergencyScore >= 8 || (emergencyScore >= 5 && criticalScore >= 3)) {
    urgencyLevel = 'emergency';
    reasoning = "Situação de trauma ativo com danos psicológicos severos já em curso. Intervenção imediata necessária para proteger o desenvolvimento emocional das crianças.";
  } else if (criticalScore >= 6 || (criticalScore >= 4 && emergencyScore >= 2)) {
    urgencyLevel = 'critical';
    reasoning = "Situação grave com alto risco de escalada e trauma. Os conflitos estão causando impacto significativo no bem-estar familiar e precisam ser resolvidos urgentemente.";
  } else {
    urgencyLevel = 'high';
    reasoning = "Situação preocupante que requer atenção. Embora ainda haja tempo para reverter os danos, é fundamental agir agora para proteger o futuro emocional da família.";
  }

  return {
    urgencyLevel,
    score: totalScore,
    reasoning,
    keyFactors: keyFactors.slice(0, 5) // Limita a 5 fatores principais
  };
}

/**
 * Gera mensagem personalizada para a página de vendas baseada no diagnóstico
 */
export function generateDiagnosticMessage(result: DiagnosticResult): string {
  const { urgencyLevel, keyFactors } = result;

  const baseMessage = {
    'emergency': {
      title: "🚨 DIAGNÓSTICO: URGÊNCIA EMERGENCIAL",
      subtitle: "Sua família está em CRISE SEVERA",
      description: "Baseado nas suas respostas, identifiquei sinais de trauma ativo em seus filhos. Esta situação requer intervenção IMEDIATA."
    },
    'critical': {
      title: "⚠️ DIAGNÓSTICO: URGÊNCIA CRÍTICA", 
      subtitle: "Sua família está em RISCO ALTO",
      description: "Suas respostas revelam uma situação grave que está escalando rapidamente. É fundamental agir AGORA antes que se torne irreversível."
    },
    'high': {
      title: "📢 DIAGNÓSTICO: URGÊNCIA ALTA",
      subtitle: "Sua família precisa de ATENÇÃO URGENTE", 
      description: "Embora ainda haja tempo, suas respostas mostram sinais preocupantes que precisam ser resolvidos antes que se agravem."
    }
  };

  const message = baseMessage[urgencyLevel];
  const factorsList = keyFactors.map(factor => `• ${factor}`).join('\n');

  return `${message.title}\n\n${message.subtitle}\n\n${message.description}\n\n**Principais fatores identificados:**\n${factorsList}`;
}