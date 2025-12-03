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
      Deno.env.get('SUPABASE_URL') ?? Deno.env.get('PROD_SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('PROD_SUPABASE_KEY') ?? ''
    )

    const url = new URL(req.url);
    const date_filter = url.searchParams.get('date_filter') || 'all';
    const custom_date = url.searchParams.get('custom_date');

    // Lógica de filtro de data
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

    // Busca de dados (limitando o risco de timeout)
    let query = supabase
      .schema('tbz')
      .from('compras')
      .select('produto, purchase_date')
      .limit(10000);

    if (startDate && endDate) {
      query = query.gte('purchase_date', startDate.toISOString()).lt('purchase_date', endDate.toISOString());
    }

    const { data: rawData, error } = await query;

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Agregação por produto
    const aggregation: { [key: string]: { count: number, total_value: number } } = {};
    rawData.forEach((sale: any) => {
      const product = sale.produto || 'Unknown';
      const value = sale.product_value || 0; // product_value não está no select, mas a Edge Function get-sales-by-product não precisa dele para a contagem.

      aggregation[product] = aggregation[product] || { count: 0, total_value: 0 };
      aggregation[product].count += 1;
      // Não podemos somar o valor total aqui sem buscar o product_value, mas a contagem é suficiente para o gráfico de barras.
    });

    // Conversão para array e ordenação
    const aggregatedData = Object.entries(aggregation)
      .map(([produto, stats]) => ({ produto, count: stats.count }))
      .sort((a, b) => b.count - a.count);

    return new Response(
      JSON.stringify({ sales_by_product: aggregatedData }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error: unknown) {
    console.error("Error in get-sales-by-product function:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})