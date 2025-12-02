import React from 'react';

interface PieChartProps {
  title: string;
  data: Array<{ label: string; value: number; color?: string }>;
  totalCount: number;
  unit: string; // Ex: 'abandonos', 'etapas'
}

const PieChart: React.FC<PieChartProps> = ({ title, data, totalCount, unit }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 mt-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{title}</h2>
        <p className="text-center text-gray-500 py-8">Nenhum dado disponível para o filtro selecionado.</p>
      </div>
    );
  }

  const defaultColors = [
    '#8B5CF6', '#06B6D4', '#EC4899', '#F59E0B', '#10B981',
    '#3B82F6', '#EF4444', '#F97316', '#84CC16', '#6366F1'
  ];

  // Calcular ângulos para o gráfico de pizza
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = 0;
  
  const segments = data.map((item, index) => {
    const percentage = (item.value / total) * 100;
    const angle = (item.value / total) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;
    
    return {
      ...item,
      percentage,
      angle,
      startAngle,
      color: item.color || defaultColors[index % defaultColors.length]
    };
  });

  // Função para criar o path do segmento SVG
  const createPath = (centerX: number, centerY: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(centerX, centerY, radius, endAngle);
    const end = polarToCartesian(centerX, centerY, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    
    return [
      "M", centerX, centerY,
      "L", start.x, start.y,
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      "Z"
    ].join(" ");
  };

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };

  const centerX = 120;
  const centerY = 120;
  const radius = 100;

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 mt-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{title}</h2>
      <p className="text-sm text-gray-500 mb-6">Total de {unit}: {totalCount}</p>
      
      <div className="flex flex-col lg:flex-row items-center justify-center space-y-6 lg:space-y-0 lg:space-x-8">
        {/* Gráfico de Pizza */}
        <div className="flex-shrink-0">
          <svg width="240" height="240" viewBox="0 0 240 240" className="drop-shadow-sm">
            {segments.map((segment, index) => {
              const endAngle = segment.startAngle + segment.angle;
              return (
                <path
                  key={index}
                  d={createPath(centerX, centerY, radius, segment.startAngle, endAngle)}
                  fill={segment.color}
                  stroke="white"
                  strokeWidth="2"
                  className="hover:opacity-80 transition-opacity duration-200"
                />
              );
            })}
          </svg>
        </div>

        {/* Legenda */}
        <div className="flex-1 min-w-0">
          <div className="space-y-3">
            {segments.map((segment, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div 
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: segment.color }}
                  ></div>
                  <span className="text-sm font-medium text-gray-700 truncate">
                    {segment.label}
                  </span>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <span className="text-lg font-bold text-gray-900">{segment.value}</span>
                  <span className="text-sm text-gray-500">({segment.percentage.toFixed(1)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PieChart;