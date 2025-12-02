import { serve } from "https://deno.land/std@0.190.0/http/server.ts" // Revertido para usar a URL direta
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', // Garantir que GET e POST são permitidos
  'Access-Control-Max-Age': '86400',
}

interface VisitData {
  id: string;
  session_id: string;
  ip_address: string;
  country_code: string;
  city: string;
  country_name: string;
  user_agent: string;
  referrer: string | null;
  landing_page: string | null;
  produto: string;
  fonte_de_trafego: string | null; // Renomeado
  tipo_de_funil: string | null; // Adicionado
  created_at: string;
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
    
    let date_filter: string | null = null;
    let custom_date: string | null = null;
    let produto: string | null = null; 
    let fonte_de_trafego: string | null = null; // Renomeado
    let tipo_de_funil: string | null = null; // Adicionado

    if (req.method === 'GET') {
      const url = new URL(req.url);
      date_filter = url.searchParams.get('date_filter');
      custom_date = url.searchParams.get('custom_date');
      produto = url.searchParams.get('produto');
      fonte_de_trafego = url.searchParams.get('fonte_de_trafego'); // Renomeado
      tipo_de_funil = url.searchParams.get('tipo_de_funil'); // Adicionado
    } else if (req.method === 'POST') {
      const body = await req.json();
      date_filter = body.date_filter;
      custom_date = body.custom_date;
      produto = body.produto;
      fonte_de_trafego = body.fonte_de_trafego; // Renomeado
      tipo_de_funil = body.tipo_de_funil; // Adicionado
    }
    
    const effectiveDateFilter = date_filter || 'all';
    
    let query = supabase
      .schema('public')
      .from('oreino360-visitas') 
      .select('id, session_id, ip_address, country_code, city, country_name, user_agent, referrer, landing_page, created_at, produto, fonte_de_trafego, tipo_de_funil') // Usando fonte_de_trafego e tipo_de_funil
      .order('created_at', { ascending: false })
    
    if (produto && produto !== 'all') {
      query = query.eq('produto', produto);
    }
    if (fonte_de_trafego && fonte_de_trafego !== 'all') { // Renomeado
      query = query.eq('fonte_de_trafego', fonte_de_trafego);
    }
    if (tipo_de_funil && tipo_de_funil !== 'all') { // Adicionado
      query = query.eq('tipo_de_funil', tipo_de_funil);
    }

    const now = new Date()
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    
    switch (effectiveDateFilter) {
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
    
    const { data, error } = await query.limit(100)
    
    if (error) {
      // Logar o erro do Supabase para debug
      console.error("Supabase Query Error in get-visits:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const mappedData = data?.map((visit: VisitData) => ({
        id: visit.id,
        session_id: visit.session_id,
        ip_address: visit.ip_address,
        country_code: visit.country_code,
        city: visit.city,
        country_name: visit.country_name,
        user_agent: visit.user_agent,
        referrer: visit.referrer,
        landing_page: visit.landing_page,
        produto: visit.produto,
        fonte_de_trafego: visit.fonte_de_trafego, // Mapeia fonte_de_trafego
        tipo_de_funil: visit.tipo_de_funil, // Mapeia tipo_de_funil
        created_at: visit.created_at,
    })) || [];
    
    return new Response(
      JSON.stringify({ visits: mappedData }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error: unknown) {
    console.error("Error in get-visits function:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})