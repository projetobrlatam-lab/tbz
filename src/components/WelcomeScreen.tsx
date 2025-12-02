import React, { useEffect } from 'react';

interface WelcomeScreenProps {
  onStart: () => void;
  // Removido trackVisit, visita será registrada após o clique em iniciar
}

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const SparkleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  // useEffect de trackVisit removido

  const fascinações = [
    "O protocolo de emergência para parar as brigas antes que seja tarde demais",
    "Como desprogramar seus filhos dos traumas já causados pelas discussões",
    "As 3 frases que fazem qualquer marido parar na hora e te respeitar",
    "O método para ser ouvida sem destruir a paz da família",
    "Como transformar sua casa de campo de batalha em lar de paz",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl w-full text-center">
        {/* Badge de emergência */}
        <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-warning to-warning-dark text-white px-6 py-2 rounded-full text-sm font-bold uppercase tracking-wider mb-6 shadow-elegant">
          <SparkleIcon className="w-4 h-4" />
          <span>Diagnóstico de Emergência</span>
          <SparkleIcon className="w-4 h-4" />
        </div>

        {/* Card principal */}
        <div className="bg-background rounded-3xl shadow-elegant-xl p-8 md:p-12 border border-border">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black mb-6 leading-tight">
            <span className="bg-gradient-to-r from-secondary to-secondary-dark bg-clip-text text-transparent">
              PARE!
            </span>{' '}
            <span className="text-text-primary">
              SUAS BRIGAS ESTÃO CONDENANDO SEUS FILHOS
            </span>
          </h1>
          
          <h2 className="text-xl sm:text-2xl font-semibold text-text-secondary mb-8 max-w-3xl mx-auto">
            Faça Este Diagnóstico Antes Que o Dano Se Torne Irreversível
          </h2>
          
          <p className="text-base sm:text-lg text-text-secondary mb-10 max-w-3xl mx-auto leading-relaxed">
            A cada briga que seus filhos presenciam, você os ensina que casamento é sofrimento. 
            Neurociência confirma: isso causa danos permanentes após os 12 anos. Este diagnóstico 
            revelará o nível de risco e gerará seu plano de resgate:
          </p>
          
          {/* Lista de benefícios */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto mb-10">
            {fascinações.map((item, index) => (
              <div key={index} className="flex items-start space-x-3 text-left p-4 rounded-xl bg-surface hover:bg-surface-dark transition-colors duration-300">
                <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-accent to-accent-dark rounded-full flex items-center justify-center mt-1">
                  <CheckIcon className="w-4 h-4 text-white" />
                </div>
                <span className="text-text-primary font-medium">{item}</span>
              </div>
            ))}
          </div>
          
          {/* Botão principal */}
          <button 
            onClick={onStart} 
            className="view_oferta group w-full max-w-lg mx-auto bg-gradient-to-r from-primary to-primary-dark text-white font-bold text-xl sm:text-2xl py-6 px-8 rounded-2xl shadow-elegant-lg hover:shadow-elegant-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary-dark to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <span className="relative z-10 flex items-center justify-center space-x-3">
              <SparkleIcon className="w-6 h-6" />
              <span>QUERO SALVAR MEUS FILHOS AGORA</span>
              <SparkleIcon className="w-6 h-6" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;