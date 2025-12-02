import type { Question } from '../types';

export const quizQuestions: Question[] = [
  // A REALIDADE ATUAL
  {
    id: 1,
    category: 'A REALIDADE ATUAL',
    text: "Seus filhos presenciam suas brigas?",
    icon: '👀',
    options: [
      "Sim, e isso me mata por dentro todos os dias",
      "Às vezes, mas tento esconder (sei que eles percebem tudo)",
      "Não tenho filhos, mas pretendo ter",
    ],
  },
  {
    id: 2,
    category: 'A REALIDADE ATUAL',
    text: "Qual a idade dos seus filhos?",
    icon: '👶',
    options: [
      "Pequenos (0-6 anos) - ainda posso protegê-los",
      "Pré-adolescentes (7-12 anos) - estou na última chance",
      "Adolescentes (13+ anos) - pode ser tarde demais",
    ],
  },
  // SINAIS DE ALERTA
  {
    id: 3,
    category: 'SINAIS DE ALERTA',
    text: "Com que frequência vocês explodem em discussões?",
    icon: '💥',
    options: [
      "Várias vezes por semana - virou um inferno",
      "Pelo menos uma vez por semana - intensamente",
      "Algumas vezes por mês, mas são brigas destruidoras",
    ],
  },
  {
    id: 4,
    category: 'SINAIS DE ALERTA',
    text: "Seus filhos já imploraram para vocês pararem?",
    icon: '😭',
    options: [
      "Sim, e isso despedaçou meu coração completamente",
      "Eles choram ou ficam apavorados quando brigamos",
      "Vejo o medo nos olhos deles quando começamos",
    ],
  },
  {
    id: 5,
    category: 'SINAIS DE ALERTA',
    text: "Como você se sente sabendo que está prejudicando seus filhos?",
    icon: '😔',
    options: [
      "Destruída - sou a pior mãe do mundo",
      "Desesperada - não consigo parar mesmo sabendo do mal",
      "Culpada - sei que estou falhando com eles",
    ],
  },
  {
    id: 6,
    category: 'SINAIS DE ALERTA',
    text: "O que mais te desespera nessas brigas?",
    icon: '😱',
    options: [
      "Ver o terror nos olhos dos meus filhos",
      "Saber que estou ensinando eles que amor dói",
      "Perceber que eles estão perdendo a inocência",
    ],
  },
  {
    id: 7,
    category: 'SINAIS DE ALERTA',
    text: "Como seu marido reage durante as discussões?",
    icon: '😡',
    options: [
      "Grita de volta na frente das crianças",
      "Sai batendo a porta, deixando todos abalados",
      "Fica em silêncio, mas o clima fica pesado por dias",
    ],
  },
  {
    id: 8,
    category: 'SINAIS DE ALERTA',
    text: "Você percebe seus filhos mudando por causa das brigas?",
    icon: '😥',
    options: [
      "Sim, eles estão mais agressivos e nervosos",
      "Ficaram mais quietos e retraídos",
      "Começaram a ter pesadelos ou problemas na escola",
    ],
  },
  // O FUTURO DELES
  {
    id: 9,
    category: 'O FUTURO DELES',
    text: "Você tem medo de estar traumatizando seus filhos para sempre?",
    icon: '😰',
    options: [
      "Sim, tenho pavor de estar destruindo eles",
      "Morro de medo de que eles me odeiem no futuro",
      "Tenho certeza de que já causei danos irreparáveis",
    ],
  },
  {
    id: 10,
    category: 'O FUTURO DELES',
    text: "Como você se sente quando vê outros casais harmoniosos com filhos?",
    icon: '💔',
    options: [
      "Morta de inveja - queria que fossem meus filhos",
      "Devastada - sei que meus filhos merecem isso",
      "Envergonhada - sou um exemplo terrível de mãe",
    ],
  },
  {
    id: 11,
    category: 'O FUTURO DELES',
    text: "Qual seu maior medo sobre o futuro dos seus filhos?",
    icon: '🔮',
    options: [
      "Que tenham relacionamentos tóxicos por minha culpa",
      "Que nunca consigam ser felizes no amor",
      "Que me culpem para sempre por ter arruinado eles",
    ],
  },
  {
    id: 12,
    category: 'O FUTURO DELES',
    text: "Você já teve pesadelos com seus filhos adultos te confrontando?",
    icon: '🛌',
    options: [
      "Sim, acordo suando pensando nisso",
      "Tenho pavor do dia em que eles me perguntarem 'por quê?'",
      "Sei que um dia vão me odiar pelo que fiz",
    ],
  },
  // SUA DECISÃO
  {
    id: 13,
    category: 'SUA DECISÃO',
    text: "Você faria QUALQUER COISA para proteger seus filhos agora?",
    icon: '🛡️',
    options: [
      "SIM! Qualquer sacrifício pelos meus filhos",
      "Com certeza, eles são minha prioridade absoluta",
      "Sem dúvida, não posso falhar mais com eles",
    ],
  },
  {
    id: 14,
    category: 'SUA DECISÃO',
    text: "Se pudesse voltar no tempo e mudar tudo em 7 dias, mudaria?",
    icon: '⏳',
    options: [
      "Imediatamente, daria qualquer coisa por essa chance",
      "Sem hesitar, não aguento mais ver eles sofrendo",
      "É meu último desejo na vida - salvar meus filhos",
    ],
  },
  {
    id: 15,
    category: 'SUA DECISÃO',
    text: "Quanto vale o futuro e felicidade dos seus filhos?",
    icon: '💎',
    options: [
      "Não tem preço - são meus tesouros mais preciosos",
      "Vale minha própria vida - faria qualquer coisa por eles",
      "É mais importante que qualquer outra coisa no mundo",
    ],
  },
];

export const progressSteps = [15, 30, 45, 55, 60, 65, 70, 75, 80, 85, 90, 93, 96, 98, 100];