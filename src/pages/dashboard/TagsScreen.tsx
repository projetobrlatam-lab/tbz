import React, { useState, useEffect } from 'react';
import { supabase } from '../../integrations/supabase/client';

interface TagsScreenProps {
  dateFilter: 'all' | 'today' | 'yesterday' | 'custom';
  customDate: string;
  produto: string;
  fonteDeTrafego: string;
  tipoDeFunil: string;
}

interface TagData {
  traffic_id: string;
  produto: string;
  fonte_de_trafego: string;
  tipo_de_funil: string;
  tag_name: string;
  tag_color: string;
  assigned_at: string;
}

const TagsScreen: React.FC<TagsScreenProps> = ({ 
  dateFilter, 
  customDate, 
  produto, 
  fonteDeTrafego, 
  tipoDeFunil 
}) => {
  const [tags, setTags] = useState<TagData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTags = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('oreino360-lead_tag_assignments')
        .select(`
          traffic_id,
          produto,
          fonte_de_trafego,
          tipo_de_funil,
          oreino360-tags!inner(name, color),
          assigned_at
        `)
        .not('traffic_id', 'is', null)
        .order('assigned_at', { ascending: false });

      // Aplicar filtros de data
      if (dateFilter === 'today') {
        const today = new Date().toISOString().split('T')[0];
        query = query.gte('assigned_at', `${today}T00:00:00.000Z`)
                    .lte('assigned_at', `${today}T23:59:59.999Z`);
      } else if (dateFilter === 'yesterday') {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        query = query.gte('assigned_at', `${yesterdayStr}T00:00:00.000Z`)
                    .lte('assigned_at', `${yesterdayStr}T23:59:59.999Z`);
      } else if (dateFilter === 'custom' && customDate) {
        query = query.gte('assigned_at', `${customDate}T00:00:00.000Z`)
                    .lte('assigned_at', `${customDate}T23:59:59.999Z`);
      }

      // Aplicar filtros de produto
      if (produto !== 'all') {
        query = query.eq('produto', produto);
      }

      // Aplicar filtros de fonte de tráfego
      if (fonteDeTrafego !== 'all') {
        query = query.eq('fonte_de_trafego', fonteDeTrafego);
      }

      // Aplicar filtros de tipo de funil
      if (tipoDeFunil !== 'all') {
        query = query.eq('tipo_de_funil', tipoDeFunil);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Transformar os dados para o formato esperado
      const transformedData: TagData[] = data?.map((item: any) => ({
        traffic_id: item.traffic_id,
        produto: item.produto,
        fonte_de_trafego: item.fonte_de_trafego,
        tipo_de_funil: item.tipo_de_funil,
        tag_name: item['oreino360-tags'].name,
        tag_color: item['oreino360-tags'].color,
        assigned_at: item.assigned_at
      })) || [];

      // Filtrar para manter apenas a tag mais recente por traffic_id
      const latestTagsMap = new Map<string, TagData>();
      transformedData.forEach(tag => {
        const existing = latestTagsMap.get(tag.traffic_id);
        if (!existing || new Date(tag.assigned_at) > new Date(existing.assigned_at)) {
          latestTagsMap.set(tag.traffic_id, tag);
        }
      });

      setTags(Array.from(latestTagsMap.values()));
    } catch (err) {
      console.error('Erro ao buscar tags:', err);
      setError('Erro ao carregar dados das tags');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, [dateFilter, customDate, produto, fonteDeTrafego, tipoDeFunil]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getTagColor = (color: string) => {
    const colorMap: { [key: string]: string } = {
      'red': 'bg-red-100 text-red-800 border-red-200',
      'yellow': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'green': 'bg-green-100 text-green-800 border-green-200',
      'blue': 'bg-blue-100 text-blue-800 border-blue-200',
      'purple': 'bg-purple-100 text-purple-800 border-purple-200',
      'pink': 'bg-pink-100 text-pink-800 border-pink-200',
      'gray': 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return colorMap[color] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando tags...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
        <div className="text-center py-20 text-red-500">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">Tags por Traffic ID</h2>
        <p className="text-gray-600 mt-2">
          Visualize as tags mais recentes atribuídas por Traffic ID ({tags.length} registros)
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
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
                Tag
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Data de Criação
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tags.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  Nenhuma tag encontrada para os filtros selecionados
                </td>
              </tr>
            ) : (
              tags.map((tag, index) => (
                <tr key={`${tag.traffic_id}-${index}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {tag.traffic_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {tag.produto}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {tag.fonte_de_trafego}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {tag.tipo_de_funil}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTagColor(tag.tag_color)}`}>
                      {tag.tag_name}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(tag.assigned_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TagsScreen;