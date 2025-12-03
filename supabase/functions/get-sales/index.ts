import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

    let date_filter: string | null = null
    let custom_date: string | null = null
    let produto: string | null = null
    let traffic_source: string | null = null;

    if (req.method === 'GET') {
      const url = new URL(req.url)
      date_filter = url.searchParams.get('date_filter')
      custom_date = url.searchParams.get('custom_date')
      produto = url.searchParams.get('produto')
      traffic_source = url.searchParams.get('traffic_source')
    } else {
      const body = await req.json()
      date_filter = body?.date_filter ?? null
      custom_date = body?.custom_date ?? null
      produto = body?.produto ?? null
      traffic_source = body?.traffic_source ?? null
    }

    const effectiveDateFilter = date_filter || 'all'

    if (!produto || (produto === 'all' && date_filter !== 'all')) {
      // Validação
    } else if (produto !== 'all' && (typeof produto !== 'string' || produto.trim() === '')) {
      console.error('[get-sales] Produto é obrigatório e não foi fornecido ou é inválido.');
      return new Response(
        JSON.stringify({ success: false, error: 'Produto é obrigatório e não foi fornecido ou é inválido.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let query = supabase
      .schema('tbz')
      .from('compras')
      .select('id, customer_name, customer_email, product_name, product_value, purchase_date, created_at, produto')
      .order('purchase_date', { ascending: false })

    if (produto && produto !== 'all') {
      query = query.eq('produto', produto)
    }

    // Filtro de traffic_source não é direto em compras. Ignorado por enquanto ou exigiria join complexo.

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    switch (effectiveDateFilter) {
      case 'today':
        query = query.gte('purchase_date', today.toISOString())
        break
      case 'yesterday':
        query = query
          .gte('purchase_date', yesterday.toISOString())
          .lt('purchase_date', today.toISOString())
        break
      case 'week': {
        const sevenDaysAgo = new Date(now)
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        query = query.gte('purchase_date', sevenDaysAgo.toISOString())
        break
      }
      case 'month': {
        const thirtyDaysAgo = new Date(now)
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        query = query.gte('purchase_date', thirtyDaysAgo.toISOString())
        break
      }
      case 'custom':
        if (custom_date) {
          const customDate = new Date(custom_date)
          const nextDay = new Date(customDate)
          nextDay.setDate(nextDay.getDate() + 1)
          query = query
            .gte('purchase_date', customDate.toISOString())
            .lt('purchase_date', nextDay.toISOString())
        }
        break
      case 'all':
      default:
        break
    }

    const { data, error } = await query.limit(100)

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({ sales: data }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})