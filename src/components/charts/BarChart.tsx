import React from 'react';

interface BarChartProps {
  title: string;
  data: Array<{ label: string; value: number; color?: string }>;
  totalCount: number;
  unit: string; // Ex: 'visitas', 'vendas'
}

const BarChart: React.FC<BarChartProps> = ({ title, data, totalCount, unit }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 mt-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{title}</h2>
        <p className="text-center text-gray-500 py-8">Nenhum dado disponível para o filtro selecionado.</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value), 1);

  const defaultColors = [
    'bg-indigo-500', 'bg-teal-500', 'bg-pink-500', 'bg-yellow-500', 'bg-purple-500',
    'bg-blue-500', 'bg-green-500', 'bg-red-500', 'bg-orange-500', 'bg-cyan-500'
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 mt-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{title}</h2>
      <p className="text-sm text-gray-500 mb-6">Total de {unit}: {totalCount}</p>
      
      <div className="space-y-4">
        {data.map((item, index) => {
          const widthPercentage = (item.value / maxValue) * 100;
          const colorClass = item.color || defaultColors[index % defaultColors.length];
          const percentageOfTotal = totalCount > 0 ? ((item.value / totalCount) * 100).toFixed(1) : 0;

          return (
            <div key={item.label} className="relative">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700 truncate max-w-[60%]">{item.label}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-bold text-gray-900">{item.value}</span>
                  <span className="text-sm text-gray-500">({percentageOfTotal}%)</span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 relative overflow-hidden">
                <div 
                  className={`h-4 rounded-full transition-all duration-700 ease-out ${colorClass}`}
                  style={{ width: `${widthPercentage}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BarChart;