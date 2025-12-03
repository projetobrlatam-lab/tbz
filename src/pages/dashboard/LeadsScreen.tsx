import React, { useState, useEffect, useCallback } from 'react';
import * as api from '../../api/client';
import { formatDate } from '../../utils/validation';
import { LeadWithTags } from '../../types';
import BarChart from '../../components/charts/BarChart'; // Importando o BarChart

interface LeadsScreenProps {
  dateFilter: 'all' | 'today' | 'yesterday' | 'custom';
  customDate: string;
  produto?: string;
  fonteDeTrafego?: string; // Renomeado
  tipoDeFunil?: string; // Novo campo
}

const TagIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5.5c.58 0 1.13.2 1.55.55L20.5 12l-8.5 8.5-8.5-8.5V7c0-2.21 1.79-4 4-4z" />
  </svg>
);

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

const getTagColor = (category: string) => {
  switch (category) {
    case 'Status do Funil': return 'bg-secondary-light text-secondary-dark';
    case 'Nível de Urgência': return 'bg-primary-light text-primary-dark';
    case 'Interesse': return 'bg-accent-light text-accent-dark';
    case 'Outros': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getBarColor = (tagName: string) => {
  if (tagName.includes('Crítica')) return 'bg-primary';
  if (tagName.includes('Elevada')) return 'bg-warning';
  if (tagName.includes('Atenção')) return 'bg-warning-dark';
  if (tagName.includes('Capturado')) return 'bg-accent';
  if (tagName.includes('Iniciado')) return 'bg-secondary';
  if (tagName.includes('Completo')) return 'bg-accent-dark';
  if (tagName.includes('Checkout')) return 'bg-secondary-dark';
  return 'bg-gray-500';
};

const getUrgencyColor = (urgencyLevel: string | null) => {
  switch (urgencyLevel) {
    case 'EMERGENCIAL':
    case 'emergency': return 'bg-primary text-white';
    case 'CRÍTICA':
    case 'critical': return 'bg-primary-dark text-white';
    case 'ALTA':
    case 'high': return 'bg-warning-dark text-white';
    case 'MÉDIA':
    case 'medium': return 'bg-warning text-white';
    case 'BAIXA':
    case 'low': return 'bg-accent text-white';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getUrgencyText = (urgencyLevel: string | null) => {
  switch (urgencyLevel) {
    case 'EMERGENCIAL':
    case 'emergency': return 'Emergencial';
    case 'CRÍTICA':
    case 'critical': return 'Crítica';
    case 'ALTA':
    case 'high': return 'Alta';
    case 'MÉDIA':
    case 'medium': return 'Média';
    case 'BAIXA':
    case 'low': return 'Baixa';
    default: return 'Não definido';
  }
};

const LeadDetail: React.FC<{ lead: LeadWithTags | null }> = ({ lead }) => {
  if (!lead) return <p className="text-gray-500">Nenhum lead encontrado com o ID fornecido.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Nome</h4>
        <p className="text-lg text-gray-900 font-semibold">{lead.name || 'Não informado'}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">E-mail</h4>
          <p className="text-gray-800">{lead.email || 'Não informado'}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Nível de Urgência</h4>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold mt-2 ${getUrgencyColor(lead.urgency_level)}`}>
            {getUrgencyText(lead.urgency_level)}
          </span>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Telefone</h4>
          <p className="text-gray-800">{lead.phone || 'Não informado'}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">ID do Tráfego</h4>
          <p className="text-gray-800">{lead.traffic_id || 'Não informado'}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Data de Criação</h4>
          <p className="text-gray-800">{formatDate(lead.created_at)}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Produto</h4>
          <p className="text-gray-800">{lead.produto}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Fonte de Tráfego</h4>
          <p className="text-gray-800">{lead.fonte_de_trafego || 'Desconhecida'}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Tipo de Funil</h4>
          <p className="text-gray-800">{lead.tipo_de_funil || 'Desconhecido'}</p>
        </div>
      </div>
      <div>
        <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Iniciou Checkout</h4>
        <div className="mt-2">
          {lead.tags && lead.tags.some(tag => tag.tag_name === 'Checkout Iniciado') ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
              Sim
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
              Não
            </span>
          )}
        </div>
      </div>
      {lead.ai_analysis_data && (
        <div>
          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Análise de IA ({lead.ai_tag_name || 'N/A'})</h4>
          <pre className="bg-gray-100 p-4 rounded-md text-xs overflow-auto mt-2 max-h-60">
            {JSON.stringify(lead.ai_analysis_data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

const LeadsScreen: React.FC<LeadsScreenProps> = ({ dateFilter, customDate, produto, fonteDeTrafego, tipoDeFunil }) => { // Assinatura atualizada
  const [leads, setLeads] = useState<LeadWithTags[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tagSourceFilter, setTagSourceFilter] = useState<'all' | 'Quiz' | 'Agente IA' | 'Desconhecido'>('all');

  const [searchLeadId, setSearchLeadId] = useState('');
  const [searchedLead, setSearchedLead] = useState<LeadWithTags | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('[LeadsScreen] Filtros recebidos:', {
        dateFilter,
        customDate,
        produto,
        tagSourceFilter,
        fonteDeTrafego,
        tipoDeFunil
      });
      const fetchedLeads = await api.getLeadsWithTags(dateFilter, customDate, produto, tagSourceFilter, fonteDeTrafego, tipoDeFunil); // Assinatura atualizada
      console.log('[LeadsScreen] Leads retornados:', fetchedLeads);
      setLeads(fetchedLeads);
    } catch (err: any) {
      console.error('Erro ao buscar leads:', err);
      setError(err.message || 'Não foi possível carregar os leads.');
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [dateFilter, customDate, produto, tagSourceFilter, fonteDeTrafego, tipoDeFunil]); // Dependências atualizadas

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleSearchLead = async () => {
    if (!searchLeadId.trim()) {
      setSearchError('Por favor, insira um ID de lead.');
      return;
    }
    setIsSearching(true);
    setSearchError(null);
    setSearchedLead(null);
    try {
      const lead = await api.getSingleLead(searchLeadId.trim());
      setSearchedLead(lead);
      setIsModalOpen(true);
    } catch (err: any) {
      setSearchError(err.message || 'Lead não encontrado ou erro na busca.');
      setIsModalOpen(true); // Abrir modal para mostrar o erro
    } finally {
      setIsSearching(false);
    }
  };

  // --- Lógica de Agregação de Tags para o Gráfico ---
  const aggregateTags = useCallback(() => {
    const tagCounts: { [key: string]: number } = {};

    leads.forEach(lead => {
      lead.tags.forEach(tag => {
        const tagName = tag.tag_name;
        tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
      });
    });

    return Object.entries(tagCounts)
      .map(([label, value]) => ({
        label,
        value,
        color: getBarColor(label)
      }))
      .sort((a, b) => b.value - a.value);
  }, [leads]);

  const tagChartData = aggregateTags();
  // --- Fim da Lógica de Agregação de Tags ---

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">CRM - Leads Detalhados</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Gráfico de Tags */}
        <BarChart
          title="Distribuição de Leads por Tags"
          data={tagChartData}
          totalCount={leads.length}
          unit="leads"
        />

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 my-6">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label htmlFor="tagSourceFilter" className="text-sm font-medium text-gray-700 mr-2">Filtrar Tags por Origem:</label>
              <select
                id="tagSourceFilter"
                value={tagSourceFilter}
                onChange={(e) => setTagSourceFilter(e.target.value as 'all' | 'Quiz' | 'Agente IA' | 'Desconhecido')}
                className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Todas as Origens</option>
                <option value="Quiz">Quiz</option>
                <option value="Agente IA">Agente IA</option>
                <option value="Desconhecido">Desconhecido</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <label htmlFor="leadIdSearch" className="text-sm font-medium text-gray-700">Buscar por ID:</label>
              <input
                id="leadIdSearch"
                type="text"
                value={searchLeadId}
                onChange={(e) => setSearchLeadId(e.target.value)}
                placeholder="Cole o ID do lead aqui"
                className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={handleSearchLead}
                disabled={isSearching}
                className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300"
              >
                {isSearching ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Lista de Leads ({leads.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome / Contato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Traffic ID
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
                    Nível de Urgência
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Iniciou Checkout
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data de Criação
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-4 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-gray-500">Carregando leads...</p>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-red-500">
                      {error}
                    </td>
                  </tr>
                ) : leads.length > 0 ? (
                  leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{lead.name || 'N/A'}</div>
                        {lead.email && <div className="text-sm text-gray-500">{lead.email}</div>}
                        {lead.phone && <div className="text-sm text-gray-500">{lead.phone}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lead.traffic_id || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lead.produto}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex flex-col">
                          <span>{lead.fonte_de_trafego || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex flex-col">
                          <span>{lead.tipo_de_funil || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getUrgencyColor(lead.urgency_level)}`}>
                          {getUrgencyText(lead.urgency_level)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {lead.iniciar_checkout ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Sim
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Não
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(lead.created_at)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <p className="text-gray-500">Nenhum lead encontrado para o filtro selecionado.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Detalhes do Lead">
        {isSearching ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : searchError ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 font-medium">Erro ao buscar</p>
            <p className="text-red-600 text-sm">{searchError}</p>
          </div>
        ) : (
          <LeadDetail lead={searchedLead} />
        )}
      </Modal>
    </div>
  );
};

export default LeadsScreen;