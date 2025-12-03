import React, { useState, useEffect, useCallback } from 'react';
import { formatDate } from '../../utils/validation';
import PieChart from '../../components/charts/PieChart';
import { getAbandonmentData } from '../../api/client';

interface AbandonmentScreenProps {
  dateFilter: 'all' | 'today' | 'yesterday' | 'custom';
  customDate: string;
  produto?: string;
  fonteDeTrafego?: string;
  tipoDeFunil?: string;
}

interface AbandonmentData {
  id: string;
  data_hora: string;
  etapa_abandono: string;
  motivo: string;
  tempo_gasto: number;
  fonte_trafego: string;
  tipo_funil: string;
  traffic_id: string;
}

// Ícones SVG customizados
const XCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const UserIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const AbandonmentScreen: React.FC<AbandonmentScreenProps> = ({
  dateFilter,
  customDate,
  produto,
  fonteDeTrafego,
  tipoDeFunil
}) => {
  const [abandonmentData, setAbandonmentData] = useState<AbandonmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAbandonmentData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Chamada real para a API
      const data = await getAbandonmentData(dateFilter, customDate, produto, fonteDeTrafego, tipoDeFunil);

      setAbandonmentData(data);
    } catch (err) {
      setError('Erro ao carregar dados de abandono');
      console.error('Erro ao buscar dados de abandono:', err);
    } finally {
      setLoading(false);
    }
  }, [dateFilter, customDate, produto, fonteDeTrafego, tipoDeFunil]);

  useEffect(() => {
    fetchAbandonmentData();
  }, [fetchAbandonmentData]);

  // Função para agregar dados por etapa de abandono para o gráfico
  const aggregateByStep = useCallback(() => {
    const stepCounts: { [key: string]: number } = {};

    abandonmentData.forEach(item => {
      const step = item.etapa_abandono;
      stepCounts[step] = (stepCounts[step] || 0) + 1;
    });

    return Object.entries(stepCounts)
      .map(([label, value]) => ({
        label,
        value,
        color: getStepColor(label)
      }))
      .sort((a, b) => b.value - a.value);
  }, [abandonmentData]);

  const getStepColor = (step: string) => {
    switch (step) {
      case 'Pergunta 1': return '#ef4444';
      case 'Pergunta 2': return '#f97316';
      case 'Pergunta 3': return '#eab308';
      case 'Pergunta 4': return '#22c55e';
      case 'Pergunta 5': return '#3b82f6';
      case 'Resultado': return '#8b5cf6';
      case 'Checkout': return '#ec4899';
      default: return '#6b7280';
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const stepChartData = aggregateByStep();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Abandonos do Quiz</h1>
              <p className="mt-1 text-sm text-gray-500">
                Visualize os abandonos registrados ({abandonmentData.length} registros)
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Gráfico de Pizza - Distribuição por Etapa de Abandono */}
        <PieChart
          title="Distribuição de Abandonos por Etapa"
          data={stepChartData}
          totalCount={abandonmentData.length}
          unit="abandonos"
        />

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Lista de Abandonos ({abandonmentData.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID do Tráfego
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Etapa do Abandono
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fonte de Tráfego
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo de Funil
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data/Hora
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-4 border-primary mx-auto"></div>
                      <p className="mt-2 text-gray-500">Carregando dados de abandono...</p>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-red-500">
                      {error}
                    </td>
                  </tr>
                ) : abandonmentData.length > 0 ? (
                  abandonmentData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center text-sm text-gray-900">
                          <UserIcon className="w-4 h-4 mr-1 text-gray-400" />
                          {item.traffic_id || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-light text-primary-dark">
                          <XCircleIcon className="w-3 h-3 mr-1" />
                          {item.etapa_abandono}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.fonte_trafego}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.tipo_funil}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(item.data_hora)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <XCircleIcon className="w-12 h-12 text-gray-300 mb-4" />
                        <p className="text-gray-500 text-lg font-medium">Nenhum abandono registrado</p>
                        <p className="text-gray-400 text-sm mt-1">Os dados de abandono aparecerão aqui quando disponíveis</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AbandonmentScreen;