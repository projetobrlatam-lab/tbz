import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

interface LeadDetails {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  traffic_id: string | null;
  created_at: string;
  produto: string | null;
  fonte_de_trafego: string | null;
  tipo_de_funil: string | null;
  tags: any[] | null;
  ai_analysis_data: any | null;
  ai_tag_name: string | null;
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
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { lead_id } = await req.json()

    if (!lead_id) {
      return new Response(
        JSON.stringify({ error: 'O ID do lead é obrigatório.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: lead, error } = await supabase
      .rpc('get_single_lead_details', { p_lead_id: lead_id })
      .single<LeadDetails>() // Tipagem explícita do retorno

    if (error) {
      console.error('Erro ao buscar lead via RPC:', error);
      // Se a função não retornar nenhuma linha, o Supabase pode retornar um erro.
      // Verificamos se a mensagem indica que não há resultados.
      if (error.code === 'PGRST116') { // "exact one row expected, but 0 rows were returned"
        return new Response(
          JSON.stringify({ error: 'Lead não encontrado.' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!lead) {
      return new Response(
        JSON.stringify({ error: 'Lead não encontrado.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const leadTipoDeFunil = lead.tipo_de_funil || null;

    const inferTagSource = (tipoDeFunil: string | null): string => {
      if (tipoDeFunil === 'Agente IA') return 'Agente IA';
      if (tipoDeFunil === 'quiz') return 'quiz';
      return 'Desconhecido';
    };

    const inferTagCategory = (tagName: string): string => {
      if (tagName.startsWith('Funil:')) return 'Status do Funil';
      if (tagName.startsWith('Urgência:')) return 'Nível de Urgência';
      if (tagName.startsWith('Interesse:')) return 'Interesse';
      return 'Outros';
    };

    const tags = (lead.tags || []).map((tag: any) => ({
        ...tag,
        tag_category_inferred: inferTagCategory(tag.tag_name),
        tag_source_inferred: inferTagSource(leadTipoDeFunil),
    }));

    const formattedLead = {
      ...lead,
      tags: tags,
      produto: lead.produto || 'N/A',
    };

    return new Response(
      JSON.stringify({ lead: formattedLead }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (err: unknown) {
    console.error('Erro na função get-single-lead:', err);
    return new Response(
      JSON.stringify({ error: (err as Error).message || 'Erro interno do servidor' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})