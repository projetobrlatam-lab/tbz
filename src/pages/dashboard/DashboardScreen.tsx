import React from 'react';

interface DashboardScreenProps {
  totalQuestions: number;
}

const DashboardScreen: React.FC<DashboardScreenProps> = () => {
  console.log('DashboardScreen Simplificado Renderizado');
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-green-600 mb-4">Dashboard Carregado com Sucesso!</h1>
        <p className="text-gray-700">Se você está vendo isso, o problema estava no código do Dashboard antigo.</p>
        <p className="text-sm text-gray-500 mt-4">Versão do React: {React.version}</p>
      </div>
    </div>
  );
};

export default DashboardScreen;