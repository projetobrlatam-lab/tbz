import { serve } from "https://deno.land/std@0.190.0/http/server.ts"; // Revertido para usar a URL direta
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Unauthorized: Missing Authorization header', { status: 401, headers: corsHeaders })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    const { ip_address, produto } = await req.json() // Adicionado produto
    
    if (!ip_address) {
      return new Response(
        JSON.stringify({ error: "IP address is required" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validação: produto é obrigatório
    if (!produto || typeof produto !== 'string' || produto.trim() === '') {
      console.error('[remove-ip] Produto é obrigatório e não foi fornecido ou é inválido.');
      return new Response(
        JSON.stringify({ success: false, error: 'Produto é obrigatório e não foi fornecido ou é inválido.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // A remoção do IP agora pode ser filtrada por produto, se desejado.
    // Por enquanto, remove todos os identificadores para o IP, independentemente do produto.
    const { error: cooldownError } = await supabase
      .schema('public')
      .from('oreino360-identificador')
      .delete()
      .eq('original_ip', ip_address)
      .eq('produto', produto); // Adicionado filtro por produto
    
    if (cooldownError) {
      throw new Error(`Error removing cooldown: ${cooldownError.message}`);
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Cooldown removido para o IP ${ip_address} e produto ${produto}. Você pode visitar novamente.`,
        ip_address: ip_address,
        produto: produto,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error: unknown) {
    console.error("Error in remove-ip function:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})