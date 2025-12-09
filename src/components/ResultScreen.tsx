import React, { useEffect, useState } from 'react';
import { DiagnosticResult } from '../utils/diagnosticAnalysis';

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const ShieldIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 20.944a11.955 11.955 0 0118 0z" />
  </svg>
);

const CrossIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SparkleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

const ClickIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M9.25 21.5a.75.75 0 01-.53-1.28l1.72-1.72H3.75a.75.75 0 010-1.5h8.44l-1.72-1.72a.75.75 0 011.06-1.06l3 3a.75.75 0 010 1.06l-3 3a.75.75 0 01-.53.22zM15.75 22.5a.75.75 0 01-.75-.75V15a.75.75 0 011.5 0v6.75a.75.75 0 01-.75.75zM15 12.75a.75.75 0 01-.75-.75V3.5a.75.75 0 011.5 0v8.5a.75.75 0 01-.75.75zM12 12.75a.75.75 0 01-.75-.75V6.5a.75.75 0 011.5 0v5.5a.75.75 0 01-.75.75zM9 12.75a.75.75 0 01-.75-.75V9.5a.75.75 0 011.5 0v2.5a.75.75 0 01-.75.75z" />
  </svg>
);

const FamilyConflictIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-red-400 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 17a2 2 0 002-2 2 2 0 00-2-2 2 2 0 002 2z"></path>
    <path d="M8 21v-4h8v4"></path>
    <path d="M14.5 4.5l-5 5"></path><path d="M9.5 4.5l5 5"></path>
    <path d="M2 15a2 2 0 100-4 2 2 0 000 4z"></path>
    <path d="M22 15a2 2 0 100-4 2 2 0 000 4z"></path>
  </svg>
);

const HappyFamilyIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-accent mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 17a2 2 0 002-2 2 2 0 00-2-2 2 2 0 002 2z"></path>
    <path d="M8 21v-4h8v4"></path>
    <path d="M3 10h18"></path><path d="M3 10a5 5 0 0010 0"></path><path d="M11 10a5 5 0 0110 0"></path>
  </svg>
);

const BookIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-primary mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20v2H6.5A2.5 2.5 0 014 16.5v-11A2.5 2.5 0 016.5 3H20v14H6.5A2.5 2.5 0 014 14.5v-9z"></path>
  </svg>
);

const BarChart: React.FC<{ traumaLevel: number; harmonyPotential: number }> = ({ traumaLevel, harmonyPotential }) => (
  <div className="my-8 p-8 bg-surface rounded-2xl border border-border">
    <h3 className="text-xl font-bold mb-6 text-center text-text-primary">Sua Situação Visualizada</h3>
    <div className="space-y-6">
      <div>
        <div className="flex justify-between mb-3">
          <span className="text-base font-semibold text-red-500">Nível de Trauma Atual</span>
          <span className="text-sm font-bold text-red-500 bg-red-50 px-3 py-1 rounded-full">{traumaLevel}%</span>
        </div>
        <div className="w-full bg-red-100 rounded-full h-4 overflow-hidden">
          <div className="bg-gradient-to-r from-red-400 to-red-600 h-4 rounded-full transition-all duration-1000 ease-out" style={{ width: `${traumaLevel}%` }}></div>
        </div>
      </div>
      <div>
        <div className="flex justify-between mb-3">
          <span className="text-base font-semibold text-accent">Potencial de Harmonia</span>
          <span className="text-sm font-bold text-accent bg-green-50 px-3 py-1 rounded-full">{harmonyPotential}%</span>
        </div>
        <div className="w-full bg-green-100 rounded-full h-4 overflow-hidden">
          <div className="bg-gradient-to-r from-accent to-accent-dark h-4 rounded-full transition-all duration-1000 ease-out" style={{ width: `${harmonyPotential}%` }}></div>
        </div>
      </div>
    </div>
  </div>
);

const diagnoses = [
  {
    headline: "DIAGNÓSTICO: RISCO GRAVE",
    subheadline: "Suas brigas já instalaram o 'vírus da infelicidade' na mente dos seus filhos. Aja agora, antes que ele se torne incurável.",
    traumaLevel: 85,
  },
  {
    headline: "DIAGNÓSTICO: ESTADO CRÍTICO",
    subheadline: "Você está a um passo de condenar seus filhos a repetirem seus piores erros nos relacionamentos. O tempo para reverter está acabando.",
    traumaLevel: 92,
  },
  {
    headline: "DIAGNÓSTICO: DANO ALARMANTE",
    subheadline: "As memórias de hoje serão os traumas de amanhã. O que você considera 'só uma briga', eles sentirão como abandono para o resto da vida.",
    traumaLevel: 95,
  }
];

interface ResultScreenProps {
  diagnosisLevel: number;
  diagnosticResult: DiagnosticResult | null;
  onOfferClick: () => Promise<void>;
}

const ResultScreen: React.FC<ResultScreenProps> = ({ diagnosisLevel, diagnosticResult, onOfferClick }) => {
  const [hotmartUrl, setHotmartUrl] = useState('https://payment.ticto.app/O1A7E5B31');
  const selectedDiagnosis = diagnoses[diagnosisLevel] || diagnoses[0];

  // Função para mapear o nível de urgência para o texto de diagnóstico
  const getUrgencyText = (urgencyLevel: string) => {
    switch (urgencyLevel) {
      case 'critical':
        return 'URGÊNCIA CRÍTICA';
      case 'high':
        return 'URGÊNCIA ALTA';
      case 'emergency':
        return 'URGÊNCIA EMERGENCIAL';
      default:
        return 'URGÊNCIA ALTA';
    }
  };

  // Função para mapear o nível de urgência para a cor
  const getUrgencyColor = (urgencyLevel: string) => {
    switch (urgencyLevel) {
      case 'critical':
        return 'from-red-500 to-red-700';
      case 'high':
        return 'from-orange-500 to-orange-700';
      case 'emergency':
        return 'from-red-600 to-red-800';
      default:
        return 'from-orange-500 to-orange-700';
    }
  };

  // Usar o resultado do diagnóstico personalizado se disponível
  const displayDiagnosis = diagnosticResult ? {
    headline: `DIAGNÓSTICO: ${getUrgencyText(diagnosticResult.urgencyLevel)}`,
    subheadline: diagnosticResult.reasoning,
    traumaLevel: selectedDiagnosis.traumaLevel, // Manter o nível de trauma visual
  } : selectedDiagnosis;
  const bonuses = [
    "BÔNUS 1: WhatsApp da Reconquista - 50 mensagens que fazem ele sorrir",
    "BÔNUS 2: Protocolo Pós-Briga - Como reconquistar depois de discussão",
    "BÔNUS 3: Manual da Esposa Irresistível - 15 atitudes irresistíveis",
    "BÔNUS 4: Código da Admiração - Como falar dos defeitos sem criticar",
    "BÔNUS 5: Suporte por Email Exclusivo - Tire suas dúvidas diretamente comigo",
    "BÔNUS 6: Acesso VITALÍCIO - Para sempre, sem mensalidades",
  ];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const name = params.get('name');
    const email = params.get('email');
    const phonenumber = params.get('phonenumber');

    if (name && email && phonenumber) {
      const baseUrl = 'https://payment.ticto.app/O1A7E5B31';
      const populatedUrl = `${baseUrl}?name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}&phonenumber=${encodeURIComponent(phonenumber)}`;
      setHotmartUrl(populatedUrl);
    }
  }, []);

  const handleButtonClick = async () => {
    try {
      await onOfferClick();
    } catch (error) {
      console.error('Erro ao processar clique na oferta:', error);
      window.location.href = hotmartUrl;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface via-background to-secondary/5 flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl w-full">
        {/* Input oculto para a URL da Hotmart */}
        <input type="hidden" id="hotmart-url" value={hotmartUrl} />

        {/* Diagnóstico Principal */}
        <div className="w-full text-center bg-background rounded-3xl shadow-elegant-xl p-8 md:p-10 mb-12 border-2 border-secondary relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-secondary/10 to-transparent rounded-full -translate-y-20 translate-x-20"></div>

          <div className="relative z-10">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-secondary to-secondary-dark text-white px-6 py-2 rounded-full text-sm font-bold uppercase tracking-wider mb-6">
              <SparkleIcon className="w-4 h-4" />
              <span>Resultado do Diagnóstico</span>
              <SparkleIcon className="w-4 h-4" />
            </div>

            <h1 className="text-3xl sm:text-4xl font-black mb-4">
              <span className={`bg-gradient-to-r ${diagnosticResult ? getUrgencyColor(diagnosticResult.urgencyLevel) : 'from-secondary to-secondary-dark'} bg-clip-text text-transparent`}>
                {displayDiagnosis.headline}
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-text-secondary leading-relaxed">
              {displayDiagnosis.subheadline}
            </p>
          </div>
        </div>

        {/* Antes & Depois */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="bg-background rounded-2xl p-8 text-center border-2 border-red-200 shadow-elegant relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-50 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
            <div className="relative z-10">
              <FamilyConflictIcon />
              <h3 className="text-2xl font-bold text-red-500 mt-4 mb-4">O Ciclo de Dor Atual</h3>
              <ul className="text-left space-y-3 text-text-secondary">
                <li className="flex items-start space-x-3">
                  <CrossIcon className="w-5 h-5 text-red-400 mt-1 flex-shrink-0" />
                  <span>Crianças ansiosas e inseguras</span>
                </li>
                <li className="flex items-start space-x-3">
                  <CrossIcon className="w-5 h-5 text-red-400 mt-1 flex-shrink-0" />
                  <span>Modelo de relacionamento tóxico</span>
                </li>
                <li className="flex items-start space-x-3">
                  <CrossIcon className="w-5 h-5 text-red-400 mt-1 flex-shrink-0" />
                  <span>Futuro de relações fracassadas</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-background rounded-2xl p-8 text-center border-2 border-accent shadow-elegant relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-accent/10 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
            <div className="relative z-10">
              <HappyFamilyIcon />
              <h3 className="text-2xl font-bold text-accent mt-4 mb-4">O Futuro de Paz Que Eles Merecem</h3>
              <ul className="text-left space-y-3 text-text-secondary">
                <li className="flex items-start space-x-3">
                  <CheckIcon className="w-5 h-5 text-accent mt-1 flex-shrink-0" />
                  <span>Filhos seguros e emocionalmente estáveis</span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckIcon className="w-5 h-5 text-accent mt-1 flex-shrink-0" />
                  <span>Exemplo de amor e respeito em casa</span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckIcon className="w-5 h-5 text-accent mt-1 flex-shrink-0" />
                  <span>Capacidade de construir lares felizes</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Mini-VSL */}
        <div className="text-center mb-12 p-8 md:p-10 bg-background rounded-3xl shadow-elegant-xl border border-border">
          <p className="text-xl md:text-2xl text-text-secondary mb-8 leading-relaxed">
            "Se você tem filhos e chegou até aqui, preciso te dar uma notícia dolorosa mas necessária: suas brigas não estão só destruindo seu casamento. <strong className="text-secondary font-semibold">Estão destruindo seus filhos.</strong> E você tem muito pouco tempo para reverter isso."
          </p>

          <BarChart traumaLevel={displayDiagnosis.traumaLevel} harmonyPotential={95} />

          <p className="text-lg md:text-xl text-text-secondary mb-8 leading-relaxed">
            "Estudos de Harvard comprovam: crianças expostas a brigas constantes desenvolvem os mesmos sintomas de veteranos de guerra. Ansiedade crônica, problemas de concentração, dificuldade para formar relacionamentos saudáveis. O pior: <strong className="font-bold text-secondary">depois dos 12 anos, esses padrões se tornam quase irreversíveis.</strong> Seu filho vai carregar essas cicatrizes para sempre e repetir exatamente o que aprendeu com vocês."
          </p>
          <p className="text-lg md:text-xl text-text-secondary mb-8 leading-relaxed">
            "Mas ainda dá tempo. Baseado no seu diagnóstico, criei um protocolo de resgate familiar personalizado. Não é só para salvar seu casamento - é para <strong className="text-secondary font-semibold">salvar o futuro dos seus filhos.</strong>"
          </p>
          <p className="text-xl md:text-2xl font-bold text-text-primary italic">
            "Cada dia que você demora é um dia a mais de trauma na mente dos seus filhos. Daqui 20 anos, quando eles estiverem repetindo seus erros, você vai se lembrar deste momento. Seus filhos estão contando com você. Não falhe com eles novamente. Role para baixo e salve sua família agora."
          </p>
        </div>

        {/* Página de Vendas */}
        <div className="bg-background rounded-3xl shadow-elegant-xl p-8 md:p-12 border border-border relative overflow-hidden">
          <div className="absolute top-0 right-0 w-60 h-60 bg-gradient-to-br from-primary/5 to-transparent rounded-full -translate-y-30 translate-x-30"></div>

          <div className="relative z-10">
            <div className="text-center mb-10">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-warning to-warning-dark text-white px-6 py-2 rounded-full text-sm font-bold uppercase tracking-wider mb-4">
                <SparkleIcon className="w-4 h-4" />
                <span>Última Chance</span>
                <SparkleIcon className="w-4 h-4" />
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4">
                <span className="bg-gradient-to-r from-secondary to-secondary-dark bg-clip-text text-transparent">ÚLTIMA CHANCE:</span>
              </h1>
              <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-4">Seus Filhos Não Podem Esperar Mais</h2>
              <p className="text-xl text-accent font-semibold">Seu Plano de Resgate Familiar Está Pronto</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-surface p-8 rounded-2xl mb-10 border border-border">
              {/* Produto */}
              <div className="flex flex-col items-center justify-center bg-background p-8 rounded-2xl text-center h-full shadow-elegant">
                <img src="/product-book.png" alt="Protocolo de Resgate Familiar" className="w-48 h-auto mb-4 drop-shadow-xl" />
                <h3 className="text-2xl font-bold text-text-primary mb-2">Protocolo de Resgate Familiar</h3>
                <p className="text-text-secondary mb-4">O passo a passo de 7 dias para restaurar a paz e proteger seus filhos.</p>
                <div className="bg-gradient-to-r from-secondary to-secondary-dark text-white font-bold py-3 px-6 rounded-full">
                  VERSÃO EMERGÊNCIA
                </div>
              </div>

              {/* Bônus */}
              <div>
                <h4 className="font-bold text-xl mb-6 text-text-primary">E você ainda recebe estes bônus de resgate:</h4>
                <div className="space-y-4">
                  {bonuses.map((bonus, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-background rounded-xl">
                      <CheckIcon className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
                      <span className="text-text-secondary font-medium">{bonus}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Preço */}
            <div className="text-center bg-gradient-to-r from-primary/10 to-secondary/10 p-8 rounded-2xl border-2 border-primary/20 mb-10">
              <p className="text-lg text-text-secondary mb-2">Preço de Emergência:</p>
              <p className="text-6xl font-black text-accent mb-2">R$ 47,00</p>
              <p className="text-text-secondary">Menos que uma consulta de psicólogo infantil que você vai precisar se não agir AGORA.</p>
            </div>

            {/* Garantia */}
            <div className="text-center bg-surface p-8 rounded-2xl mb-10 flex flex-col items-center border border-border">
              <ShieldIcon className="w-16 h-16 text-accent mb-4" />
              <h3 className="font-bold text-xl text-accent mb-2">Garantia de Proteção Familiar - 7 dias</h3>
              <p className="text-text-secondary max-w-xl">Se em 7 dias você não vir uma mudança radical nas brigas, devolvemos tudo. Mas pense: você prefere recuperar R$ 47,00 ou recuperar o futuro dos seus filhos?</p>
            </div>

            {/* Botão Principal */}
            <button
              onClick={handleButtonClick}
              className="chk_29 group w-full max-w-2xl mx-auto bg-gradient-to-r from-accent to-accent-dark text-white font-bold text-2xl py-6 px-8 rounded-2xl shadow-elegant-lg hover:shadow-elegant-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 mb-12 relative overflow-hidden flex items-center justify-center"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-accent-dark to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <span className="relative z-10 flex items-center justify-center space-x-4">
                <SparkleIcon className="w-6 h-6" />
                <span>SIM, VOU SALVAR MEUS FILHOS AGORA</span>
                <ClickIcon className="w-8 h-8" />
              </span>
            </button>

            {/* Seção de Decisão */}
            <div className="pt-8 border-t border-border">
              <h3 className="text-2xl font-bold text-center text-text-primary mb-8">Ainda em dúvida? Deixe-me ser brutalmente honesta...</h3>
              <p className="text-center text-lg text-text-secondary mb-10 max-w-4xl mx-auto leading-relaxed">Neste exato momento, você está em uma encruzilhada. Existem apenas dois caminhos a seguir, e a decisão que você tomar agora definirá o futuro emocional dos seus filhos.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                {/* Caminho 1 */}
                <div className="bg-red-50 p-8 rounded-2xl border-2 border-red-200 shadow-elegant">
                  <div className="flex items-center mb-6">
                    <CrossIcon className="w-8 h-8 text-red-500 mr-4" />
                    <h4 className="text-xl font-bold text-red-600">Caminho 1: Você fecha esta página</h4>
                  </div>
                  <p className="text-text-secondary leading-relaxed">Amanhã, a tensão continua. Outra briga acontece. Seus filhos se encolhem no canto de novo. O silêncio pesado volta. Daqui a 5 anos, eles são adolescentes distantes. Daqui a 20, eles estão em relacionamentos tóxicos, porque foi o que aprenderam. E a culpa, silenciosamente, te consumirá todos os dias.</p>
                </div>

                {/* Caminho 2 */}
                <div className="bg-green-50 p-8 rounded-2xl border-2 border-accent shadow-elegant">
                  <div className="flex items-center mb-6">
                    <CheckIcon className="w-8 h-8 text-accent mr-4" />
                    <h4 className="text-xl font-bold text-accent">Caminho 2: Você toma a decisão</h4>
                  </div>
                  <p className="text-text-secondary leading-relaxed">Amanhã, a tensão para. Outra briga acontece. Seus filhos se encolhem no canto de novo. O silêncio pesado volta. Daqui a 5 anos, eles são adolescentes distantes. Daqui a 20, eles estão em relacionamentos tóxicos, porque foi o que aprenderam. E a culpa, silenciosamente, te consumirá todos os dias.</p>
                </div>
              </div>

              <p className="text-center text-lg font-bold text-text-primary mb-8">A escolha é sua. O futuro deles também.</p>

              <button
                onClick={handleButtonClick}
                className="chk_29 group w-full max-w-2xl mx-auto bg-gradient-to-r from-accent to-accent-dark text-white font-bold text-2xl py-6 px-8 rounded-2xl shadow-elegant-lg hover:shadow-elegant-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 relative overflow-hidden flex items-center justify-center"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-accent-dark to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <span className="relative z-10 flex items-center justify-center space-x-4">
                  <SparkleIcon className="w-6 h-6" />
                  <span>ESCOLHO SALVAR MINHA FAMÍLIA</span>
                  <ClickIcon className="w-8 h-8" />
                </span>
              </button>
            </div>

            {/* Assinatura */}
            <div className="mt-12 pt-8 border-t border-border text-center">
              <p className="text-text-muted italic text-base leading-relaxed max-w-3xl mx-auto">
                "Como conselheira matrimonial cristã e mãe, vi famílias inteiras destruídas por brigas que poderiam ter sido evitadas. Não deixe seus filhos se tornarem mais uma estatística. Aja enquanto ainda é tempo."
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultScreen;