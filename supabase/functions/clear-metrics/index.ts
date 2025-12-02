import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', // Garantir que POST é permitido
  'Access-Control-Max-Age': '86400',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      throw new Error('Missing Supabase configuration for Edge Function.');
    }

    // Criar um cliente Supabase com a service role key para operações administrativas
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // --- Verificação de Autenticação ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header missing.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    // Verificar o token JWT do usuário usando um cliente Supabase com a anon key
    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser(token);

    if (userError || !user) {
      console.error('JWT verification failed:', userError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired authentication token.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // --- Fim da Verificação de Autenticação ---

    // Prosseguir com a limpeza dos dados apenas se o usuário estiver autenticado
    console.log(`User ${user.id} (${user.email}) is authenticated. Proceeding to clear metrics.`);

    // Limpar todas as tabelas de métricas
    const tablesToClear = [
      'oreino360-abandono',
      'oreino360-eventos',
      'oreino360-sessoes',
      'oreino360-visitas',
      'oreino360-leads',
      'oreino360-lead_products',
      'oreino360-lead_traffic_details', // Nova tabela adicionada aqui
      'oreino360-identificador',
      'oreino360-compras',
    ];

    for (const tableName of tablesToClear) {
      // Adiciona a condição WHERE id IS NOT NULL para contornar a restrição do banco de dados
      const { error } = await supabaseAdmin.schema('public').from(tableName).delete().not('id', 'is', null);
      if (error) {
        console.error(`Failed to clear table ${tableName}: ${error.message}`);
        throw new Error(`Failed to clear table ${tableName}: ${error.message}`);
      }
      console.log(`Table ${tableName} cleared successfully.`);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Todas as métricas foram limpas com sucesso.' }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error: unknown) {
    console.error('Error in clear-metrics function:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})