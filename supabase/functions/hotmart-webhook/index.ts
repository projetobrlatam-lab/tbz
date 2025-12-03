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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? Deno.env.get('PROD_SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('PROD_SUPABASE_KEY') ?? ''
    )

    const hotmartPayload = await req.json()

    console.log('Hotmart Webhook Payload:', JSON.stringify(hotmartPayload, null, 2));

    if (hotmartPayload.event === 'PURCHASE_APPROVED' || hotmartPayload.event === 'PURCHASE_COMPLETE') {
      let transaction_id: string;
      let product_name: string;
      let buyer_name: string;
      let buyer_email: string;
      let purchase_date_timestamp: number;
      let product_value: number | null = null;
      let produto_slug: string | null = null;

      try {
        transaction_id = hotmartPayload.data?.purchase?.transaction;
        product_name = hotmartPayload.data?.product?.name || 'Produto Desconhecido';
        buyer_name = hotmartPayload.data?.buyer?.name || 'Comprador Desconhecido';
        buyer_email = hotmartPayload.data?.buyer?.email || 'email@desconhecido.com';
        purchase_date_timestamp = hotmartPayload.data?.purchase?.approved_date;
        product_value = hotmartPayload.data?.purchase?.price?.value || null;
        produto_slug = hotmartPayload.data?.product?.id || null;
      } catch (destructuringError) {
        console.error('Erro ao desestruturar payload da Hotmart:', destructuringError);
        return new Response(
          JSON.stringify({ error: 'Estrutura do payload da Hotmart inesperada.', details: (destructuringError as Error).message }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      if (!transaction_id || !product_name || !buyer_name || !buyer_email || !purchase_date_timestamp || !produto_slug) {
        console.error('Payload da Hotmart incompleto: dados essenciais ausentes.', { transaction_id, product_name, buyer_name, buyer_email, purchase_date_timestamp, produto_slug });
        return new Response(
          JSON.stringify({ error: 'Dados essenciais da compra ausentes no payload.' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      let formatted_purchase_date: string;
      try {
        formatted_purchase_date = new Date(purchase_date_timestamp).toISOString();
        if (formatted_purchase_date === 'Invalid Date') {
          throw new Error(`Data de compra inválida: ${purchase_date_timestamp}`);
        }
      } catch (dateError) {
        console.error('Erro ao formatar purchase_date:', dateError, 'Raw timestamp:', purchase_date_timestamp);
        return new Response(
          JSON.stringify({ error: 'Formato de data de compra inválido.', details: (dateError as Error).message, rawTimestamp: purchase_date_timestamp }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const { data, error } = await supabaseAdmin
        .schema('tbz')
        .from('compras')
        .insert({
          customer_name: buyer_name,
          customer_email: buyer_email,
          product_name: product_name,
          product_value: product_value,
          purchase_date: formatted_purchase_date,
          hotmart_transaction_id: transaction_id,
          raw_payload: hotmartPayload,
          produto: produto_slug,
        })
        .select();

      if (error) {
        if (error.code === '23505') {
          console.warn(`Venda com transaction_id ${transaction_id} já existe. Ignorando duplicata.`);
          return new Response(
            JSON.stringify({ success: true, message: 'Venda já registrada (duplicata ignorada).' }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }
        console.error('Erro ao inserir venda no Supabase:', error);
        throw new Error(error.message);
      }

      console.log('Venda registrada com sucesso:', data);

      return new Response(
        JSON.stringify({ success: true, message: 'Venda registrada com sucesso.' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } else {
      console.log('Evento da Hotmart não é de compra aprovada, ignorando:', hotmartPayload.event);
      return new Response(
        JSON.stringify({ success: true, message: 'Evento não é de compra aprovada, ignorado.' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
  } catch (error: unknown) {
    console.error('Erro inesperado na função hotmart-webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor.', details: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})