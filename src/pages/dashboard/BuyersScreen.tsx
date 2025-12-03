import React, { useState, useEffect, useCallback } from 'react';
import * as api from '../../api/client';
import { formatDate, formatCurrency } from '../../utils/validation';
import BarChart from '../../components/charts/BarChart'; // Importando o novo BarChart

interface Sale {
  id: string;
  customer_name: string;
  customer_email: string;
  product_name: string;
  product_value: number | null;
  purchase_date: string;
  created_at: string;
  produto: string;
}

interface BuyersScreenProps {
  dateFilter: 'all' | 'today' | 'yesterday' | 'custom';
  customDate: string;
  produto?: string;
}

const BuyersScreen: React.FC<BuyersScreenProps> = ({ dateFilter, customDate, produto }) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [salesByProductData, setSalesByProductData] = useState<Array<{ produto: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSalesData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Buscar lista detalhada de vendas
      const fetchedSales = await api.getSales(dateFilter, customDate, produto);
      setSales(fetchedSales);

      // 2. Buscar dados agregados de vendas por produto (sem filtro de produto aqui, pois queremos o total)
      const fetchedSalesByProduct = await api.getSalesByProduct(dateFilter, customDate);
      setSalesByProductData(fetchedSalesByProduct);

    } catch (err: any) {
      console.error('Erro ao buscar vendas:', err);
      setError(err.message || 'Não foi possível carregar as vendas.');
      setSales([]);
      setSalesByProductData([]);
    } finally {
      setLoading(false);
    }
  }, [dateFilter, customDate, produto]);

  useEffect(() => {
    fetchSalesData();
  }, [fetchSalesData]);

  const totalSalesCount = sales.length;
  const chartData = salesByProductData.map(item => ({
    label: item.produto,
    value: item.count,
    color: item.produto === 'tbz' ? 'bg-primary' : undefined,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Compradores</h1>
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
            {/* Gráfico de Vendas por Produto */}
            <BarChart
              title="Distribuição de Vendas por Produto"
              data={chartData}
              totalCount={totalSalesCount}
              unit="vendas"
            />

            {/* Tabela de Vendas */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mt-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Lista de Compradores ({sales.length})
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nome do Cliente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Produto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valor do Produto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data/Hora da Compra
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sales.length > 0 ? (
                      sales.map((sale) => (
                        <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{sale.customer_name}</div>
                            <div className="text-sm text-gray-500">{sale.customer_email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{sale.product_name} ({sale.produto})</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(sale.product_value)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(sale.purchase_date)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center">
                          <p className="text-gray-500">Nenhuma venda encontrada para o filtro selecionado.</p>
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

export default BuyersScreen;