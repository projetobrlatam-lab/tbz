import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const n8nApiKey = Deno.env.get('N8N_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !n8nApiKey) {
      throw new Error('Configuração do Supabase ou N8N_API_KEY não encontrada.');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const requestBody = await req.json();
    const apiKey = requestBody.api_key || req.headers.get('x-api-key');

    if (!apiKey || apiKey !== n8nApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: Invalid or missing API key.' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { lead_data, product_data, traffic_data, ai_analysis_data, ai_tag_name } = requestBody; 

    if (!lead_data || !lead_data.traffic_id) {
      return new Response(
        JSON.stringify({ error: 'lead_data e lead_data.traffic_id são obrigatórios.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let leadId: string | null = null;

    // 1. UPSERT na tabela oreino360-leads
    // Determinar se é um lead válido baseado na presença de dados do formulário
    const hasFormData = lead_data.name || lead_data.email || lead_data.phone;
    const isValidLead = hasFormData ? true : false;
    
    const leadUpsertPayload: Record<string, unknown> = {
      traffic_id: lead_data.traffic_id,
      name: lead_data.name || null,
      email: lead_data.email || null,
      phone: lead_data.phone || null,
      is_valid_lead: isValidLead,
      created_at: new Date().toISOString() 
    };
    
    console.log(`[n8n-update-lead-data] Lead será ${isValidLead ? 'VÁLIDO' : 'INVÁLIDO'} - Dados do formulário: ${hasFormData ? 'SIM' : 'NÃO'}`);

    const { data: upsertedLead, error: leadError } = await supabaseAdmin
      .schema('public')
      .from('oreino360-leads')
      .upsert(leadUpsertPayload, { onConflict: 'traffic_id', ignoreDuplicates: false })
      .select('id')
      .single();

    if (leadError) {
      console.error('[n8n-update-lead-data] Falha ao upsert lead:', leadError.message);
      throw new Error(`Falha ao upsert lead: ${leadError.message}`);
    }
    leadId = upsertedLead.id;
    console.log(`[n8n-update-lead-data] Lead upserted. ID: ${leadId}`);

    // 2. UPSERT na tabela oreino360-lead_products
    if (product_data && product_data.produto) {
      const leadProductPayload = {
        lead_id: leadId,
        produto: product_data.produto,
        tipo_de_funil: product_data.tipo_de_funil || 'Agente IA', // Assume Agente IA se não for fornecido
        last_interaction_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: leadProductError } = await supabaseAdmin
        .schema('public')
        .from('oreino360-lead_products')
        .upsert(leadProductPayload, { onConflict: 'lead_id,produto', ignoreDuplicates: false });

      if (leadProductError) {
        console.error('[n8n-update-lead-data] Falha ao upsert lead_product:', leadProductError.message);
        throw new Error(`Falha ao upsert lead_product: ${leadProductError.message}`);
      }
      console.log(`[n8n-update-lead-data] Lead ${leadId} associado ao produto ${product_data.produto} e funil ${leadProductPayload.tipo_de_funil}.`);
    }

    // 3. UPSERT na tabela oreino360-lead_traffic_details
    if (traffic_data && traffic_data.fonte_de_trafego) { // Renomeado
      const leadTrafficDetailPayload = {
        lead_id: leadId,
        fonte_de_trafego: traffic_data.fonte_de_trafego, // Renomeado
        tipo_de_funil: traffic_data.tipo_de_funil || 'Agente IA', // Adiciona tipo_de_funil
        created_at: new Date().toISOString()
      };

      const { error: leadTrafficError } = await supabaseAdmin
        .schema('public')
        .from('oreino360-lead_traffic_details')
        .upsert(leadTrafficDetailPayload, { onConflict: 'lead_id,fonte_de_trafego', ignoreDuplicates: false });

      if (leadTrafficError) {
        console.error('[n8n-update-lead-data] Falha ao upsert lead_traffic_details:', leadTrafficError.message);
        throw new Error(`Falha ao upsert lead_traffic_details: ${leadTrafficError.message}`);
      }
      console.log(`[n8n-update-lead-data] Lead ${leadId} associado à fonte ${traffic_data.fonte_de_trafego}.`);
    }

    // 5. UPSERT na tabela oreino360-lead_ai_analysis
    if (ai_analysis_data && traffic_data?.fonte_de_trafego) { // Renomeado
      const { error: aiAnalysisError } = await supabaseAdmin
        .schema('public')
        .from('oreino360-lead_ai_analysis')
        .upsert({
          lead_id: leadId,
          fonte_de_trafego: traffic_data.fonte_de_trafego, // Renomeado
          tipo_de_funil: traffic_data.tipo_de_funil || 'Agente IA', // Adiciona tipo_de_funil
          ai_analysis_data: ai_analysis_data,
          ai_tag_name: ai_tag_name || null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'lead_id,fonte_de_trafego', ignoreDuplicates: false });

      if (aiAnalysisError) {
        console.error('[n8n-update-lead-data] Falha ao upsert análise de IA:', aiAnalysisError.message);
        throw new Error(`Falha ao upsert análise de IA: ${aiAnalysisError.message}`);
      }
      console.log(`[n8n-update-lead-data] Análise de IA para lead ${leadId} e fonte ${traffic_data.fonte_de_trafego} upserted com sucesso.`);
    }


    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Dados do lead atualizados com sucesso.',
        lead_id: leadId 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: unknown) {
    console.error('[n8n-update-lead-data] Erro na função:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Erro interno do servidor' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})