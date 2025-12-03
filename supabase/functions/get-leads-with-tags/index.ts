import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

// Funções de inferência
function inferTagSource(tipoDeFunil: string | null): string {
  if (tipoDeFunil === 'Agente IA') {
    return 'Agente IA';
  }
  if (tipoDeFunil === 'quiz') {
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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? Deno.env.get('PROD_SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('PROD_SUPABASE_KEY') ?? ''
    )

    const url = new URL(req.url);
    const date_filter = url.searchParams.get('date_filter') || 'all';
    const custom_date = url.searchParams.get('custom_date');
    const produto = url.searchParams.get('produto');
    const tag_source_filter = url.searchParams.get('tag_source');
    const fonte_de_trafego = url.searchParams.get('fonte_de_trafego'); // Renomeado
    const tipo_de_funil = url.searchParams.get('tipo_de_funil'); // Adicionado

    // Parâmetros para a função RPC
    const rpcParams: { [key: string]: any } = {};
    if (produto && produto !== 'all') {
      rpcParams.p_produto = produto;
    }
    if (fonte_de_trafego && fonte_de_trafego !== 'all') { // Renomeado
      rpcParams.p_fonte_de_trafego = fonte_de_trafego;
    }
    if (tipo_de_funil && tipo_de_funil !== 'all') { // Adicionado
      rpcParams.p_tipo_de_funil = tipo_de_funil;
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

    if (startDate) rpcParams.p_start_date = startDate.toISOString();
    if (endDate) rpcParams.p_end_date = endDate.toISOString();

    const { data, error } = await supabase.rpc('get_leads_with_details', rpcParams);

    if (error) {
      console.error('Erro ao chamar RPC get_leads_with_details:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const leadsWithFormattedTags = data?.map((lead: any) => {
      const leadTipoDeFunil = lead.tipo_de_funil || null;
      const tags = (lead.tags || [])
        .map((tag: any) => ({
          ...tag,
          tag_category_inferred: inferTagCategory(tag.tag_name),
          tag_source_inferred: inferTagSource(leadTipoDeFunil), // Inferência baseada no tipo_de_funil
        }))
        .filter((tagAssignment: any) => {
          return !tag_source_filter || tag_source_filter === 'all' || tagAssignment.tag_source_inferred === tag_source_filter;
        });

      return {
        ...lead,
        tags: tags,
        produto: lead.produto || 'N/A',
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
    console.error("Error in get-leads-with-tags function:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})