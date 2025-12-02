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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    // A Edge Function cleanup-old-records não precisa de um produto específico para limpar registros antigos.
    // Ela limpa registros de identificadores que são mais antigos que 30 dias, independentemente do produto.
    const { error } = await supabase
      .schema('public')
      .from('oreino360-identificador')
      .delete()
      .lt('created_at', thirtyDaysAgo)
    
    if (error) {
      throw new Error(error.message)
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Limpeza de registros antigos concluída com sucesso.',
        deletedBefore: thirtyDaysAgo
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error: unknown) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})