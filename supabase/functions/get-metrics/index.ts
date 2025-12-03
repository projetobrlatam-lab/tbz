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
    // Obter parâmetros da URL para requisições GET
    const url = new URL(req.url);
    const date_filter = url.searchParams.get('date_filter') || 'all';
    const custom_date = url.searchParams.get('custom_date');
    const produto = url.searchParams.get('produto');
    const fonte_de_trafego = url.searchParams.get('fonte_de_trafego');
    const tipo_de_funil = url.searchParams.get('tipo_de_funil');

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('PROD_SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('PROD_SUPABASE_KEY');

    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL environment variable is not set for the Edge Function.');
    }
    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set for the Edge Function.');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Queries base - Usando schema 'tbz'
    let eventsQuery = supabase.schema('tbz').from('eventos').select('id, event_type, produto, event_data, created_at');
    let abandonmentQuery = supabase.schema('tbz').from('abandono').select('id, step_where_abandoned, created_at, produto');
    let salesQuery = supabase.schema('tbz').from('compras').select('id, product_value, produto, purchase_date');
    let uniqueVisitsQuery = supabase.schema('tbz').from('identificador').select('fingerprint_hash, created_at'); // Identificador não tem produto direto, mas pode ser filtrado via join se necessário, ou assumir global. No schema novo, identificador é global.
    // Para filtrar visitas por produto, o ideal seria olhar para 'sessoes' ou 'visitas', mas 'identificador' é usado para contagem única de visitantes.
    // Se quisermos visitas únicas por produto, deveríamos olhar para 'sessoes' agrupado por fingerprint_hash.
    // Vamos manter a lógica original o máximo possível, mas adaptando.
    // Se o filtro de produto estiver ativo, 'identificador' pode não ser a melhor tabela se não tiver produto.
    // Mas no schema antigo tinha 'produto'. No novo, 'identificador' é device-centric.
    // Vamos usar 'sessoes' para contar visitantes únicos por produto.
    let sessionsQuery = supabase.schema('tbz').from('sessoes').select('fingerprint_hash, created_at, produto, fonte_de_trafego, tipo_de_funil');

    // Query base para leads
    let leadsQuery = supabase.schema('tbz').from('leads').select('id, created_at');

    // Query para comentários do Instagram
    let commentsQuery = supabase.schema('tbz').from('instagram_comments').select('id, created_at, traffic_id');

    // Aplicação de filtros de Produto
    if (produto && produto !== 'all') {
      eventsQuery = eventsQuery.eq('produto', produto);
      abandonmentQuery = abandonmentQuery.eq('produto', produto);
      salesQuery = salesQuery.eq('produto', produto);
      sessionsQuery = sessionsQuery.eq('produto', produto); // Filtrando sessões por produto

      // Filtrar leads usando subquery (EXISTS) na tabela lead_products
      leadsQuery = leadsQuery.filter('id', 'in', supabase.schema('tbz').from('lead_products').select('lead_id').eq('produto', produto));
    }

    // Aplicação de filtros de Fonte de Tráfego e Tipo de Funil
    // Eventos não tem fonte_de_trafego direto na tabela eventos (está em sessoes), precisaria de join.
    // Mas no track-main eu adicionei fonte_de_trafego e tipo_de_funil em eventos? Não, só em sessoes.
    // Espera, no track-main antigo tinha. No novo schema 3NF, está em sessoes.
    // Para filtrar eventos por fonte de tráfego, precisamos filtrar as sessões e pegar os IDs.
    // Isso complica um pouco a query simples.
    // Vamos simplificar: se tiver filtro de tráfego, pegamos as sessões primeiro.

    let sessionIdsFilter: string[] | null = null;

    if ((fonte_de_trafego && fonte_de_trafego !== 'all') || (tipo_de_funil && tipo_de_funil !== 'all')) {
      let sessionFilterQuery = supabase.schema('tbz').from('sessoes').select('id');

      if (fonte_de_trafego && fonte_de_trafego !== 'all') {
        sessionFilterQuery = sessionFilterQuery.eq('fonte_de_trafego', fonte_de_trafego);
        sessionsQuery = sessionsQuery.eq('fonte_de_trafego', fonte_de_trafego);
      }
      if (tipo_de_funil && tipo_de_funil !== 'all') {
        sessionFilterQuery = sessionFilterQuery.eq('tipo_de_funil', tipo_de_funil);
        sessionsQuery = sessionsQuery.eq('tipo_de_funil', tipo_de_funil);
      }

      // Se tiver filtro de data, também aplicar aqui para não pegar sessões de todo o histórico
      // (Lógica de data repetida abaixo, idealmente refatorar, mas vamos manter simples)

      // Nota: Fazer subquery 'in' com muitas sessões pode ser lento.
      // O ideal seria fazer join, mas o client JS tem limitações.
      // Vamos usar o modifier !inner se fizéssemos select com join, mas aqui estamos com queries separadas.
      // Vamos tentar usar o filtro .filter('session_id', 'in', ...) na query de eventos.

      // eventsQuery = eventsQuery.filter('session_id', 'in', sessionFilterQuery); // Isso funciona se sessionFilterQuery for um builder? Sim, o supabase-js suporta subqueries assim.

      // Mas espere, o supabase-js espera uma string para o valor da subquery se for RPC, mas para filter...
      // A sintaxe correta para subquery no filter é passar o builder? Não, geralmente é string.
      // Vamos tentar a abordagem de filtrar via 'sessoes' na query principal se possível.
      // Supabase permite: .select('*, sessoes!inner(*)')

      // Vamos reestruturar para usar joins onde possível para filtros.
      // Events -> Sessoes
      eventsQuery = supabase.schema('tbz').from('eventos').select('id, event_type, produto, event_data, created_at, sessoes!inner(fonte_de_trafego, tipo_de_funil)');

      if (fonte_de_trafego && fonte_de_trafego !== 'all') {
        eventsQuery = eventsQuery.eq('sessoes.fonte_de_trafego', fonte_de_trafego);
      }
      if (tipo_de_funil && tipo_de_funil !== 'all') {
        eventsQuery = eventsQuery.eq('sessoes.tipo_de_funil', tipo_de_funil);
      }
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
      sessionsQuery = sessionsQuery.gte('created_at', startDate.toISOString()).lt('created_at', endDate.toISOString());

      // Filtrar leads por data de criação
      leadsQuery = leadsQuery.gte('created_at', startDate.toISOString()).lt('created_at', endDate.toISOString());

      // Filtrar comentários por data de criação
      commentsQuery = commentsQuery.gte('created_at', startDate.toISOString()).lt('created_at', endDate.toISOString());
    }

    const { data: events } = await eventsQuery;
    const { data: abandonments } = await abandonmentQuery;
    const { data: sales } = await salesQuery;
    const { data: sessions } = await sessionsQuery;
    const { data: leads } = await leadsQuery;
    const { data: comments } = await commentsQuery;

    // Calcular visitas únicas baseadas em fingerprint_hash das sessões
    // Como sessionsQuery já filtrou por produto/data/trafego, podemos usar direto.
    // Precisamos dedup por fingerprint_hash.
    const uniqueFingerprints = new Set(sessions?.map((s: any) => s.fingerprint_hash));
    const totalUniqueVisits = uniqueFingerprints.size;

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
          return;
        }
        if (!abandonmentByStep[step]) {
          abandonmentByStep[step] = { abandoned_count: 0 };
        }
        abandonmentByStep[step].abandoned_count += 1;
      });
    }

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