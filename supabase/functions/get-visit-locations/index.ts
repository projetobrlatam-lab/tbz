import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
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
    
    const url = new URL(req.url);
    const produto = url.searchParams.get('produto');
    const fonte_de_trafego = url.searchParams.get('fonte_de_trafego'); // Renomeado
    const tipo_de_funil = url.searchParams.get('tipo_de_funil'); // Adicionado
    const date_filter = url.searchParams.get('date_filter') || 'all';
    const custom_date = url.searchParams.get('custom_date');

    let query = supabase
      .schema('public')
      .from('oreino360-visitas')
      .select('country_code, region_name, created_at, produto, fonte_de_trafego, tipo_de_funil') // Adicionado region_name
      .limit(10000); 

    // Aplica filtros de produto, fonte_de_trafego e tipo_de_funil
    let filterFn = (visit: any) => {
        let passes = true;
        if (produto && produto !== 'all') {
            passes = passes && visit.produto === produto;
        }
        if (fonte_de_trafego && fonte_de_trafego !== 'all') {
            passes = passes && visit.fonte_de_trafego === fonte_de_trafego;
        }
        if (tipo_de_funil && tipo_de_funil !== 'all') {
            passes = passes && visit.tipo_de_funil === tipo_de_funil;
        }
        return passes;
    };

    // Aplica filtros de data
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    const now = new Date();

    if (date_filter === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    } else if (date_filter === 'yesterday') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (date_filter === 'custom' && custom_date) {
      const customDateObj = new Date(custom_date);
      startDate = new Date(customDateObj.getFullYear(), customDateObj.getMonth(), customDateObj.getDate());
      endDate = new Date(customDateObj.getFullYear(), customDateObj.getMonth(), customDateObj.getDate() + 1);
    }

    const { data: rawData, error } = await query;

    if (error) {
      // Logar o erro do Supabase para debug
      console.error("Supabase Query Error in get-visit-locations:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Filtragem de data e filtros de produto/funil no lado da Edge Function
    const filteredData = rawData.filter((visit: any) => {
        const visitDate = new Date(visit.created_at).getTime();
        let datePasses = true;
        if (startDate && endDate) {
            datePasses = visitDate >= startDate.getTime() && visitDate < endDate.getTime();
        }
        return datePasses && filterFn(visit);
    });

    // Agregação por region_name
    const aggregation: { [key: string]: number } = {};
    filteredData.forEach((visit: any) => {
        // Usamos region_name se for Brasil, caso contrário, usamos country_name
        const key = (visit.country_code === 'BR' && visit.region_name) ? visit.region_name : visit.country_name || 'Unknown';
        aggregation[key] = (aggregation[key] || 0) + 1;
    });

    // Conversão para array e ordenação
    const aggregatedData = Object.entries(aggregation)
        .map(([region_name, count]) => ({ region_name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10

    return new Response(
      JSON.stringify({ locations: aggregatedData }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error: unknown) {
    console.error("Error in get-visit-locations function:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})