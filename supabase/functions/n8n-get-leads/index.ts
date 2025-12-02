import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

// Funções de inferência
function inferTagSource(trafficSource: string | null): string {
  if (trafficSource === 'instagram_dm') {
    return 'Agente IA';
  }
  if (trafficSource === 'quiz') {
    return 'quiz';
  }
  return 'Desconhecido';
}

function inferTagCategory(tagName: string): string {
  if (tagName.startsWith('Funil:')) {
    return 'Status do Funil';
  }
  if (tagName.startsWith('Urgência:')) {
    return 'Nível de Urgência';
  }
  if (tagName.startsWith('Interesse:')) {
    return 'Interesse';
  }
  return 'Outros';
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    // Autenticação com chave de API personalizada para N8n
    const n8nApiKey = Deno.env.get('N8N_API_KEY');
    const requestApiKey = req.headers.get('x-api-key');

    if (!n8nApiKey || requestApiKey !== n8nApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: Invalid or missing API key.' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Configuração do Supabase não encontrada');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey); // Usando service_role_key

    const url = new URL(req.url);
    const date_filter = url.searchParams.get('date_filter') || 'all';
    const custom_date = url.searchParams.get('custom_date');
    const produto = url.searchParams.get('produto');
    const tag_source_filter = url.searchParams.get('tag_source');
    const traffic_source = url.searchParams.get('traffic_source');
    const traffic_id = url.searchParams.get('traffic_id');
    const email = url.searchParams.get('email');
    const phone = url.searchParams.get('phone');

    let query = supabase
      .schema('public')
      .from('oreino360-leads')
      .select(`
        id,
        name,
        email,
        phone,
        traffic_id,
        created_at,
        oreino360_lead_products(produto),
        oreino360_lead_traffic_details(traffic_source),
        oreino360_lead_tag_assignments(
          id,
          tag_id,
          produto,
          assigned_at,
          oreino360_tags(name)
        ),
        oreino360_lead_ai_analysis(traffic_source, ai_analysis_data, ai_tag_name)
      `)
      .eq('is_valid_lead', true)
      .order('created_at', { ascending: false });
    
    if (produto && produto !== 'all') {
      query = query.eq('oreino360_lead_products.produto', produto);
    }
    if (traffic_source && traffic_source !== 'all') {
      query = query.eq('oreino360_lead_traffic_details.traffic_source', traffic_source);
    }
    if (traffic_id) {
      query = query.eq('traffic_id', traffic_id);
    }
    if (email) {
      query = query.eq('email', email);
    }
    if (phone) {
      query = query.eq('phone', phone);
    }

    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    
    switch (date_filter) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'yesterday':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week': {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      }
      case 'month': {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 30);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      }
      case 'custom':
        if (custom_date) {
          const customDateObj = new Date(custom_date);
          startDate = new Date(customDateObj.getFullYear(), customDateObj.getMonth(), customDateObj.getDate());
          endDate = new Date(customDateObj.getFullYear(), customDateObj.getMonth(), customDateObj.getDate() + 1);
        }
        break;
      case 'all':
      default:
        break;
    }

    if (startDate && endDate) {
      query = query.gte('created_at', startDate.toISOString()).lt('created_at', endDate.toISOString());
    }
    
    const { data, error } = await query.limit(100);
    
    if (error) {
      console.error('Erro ao buscar leads com tags:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const leadsWithFormattedTags = data?.map((lead: any) => {
      const leadProduct = lead.oreino360_lead_products?.[0];
      const leadTrafficDetail = lead.oreino360_lead_traffic_details?.[0];
      const leadTrafficSource = leadTrafficDetail?.traffic_source || null;
      const aiAnalysis = lead.oreino360_lead_ai_analysis?.[0]; // Pega a análise de IA

      const tags = lead.oreino360_lead_tag_assignments
        .map((assignment: any) => {
          const tagName = assignment.oreino360_tags?.name || 'Unknown Tag';
          return {
            id: assignment.id,
            lead_id: assignment.lead_id,
            tag_id: assignment.tag_id,
            tag_name: tagName,
            tag_category_inferred: inferTagCategory(tagName),
            tag_source_inferred: inferTagSource(leadTrafficSource),
            produto: assignment.produto,
            assigned_at: assignment.assigned_at,
          };
        })
        .filter((tagAssignment: any) => {
          return tag_source_filter === 'all' || tagAssignment.tag_source_inferred === tag_source_filter;
        });

      return {
        id: lead.id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        traffic_id: lead.traffic_id,
        created_at: lead.created_at,
        produto: leadProduct?.produto || 'N/A',
        traffic_source: leadTrafficSource,
        tags: tags,
        ai_analysis_data: aiAnalysis?.ai_analysis_data || null, // Inclui a análise de IA
        ai_tag_name: aiAnalysis?.ai_tag_name || null, // Inclui o novo campo ai_tag_name
      };
    }) || [];
    
    return new Response(
      JSON.stringify({ leads: leadsWithFormattedTags }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } catch (error: unknown) {
      console.error("Error in n8n-get-leads function:", error);
      return new Response(
        JSON.stringify({ error: (error as Error).message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
  })