import React, { useState, useEffect, useCallback } from 'react';
import * as api from '../../api/client';
import { formatDate } from '../../utils/validation';
import { Visit } from '../../types';
import BarChart from '../../components/charts/BarChart'; // Importando o novo BarChart

interface VisitsScreenProps {
  dateFilter: 'all' | 'today' | 'yesterday' | 'custom';
  customDate: string;
  produto?: string;
  fonteDeTrafego?: string; // Renomeado
  tipoDeFunil?: string; // Novo campo
}

const VisitsScreen: React.FC<VisitsScreenProps> = ({ dateFilter, customDate, produto, fonteDeTrafego, tipoDeFunil }) => { // Assinatura atualizada
  const [visits, setVisits] = useState<Visit[]>([]);
  const [locationData, setLocationData] = useState<Array<{ region_name: string; count: number }>>([]); // Tipo de estado atualizado
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getCountryFlag = (countryCode: string) => {
    const flags: { [key: string]: string } = {
      'BR': '🇧🇷',
      'US': '🇺🇸',
      'AR': '🇦🇷',
      'CL': '🇨🇱',
      'CO': '🇨🇴',
      'MX': '🇲🇽',
      'PE': '🇵🇪',
      'UY': '🇺🇾',
      'PY': '🇵🇾',
      'BO': '🇧🇴',
      'EC': '🇪🇨',
      'VE': '🇻🇪',
      'PT': '🇵🇹'
    };
    return flags[countryCode] || '🌍';
  };

  const fetchVisitsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Buscar lista detalhada de visitas
      const fetchedVisits = await api.getVisits(dateFilter, customDate, produto, fonteDeTrafego, tipoDeFunil); // Assinatura atualizada
      setVisits(fetchedVisits);

      // 2. Buscar dados agregados de localização (agora por região/estado)
      const fetchedLocations = await api.getVisitLocations(dateFilter, customDate, produto, fonteDeTrafego, tipoDeFunil); // Assinatura atualizada
      setLocationData(fetchedLocations);

    } catch (err: any) {
      console.error('Erro ao buscar dados de visitas:', err);
      setError(err.message || 'Não foi possível carregar os dados de visitas.');
      setVisits([]);
      setLocationData([]);
    } finally {
      setLoading(false);
    }
  }, [dateFilter, customDate, produto, fonteDeTrafego, tipoDeFunil]); // Dependências atualizadas

  useEffect(() => {
    fetchVisitsData();
  }, [fetchVisitsData]);

  const totalVisitsCount = visits.length;

  // Mapeando dados para o BarChart, usando region_name
  const chartData = locationData.map(loc => ({
    label: loc.region_name, // Usando o nome da região/país retornado pela Edge Function
    value: loc.count,
    color: loc.region_name === 'São Paulo' ? 'bg-accent' : undefined, // Exemplo de destaque
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Visitas Detalhadas</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary mx-auto"></div><p className="mt-4 text-gray-600">Carregando dados...</p></div>
        ) : error ? (
          <div className="text-center py-20 text-red-500">{error}</div>
        ) : (
          <>
            {/* Gráfico de Localização - Título alterado para refletir a mudança */}
            <BarChart
              title="Distribuição de Visitas por Estado/Região (Top 10)"
              data={chartData}
              totalCount={totalVisitsCount}
              unit="visitas"
            />

            {/* Tabela de Visitas */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mt-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Lista de Visitas ({visits.length})
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Endereço IP
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Localização
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Produto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fonte de Tráfego
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo de Funil
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cidade
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data/Hora
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {visits.length > 0 ? (
                      visits.map((visit) => (
                        <tr key={visit.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-mono text-sm text-gray-900">{visit.ip_address}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className="text-lg mr-2">{getCountryFlag(visit.country_code)}</span>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {visit.region_name || visit.country_name}
                                </div>
                                {visit.city && (
                                  <div className="text-sm text-gray-500">{visit.city}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {visit.produto}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {visit.fonte_de_trafego || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {visit.tipo_de_funil || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {visit.city || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(visit.created_at)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center">
                          <p className="text-gray-500">Nenhuma visita encontrada para o filtro selecionado.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VisitsScreen;