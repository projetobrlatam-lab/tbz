import React, { useState, useEffect, useCallback } from 'react';
import { debounce } from 'lodash';
import { supabase } from '../../integrations/supabase/client';
import * as api from '../../api/client';
import { User, Session } from '@supabase/supabase-js';
const Reino360Logo = '/reino-360-logo.png';

import BuyersScreen from './BuyersScreen';
import VisitsScreen from './VisitsScreen';
import LeadsScreen from './LeadsScreen';
import AbandonmentScreen from './AbandonmentScreen';
import ProductsScreen from './ProductsScreen';
import BarChart from '../../components/charts/BarChart';

interface DashboardScreenProps {
  totalQuestions: number;
}

const UsersIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
  </svg>
);

const PlayIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const UserCheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ShoppingCartIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6" />
  </svg>
);

const FilterIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
  </svg>
);

const XCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ArrowRightCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const DollarSignIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V3m0 9v3m0 3.545c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ChatBubbleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);


const MetricCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string; }> = ({ title, value, icon, color }) => (
  <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600 uppercase tracking-wider">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
      </div>
      <div className={`p-3 rounded-full ${color}`}>
        {icon}
      </div>
    </div>
  </div>
);

const FunnelChart: React.FC<{ data: Array<{ step: string; count: number; percentage: number }> }> = ({ data }) => {
  const maxCount = data[0]?.count || 1; // O primeiro passo (Visitas) é o máximo

  const getStepColor = (step: string) => {
    switch (step) {
      case 'Visitas': return 'bg-blue-500';
      case 'Quiz Iniciado': return 'bg-green-500';
      case 'Leads Gerados': return 'bg-yellow-500';
      case 'Quiz Completo': return 'bg-purple-500';
      case 'Checkout Iniciado': return 'bg-pink-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 mt-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Funil de Conversão</h2>
      <div className="space-y-6">
        {data.map((item, index) => {
          const widthPercentage = (item.count / maxCount) * 100;
          const color = getStepColor(item.step);

          return (
            <div key={index} className="relative">
              <div className="flex justify-between items-end mb-1">
                <span className="text-sm font-medium text-gray-700">{item.step}</span>
                <span className="text-xs font-semibold text-gray-500">{item.percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-8 relative overflow-hidden">
                <div
                  className={`h-8 rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-3 ${color}`}
                  style={{ width: `${widthPercentage}%` }}
                >
                  <span className="text-sm font-bold text-white drop-shadow-md">{item.count}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const DashboardScreen: React.FC<DashboardScreenProps> = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'abandonment' | 'visits' | 'buyers' | 'crm' | 'products'>('overview');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'custom'>('all');
  const [customDate, setCustomDate] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [selectedFonteDeTrafego, setSelectedFonteDeTrafego] = useState<string>('all');
  const [selectedTipoDeFunil, setSelectedTipoDeFunil] = useState<string>('all');

  const [session, setSession] = useState<Session | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [products, setProducts] = useState<any[]>([]);

  // Fetch products for filter
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await api.getProducts();
        setProducts(data);
      } catch (err) {
        console.error('Erro ao carregar produtos para filtro:', err);
      }
    };
    loadProducts();
  }, []);

  // Debounced version of fetchInitialData
  const debouncedFetchInitialData = useCallback(
    debounce(async () => {
      if (!isAuthenticated) return;

      console.log('🔄 [DashboardScreen] Iniciando fetchInitialData...');
      setLoading(true);
      try {
        setError(null);
        const fetchedMetrics = await api.getMetrics(dateFilter, customDate, selectedProduct, selectedFonteDeTrafego, selectedTipoDeFunil);
        console.log('📊 [DashboardScreen] Dados recebidos:', fetchedMetrics);

        setMetrics((prevMetrics: any) => {
          return fetchedMetrics;
        });

        console.log('✅ [DashboardScreen] Estado atualizado com sucesso!');
      } catch (err: any) {
        console.error('❌ [DashboardScreen] Erro ao buscar métricas:', err);
        setError(err.message || 'Não foi possível carregar os dados.');
      } finally {
        setLoading(false);
      }
    }, 1000),
    [isAuthenticated, dateFilter, customDate, selectedProduct, selectedFonteDeTrafego, selectedTipoDeFunil]
  );

  const fetchInitialData = useCallback(async () => {
    debouncedFetchInitialData();
  }, [debouncedFetchInitialData]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Authentication state management
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setIsAuthenticated(!!session);
      } catch (error) {
        console.error('[DashboardScreen] Error checking authentication:', error);
        setIsAuthenticated(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Realtime subscription
  useEffect(() => {
    if (!isAuthenticated || !session) {
      return;
    }

    let channel: any = null;

    const setupRealtime = () => {
      channel = supabase
        .channel('dashboard-realtime-updates')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'oreino360-eventos' }, () => fetchInitialData())
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'oreino360-identificador' }, () => fetchInitialData())
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'oreino360-abandono' }, () => fetchInitialData())
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'oreino360-compras' }, () => fetchInitialData())
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'oreino360-leads' }, () => fetchInitialData())
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'oreino360-lead_tag_assignments' }, () => fetchInitialData())
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'oreino360-sessoes' }, () => fetchInitialData())
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'oreino360-leads' }, () => fetchInitialData())
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'oreino360-sessoes' }, () => fetchInitialData())
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (channel) {
        channel.unsubscribe();
        channel = null;
      }
    };
  }, [isAuthenticated, fetchInitialData]);

  const handleClearMetrics = async () => {
    if (confirm('Tem certeza que deseja limpar todas as métricas? Esta ação não pode ser desfeita.')) {
      try {
        await api.clearAllMetrics();
        alert('Métricas limpas com sucesso!');
        fetchInitialData();
      } catch (err: any) {
        alert(`Erro ao limpar métricas: ${err.message}`);
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('isAuthenticated');
  };

  const {
    total_visits,
    total_comments,
    total_quiz_starts,
    total_leads,
    total_quiz_complete,
    total_checkout_starts,
    total_abandonments,
    total_sales,
    total_sales_value,
    conversion_rates,
    funnel_data,
    abandonment_by_step,
    comments_to_visits_conversion
  } = metrics || {};

  const quizStartConversionRate = conversion_rates?.visit_to_quiz_start || 0;
  const leadConversionFromVisits = conversion_rates?.quiz_start_to_lead || 0;
  const checkoutConversionFromQuizComplete = conversion_rates?.quiz_complete_to_checkout || 0;
  const abandonmentRateFromVisits = total_visits > 0 ? Math.round((total_abandonments / total_visits) * 100) : 0;
  const salesConversionFromLeads = total_leads > 0 ? Math.round((total_sales / total_leads) * 100) : 0;

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <img src={Reino360Logo} alt="Reino 360" className="h-12 w-auto" />
            </div>
            <div className="flex items-center space-x-4">
              {/* Filtro de Produto */}
              <div className="flex items-center space-x-2">
                <FilterIcon className="w-5 h-5 text-gray-400" />
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Todos os Produtos</option>
                  {products.map(p => (
                    <option key={p.id} value={p.slug}>{p.name}</option>
                  ))}
                  {products.length === 0 && <option value="tbz">TBZ (Padrão)</option>}
                </select>
              </div>

              {/* Filtro Tipo de Funil */}
              <div className="flex items-center space-x-2">
                <select
                  id="funnelTypeFilter"
                  value={selectedTipoDeFunil}
                  onChange={(e) => setSelectedTipoDeFunil(e.target.value)}
                  className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Todos os Funis</option>
                  <option value="quiz">Quiz</option>
                  <option value="agente_ia">Agente IA</option>
                </select>
              </div>

              {/* Filtro Fonte de Tráfego */}
              <div className="flex items-center space-x-2">
                <select
                  id="trafficSourceFilter"
                  value={selectedFonteDeTrafego}
                  onChange={(e) => setSelectedFonteDeTrafego(e.target.value)}
                  className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Todas as Fontes</option>
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="google">Google</option>
                  <option value="email">Email</option>
                  <option value="direct">Direto</option>
                  <option value="instagram_dm">Instagram DM</option>
                  <option value="quiz">Quiz</option>
                </select>
              </div>

              {/* Filtro de Data */}
              <div className="flex items-center space-x-2">
                <FilterIcon className="w-5 h-5 text-gray-400" />
                <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value as any)} className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="all">Todos os períodos</option>
                  <option value="today">Hoje</option>
                  <option value="yesterday">Ontem</option>
                  <option value="custom">Data personalizada</option>
                </select>
                {dateFilter === 'custom' && (
                  <input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className="bg-white border-l border-gray-300 ml-2 pl-2 focus:outline-none" />
                )}
              </div>
              <button onClick={handleClearMetrics} className="text-sm bg-red-600 text-white font-semibold py-2 px-3 rounded-lg hover:bg-red-700 transition-colors">Limpar Métricas</button>
              <button onClick={handleLogout} className="text-sm bg-gray-600 text-white font-semibold py-2 px-3 rounded-lg hover:bg-gray-700 transition-colors">Sair</button>
            </div>
          </div>
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
            {['overview', 'abandonment', 'visits', 'buyers', 'crm', 'products'].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab as any)} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                {{ overview: 'Visão Geral', abandonment: 'Abandono', visits: 'Visitas', buyers: 'Compradores', crm: 'Leads', products: 'Produtos' }[tab]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto"></div><p className="mt-4 text-gray-600">Carregando dados...</p></div>
        ) : error ? (
          <div className="text-center py-20 text-red-500">{error}</div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                  <MetricCard title="Total de Comentários" value={total_comments || 0} icon={<ChatBubbleIcon className="w-6 h-6 text-white" />} color="bg-secondary-light" />
                  <MetricCard title="Visitas" value={total_visits || 0} icon={<UsersIcon className="w-6 h-6 text-white" />} color="bg-secondary" />
                  <MetricCard
                    title="Conversão Comentários"
                    value={`${comments_to_visits_conversion || 0}%`}
                    icon={<ArrowRightCircleIcon className="w-6 h-6 text-white" />}
                    color="bg-secondary-dark"
                  />
                  <MetricCard title="Quiz Iniciados" value={total_quiz_starts || 0} icon={<PlayIcon className="w-6 h-6 text-white" />} color="bg-accent" />
                  <MetricCard
                    title="Conversão Quiz Iniciado"
                    value={`${quizStartConversionRate}%`}
                    icon={<ArrowRightCircleIcon className="w-6 h-6 text-white" />}
                    color="bg-accent-dark"
                  />

                  <MetricCard title="Leads" value={total_leads || 0} icon={<UserCheckIcon className="w-6 h-6 text-white" />} color="bg-warning" />
                  <MetricCard
                    title="Conversão Leads"
                    value={`${leadConversionFromVisits}%`}
                    icon={<ArrowRightCircleIcon className="w-6 h-6 text-white" />}
                    color="bg-warning-dark"
                  />
                  <MetricCard title="Total Abandonos" value={total_abandonments || 0} icon={<XCircleIcon className="w-6 h-6 text-white" />} color="bg-primary" />
                  <MetricCard
                    title="Percentual de Abandono"
                    value={`${abandonmentRateFromVisits}%`}
                    icon={<XCircleIcon className="w-6 h-6 text-white" />}
                    color="bg-primary-dark"
                  />
                  <MetricCard title="Quiz Completos" value={total_quiz_complete || 0} icon={<CheckCircleIcon className="w-6 h-6 text-white" />} color="bg-accent-light" />

                  <MetricCard title="Checkouts" value={total_checkout_starts || 0} icon={<ShoppingCartIcon className="w-6 h-6 text-white" />} color="bg-secondary" />
                  <MetricCard
                    title="Conversão Checkout"
                    value={`${checkoutConversionFromQuizComplete}%`}
                    icon={<ArrowRightCircleIcon className="w-6 h-6 text-white" />}
                    color="bg-secondary-dark"
                  />
                  <MetricCard
                    title="Vendas Totais"
                    value={total_sales || 0}
                    icon={<DollarSignIcon className="w-6 h-6 text-white" />}
                    color="bg-success"
                  />
                  <MetricCard
                    title="Valor Total de Vendas"
                    value={formatCurrency(total_sales_value)}
                    icon={<DollarSignIcon className="w-6 h-6 text-white" />}
                    color="bg-secondary-dark"
                  />
                  <MetricCard
                    title="Conversão Vendas (de Leads)"
                    value={`${salesConversionFromLeads}%`}
                    icon={<ArrowRightCircleIcon className="w-6 h-6 text-white" />}
                    color="bg-secondary"
                  />
                </div>

                {/* Funnel Chart na Visão Geral */}
                {funnel_data && funnel_data.length > 0 && (
                  <FunnelChart data={funnel_data} />
                )}
              </>
            )}
            {activeTab === 'abandonment' && (
              <AbandonmentScreen
                dateFilter={dateFilter}
                customDate={customDate}
                produto={selectedProduct}
                fonteDeTrafego={selectedFonteDeTrafego}
                tipoDeFunil={selectedTipoDeFunil}
              />
            )}
            {activeTab === 'visits' && (
              <VisitsScreen dateFilter={dateFilter} customDate={customDate} produto={selectedProduct} fonteDeTrafego={selectedFonteDeTrafego} tipoDeFunil={selectedTipoDeFunil} />
            )}
            {activeTab === 'buyers' && (
              <BuyersScreen dateFilter={dateFilter} customDate={customDate} produto={selectedProduct} />
            )}
            {activeTab === 'crm' && (
              <LeadsScreen dateFilter={dateFilter} customDate={customDate} produto={selectedProduct} fonteDeTrafego={selectedFonteDeTrafego} tipoDeFunil={selectedTipoDeFunil} />
            )}
            {activeTab === 'products' && (
              <ProductsScreen />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DashboardScreen;