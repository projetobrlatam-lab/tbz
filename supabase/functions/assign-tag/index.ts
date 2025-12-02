import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Configuração do Supabase não encontrada');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Removido tag_category e source do payload esperado
    const { lead_id, tag_name, produto, description } = await req.json();

    if (!lead_id || !tag_name || !produto) {
      return new Response(
        JSON.stringify({ error: 'lead_id, tag_name e produto são obrigatórios.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Encontrar ou criar a tag
    let { data: tag, error: tagError } = await supabaseAdmin
      .schema('public')
      .from('oreino360-tags')
      .select('id, name') // Removido 'category'
      .eq('name', tag_name)
      .single();

    if (tagError && tagError.code === 'PGRST116') { // No rows found
      console.log(`Tag '${tag_name}' não encontrada, criando...`);
      const { data: newTag, error: insertTagError } = await supabaseAdmin
        .schema('public')
        .from('oreino360-tags')
        .insert({ name: tag_name, description: description || null }) // Inserindo sem 'category'
        .select('id, name') // Removido 'category'
        .single();

      if (insertTagError) {
        console.error('Erro ao criar nova tag:', insertTagError.message);
        throw new Error(`Falha ao criar tag: ${insertTagError.message}`);
      }
      tag = newTag;
    } else if (tagError) {
      console.error('Erro ao buscar tag existente:', tagError.message);
      throw new Error(`Falha ao buscar tag: ${tagError.message}`);
    }

    if (!tag) {
      throw new Error('Não foi possível encontrar ou criar a tag.');
    }

    // 2. Atribuir a tag ao lead (upsert para evitar duplicatas)
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .schema('public')
      .from('oreino360-lead_tag_assignments')
      .upsert({
        lead_id: lead_id,
        tag_id: tag.id,
        produto: produto,
        assigned_at: new Date().toISOString()
      }, { onConflict: 'lead_id,tag_id,produto', ignoreDuplicates: false }) // Removido 'source' do onConflict
      .select('id, lead_id, tag_id, produto, assigned_at') // Removido 'source'
      .single();

    if (assignmentError) {
      console.error('Erro ao atribuir tag ao lead:', assignmentError.message);
      throw new Error(`Falha ao atribuir tag ao lead: ${assignmentError.message}`);
    }

    console.log(`Tag '${tag_name}' (${tag.id}) atribuída ao lead '${lead_id}' para o produto '${produto}'.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Tag atribuída com sucesso.',
        assignment: {
          ...assignment,
          tag_name: tag.name,
          // tag_category e tag_source serão inferidos no frontend/get-leads-with-tags
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error: unknown) {
    console.error('Erro na função assign-tag:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Erro interno do servidor' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})