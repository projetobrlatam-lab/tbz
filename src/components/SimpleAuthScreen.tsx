import React from 'react';

interface SimpleAuthScreenProps {
  onLogin: () => void;
}

const SimpleAuthScreen: React.FC<SimpleAuthScreenProps> = ({ onLogin }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-background rounded-3xl shadow-elegant-xl p-8 text-center border border-border">
          <h1 className="text-3xl font-bold text-text-primary mb-6">Dashboard Reino 360</h1>
          <p className="text-text-secondary mb-8">Faça login para acessar o painel administrativo</p>
          
          <button
            onClick={onLogin}
            className="w-full bg-gradient-to-r from-primary to-primary-dark text-white font-bold py-3 px-6 rounded-xl hover:shadow-elegant-lg transition-all duration-300"
          >
            Entrar no Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimpleAuthScreen;