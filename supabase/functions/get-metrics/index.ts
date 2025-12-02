import { serve } from "https://deno.land/std@0.190.0/http/server.ts" // Revertido para usar a URL direta
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
    // Obter parâmetros da URL para requisições GET
    const url = new URL(req.url);
    const date_filter = url.searchParams.get('date_filter') || 'all';
    const custom_date = url.searchParams.get('custom_date');
    const produto = url.searchParams.get('produto'); 
    const fonte_de_trafego = url.searchParams.get('fonte_de_trafego'); // Renomeado
    const tipo_de_funil = url.searchParams.get('tipo_de_funil'); // Adicionado

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL environment variable is not set for the Edge Function.');
    }
    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set for the Edge Function.');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Queries base
    let eventsQuery = supabase.schema('public').from('oreino360-eventos').select('id, event_type, produto, event_data, created_at');
    let abandonmentQuery = supabase.schema('public').from('oreino360-abandono').select('id, step_where_abandoned, created_at');
    let salesQuery = supabase.schema('public').from('oreino360-compras').select('id, product_value, produto, purchase_date');
    let uniqueVisitsQuery = supabase.schema('public').from('oreino360-identificador').select('fingerprint_hash, created_at, produto');
    
    // Query base para leads (sempre da tabela principal)
    let leadsQuery = supabase.schema('public').from('oreino360-leads').select('id, created_at');
    
    // Query para comentários do Instagram (usando a tabela específica de comentários)
    let commentsQuery = supabase.schema('public').from('oreino360-instagram_comments').select('id, created_at, traffic_id'); 
    
    // Aplicação de filtros de Produto
    if (produto && produto !== 'all') { 
      eventsQuery = eventsQuery.eq('produto', produto);
      abandonmentQuery = abandonmentQuery.eq('produto', produto);
      salesQuery = salesQuery.eq('produto', produto);
      uniqueVisitsQuery = uniqueVisitsQuery.eq('produto', produto);
      
      // CORREÇÃO: Filtrar leads usando subquery (EXISTS) para manter a tipagem consistente
      // Isso garante que leadsQuery continue sendo um PostgrestFilterBuilder de 'oreino360-leads'
      leadsQuery = leadsQuery.filter('id', 'in', supabase.from('oreino360-lead_products').select('lead_id').eq('produto', produto));
      
      // Comentários do Instagram não têm filtro de produto (tabela independente)
      // commentsQuery não precisa de filtro de produto
    }

    // Aplicação de filtros de Fonte de Tráfego e Tipo de Funil (apenas para eventos e visitas, pois leads e vendas não têm esses campos diretamente)
    if (fonte_de_trafego && fonte_de_trafego !== 'all') { 
      eventsQuery = eventsQuery.eq('fonte_de_trafego', fonte_de_trafego);
      uniqueVisitsQuery = uniqueVisitsQuery.eq('fonte_de_trafego', fonte_de_trafego);
    }
    if (tipo_de_funil && tipo_de_funil !== 'all') { 
      eventsQuery = eventsQuery.eq('tipo_de_funil', tipo_de_funil);
      uniqueVisitsQuery = uniqueVisitsQuery.eq('tipo_de_funil', tipo_de_funil);
    }

    // Aplicação de filtros de Data
    if (date_filter && date_filter !== 'all') {
      const now = new Date();
      let startDate: Date;
      let endDate: Date;

      if (date_filter === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      } else if (date_filter === 'yesterday') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (date_filter === 'custom' && custom_date) {
        startDate = new Date(custom_date);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
      } else {
        startDate = new Date(0);
        endDate = new Date();
      }

      eventsQuery = eventsQuery.gte('created_at', startDate.toISOString()).lt('created_at', endDate.toISOString());
      abandonmentQuery = abandonmentQuery.gte('created_at', startDate.toISOString()).lt('created_at', endDate.toISOString());
      salesQuery = salesQuery.gte('purchase_date', startDate.toISOString()).lt('purchase_date', endDate.toISOString()); 
      uniqueVisitsQuery = uniqueVisitsQuery.gte('created_at', startDate.toISOString()).lt('created_at', endDate.toISOString());
      
      // Filtrar leads por data de criação
      leadsQuery = leadsQuery.gte('created_at', startDate.toISOString()).lt('created_at', endDate.toISOString());
      
      // Filtrar comentários por data de criação
      commentsQuery = commentsQuery.gte('created_at', startDate.toISOString()).lt('created_at', endDate.toISOString()); 
    }

    const { data: events } = await eventsQuery;
    const { data: abandonments } = await abandonmentQuery;
    const { data: sales } = await salesQuery; 
    const { data: uniqueIdentifiers } = await uniqueVisitsQuery;
    const { data: leads } = await leadsQuery;
    const { data: comments } = await commentsQuery; 

    const totalUniqueVisits = uniqueIdentifiers?.length || 0;
    const totalComments = comments?.length || 0;

    const getCount = (type: string) => {
      if (!events) return 0;
      return events.filter((e: any) => {
        const t = (e.event_type || '').toString().toLowerCase();
        if (type === 'checkout_start') {
          return t === 'checkout_start' || t === 'offer_click' || t === 'checkout_click';
        }
        return t === type;
      }).length || 0;
    };

    const quizStartCount = getCount('quiz_start');
    
    // Contar leads únicos
    const leadCount = leads?.length || 0;
    
    const quizCompleteCount = getCount('quiz_complete');
    const checkoutStartCount = getCount('checkout_start');
    const totalSalesCount = sales?.length || 0; 
    const totalSalesValue = sales?.reduce((sum: number, sale: { product_value: number | null; produto: string; id: string }) => sum + (sale.product_value || 0), 0) || 0;
    
    const visitToQuizStart = totalUniqueVisits > 0 ? Math.round((quizStartCount / totalUniqueVisits) * 100) : 0;
    const quizStartToLead = quizStartCount > 0 ? Math.round((leadCount / quizStartCount) * 100) : 0;
    const leadToQuizComplete = leadCount > 0 ? Math.round((quizCompleteCount / leadCount) * 100) : 0;
    const quizCompleteToCheckout = quizCompleteCount > 0 ? Math.round((checkoutStartCount / quizCompleteCount) * 100) : 0;
    const salesConversionFromLeads = leadCount > 0 ? Math.round((totalSalesCount / leadCount) * 100) : 0;
    const commentsToVisitsConversion = totalUniqueVisits > 0 ? Math.round((totalComments / totalUniqueVisits) * 100) : 0; 

    const effectiveAbandonments = abandonments || [];

    const abandonmentByStep: { [key: string]: { abandoned_count: number } } = {};
    if (effectiveAbandonments) {
      effectiveAbandonments.forEach((abandonment: any) => {
        const step = abandonment.step_where_abandoned;
        if (!step) {
          console.warn(`[get-metrics] Abandonment record with missing step_where_abandoned: ${JSON.stringify(abandonment)}`);
          return;
        }
        if (!abandonmentByStep[step]) {
          abandonmentByStep[step] = { abandoned_count: 0 };
        }
        abandonmentByStep[step].abandoned_count += 1;
      });
    }
    console.log(`[get-metrics] Calculated abandonmentByStep: ${JSON.stringify(abandonmentByStep)}`);

    const totalAbandonments = effectiveAbandonments?.length || 0;

    const metrics = {
      total_visits: totalUniqueVisits,
      total_quiz_starts: quizStartCount,
      total_leads: leadCount,
      total_quiz_complete: quizCompleteCount,
      total_checkout_starts: checkoutStartCount,
      total_sales: totalSalesCount, 
      total_sales_value: totalSalesValue,
      conversion_rates: {
        visit_to_quiz_start: visitToQuizStart,
        quiz_start_to_lead: quizStartToLead,
        lead_to_quiz_complete: leadToQuizComplete,
        quiz_complete_to_checkout: quizCompleteToCheckout,
        sales_conversion_from_leads: salesConversionFromLeads, 
      },
      funnel_data: [
        { step: 'Visitas', count: totalUniqueVisits, percentage: 100 },
        { step: 'Quiz Iniciado', count: quizStartCount, percentage: visitToQuizStart },
        { step: 'Leads Gerados', count: leadCount, percentage: quizStartToLead },
        { step: 'Quiz Completo', count: quizCompleteCount, percentage: leadToQuizComplete },
        { step: 'Checkout Iniciado', count: checkoutStartCount, percentage: quizCompleteToCheckout },
      ],
      total_abandonments: totalAbandonments,
      abandonment_by_step: abandonmentByStep,
      abandonment_rate: quizStartCount > 0 ? Math.round(((totalAbandonments) / quizStartCount) * 100) : 0,
    };
    
    return new Response(
      JSON.stringify({
        ...metrics,
        total_comments: totalComments,
        comments_to_visits_conversion: commentsToVisitsConversion,
        comments_by_date: comments?.reduce((acc: any, comment: any) => {
          const date = new Date(comment.created_at).toISOString().split('T')[0];
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {}) || {}
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error: unknown) {
    console.error('Erro no processamento da função get-metrics:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})