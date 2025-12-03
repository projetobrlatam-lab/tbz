import React from 'react';

const NotFoundScreen: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
      <div className="mb-8">
        <svg className="w-24 h-24 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      </div>
      <h1 className="text-4xl font-bold text-text-primary mb-4">Ops! Página não encontrada.</h1>
      <p className="text-lg text-text-secondary max-w-md mx-auto mb-6">
        Parece que você digitou um endereço inválido ou a página que você está procurando não existe mais.
      </p>
      <p className="text-md text-text-muted mb-8">
        Verifique se o link está correto ou tente voltar para a página inicial.
      </p>
      <a
        href="/"
        className="px-6 py-3 bg-primary text-white font-semibold rounded-lg shadow-md hover:bg-primary-dark transition-colors duration-200"
      >
        Voltar para o Início
      </a>
    </div>
  );
};

export default NotFoundScreen;