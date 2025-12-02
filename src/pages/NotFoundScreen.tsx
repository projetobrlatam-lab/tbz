import React from 'react';

const NotFoundScreen: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
      <h1 className="text-4xl font-bold text-text-primary mb-4">404 - Página Não Encontrada</h1>
      <p className="text-lg text-text-secondary">O quiz ou produto que você está procurando não existe.</p>
      <a href="/" className="mt-6 text-primary hover:underline">Voltar para o início</a>
    </div>
  );
};

export default NotFoundScreen;