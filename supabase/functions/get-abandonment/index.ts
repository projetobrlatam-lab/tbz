import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL environment variable is not set for the Edge Function.');
    }
    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set for the Edge Function.');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const dateFilter = url.searchParams.get('dateFilter') || 'all';
    const customDate = url.searchParams.get('customDate');
    const produto = url.searchParams.get('produto');
    const fonteDeTrafego = url.searchParams.get('fonteDeTrafego');
    const tipoDeFunil = url.searchParams.get('tipoDeFunil');

    console.log('Parâmetros recebidos:', { dateFilter, customDate, produto, fonteDeTrafego, tipoDeFunil });

    let query = supabase
      .from('oreino360-abandono')
      .select('*')
      .order('created_at', { ascending: false });

    // Aplicar filtros de data
    if (dateFilter === 'today') {
      const today = new Date().toISOString().split('T')[0];
      query = query.gte('created_at', `${today}T00:00:00.000Z`)
                   .lt('created_at', `${today}T23:59:59.999Z`);
    } else if (dateFilter === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      query = query.gte('created_at', `${yesterdayStr}T00:00:00.000Z`)
                   .lt('created_at', `${yesterdayStr}T23:59:59.999Z`);
    } else if (dateFilter === 'custom' && customDate) {
      query = query.gte('created_at', `${customDate}T00:00:00.000Z`)
                   .lt('created_at', `${customDate}T23:59:59.999Z`);
    }

    // Aplicar filtros adicionais
    if (produto && produto !== 'all') {
      query = query.eq('produto', produto);
    }

    if (fonteDeTrafego && fonteDeTrafego !== 'all') {
      query = query.eq('fonte_de_trafego', fonteDeTrafego);
    }

    if (tipoDeFunil && tipoDeFunil !== 'all') {
      query = query.eq('tipo_de_funil', tipoDeFunil);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar dados de abandono:', error);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar dados de abandono', details: error.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Transformar os dados para o formato esperado pelo frontend
    const transformedData = data?.map(item => ({
      id: item.id,
      data_hora: item.created_at,
      etapa_abandono: item.step_where_abandoned || 'Não especificado',
      motivo: item.reason || 'Não especificado',
      tempo_gasto: Math.round((item.time_spent_minutes || 0) * 60), // Converter minutos para segundos
      fonte_trafego: item.fonte_de_trafego || 'Não especificado',
      tipo_funil: item.tipo_de_funil || 'Não especificado',
      traffic_id: item.traffic_id || 'Não especificado'
    })) || [];

    console.log(`Retornando ${transformedData.length} registros de abandono`);

    return new Response(
      JSON.stringify(transformedData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Erro interno:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})