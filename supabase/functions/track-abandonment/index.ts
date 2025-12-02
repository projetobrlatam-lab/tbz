import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, computeFingerprintHash, normalizeIP, normalizeAcceptLanguage } from '../_shared/utils.ts';
import { checkIfUserIsLead, removeAbandonmentForLead } from '../_shared/abandonmentUtils.ts';

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Configuração do Supabase não encontrada');
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Extrair informações do request para fingerprint
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || '';
    const acceptLanguage = req.headers.get('accept-language') || '';

    const { session_id, reason, step_where_abandoned, produto, fonte_de_trafego, tipo_de_funil, email, traffic_id, utm_source, utm_medium, fingerprint_hash: providedFingerprintHash } = await req.json()
    
    // Prioriza utm_source/utm_medium se disponíveis, senão usa fonte_de_trafego/traffic_id
    const finalFonteDeTrafego = utm_source || fonte_de_trafego || null;
    const finalTrafficId = utm_medium || traffic_id || null;
    
    console.log(`[track-abandonment] Received request: reason=${reason}, step=${step_where_abandoned}, produto=${produto}`); 

    if (!produto || typeof produto !== 'string' || produto.trim() === '') {
      console.error('[track-abandonment] Produto é obrigatório e não foi fornecido ou é inválido.');
      return new Response(
        JSON.stringify({ success: false, error: 'Produto é obrigatório e não foi fornecido ou é inválido.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Usar o fingerprint_hash fornecido pelo frontend ou buscar da tabela identificador
    let fingerprintHash: string;
    
    if (providedFingerprintHash) {
      fingerprintHash = providedFingerprintHash;
      console.log(`🔑 [track-abandonment] Using provided fingerprint_hash: ${fingerprintHash}`);
    } else {
      // Buscar fingerprint_hash da tabela identificador usando traffic_id ou session_id
      console.log(`🔍 [track-abandonment] Buscando fingerprint_hash da tabela identificador...`);
      
      let identifierRecord = null;
      
      // Primeiro tentar buscar por traffic_id se disponível
      if (finalTrafficId) {
        const { data: identifierByTrafficId, error: identifierError } = await supabaseAdmin
          .from('oreino360-identificador')
          .select('fingerprint_hash')
          .eq('traffic_id', finalTrafficId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
          
        if (!identifierError && identifierByTrafficId) {
          identifierRecord = identifierByTrafficId;
          console.log(`🎯 [track-abandonment] Encontrado fingerprint_hash por traffic_id: ${identifierRecord.fingerprint_hash}`);
        }
      }
      
      // Nota: A tabela oreino360-identificador não possui coluna session_id
      // Busca apenas por traffic_id
      
      if (identifierRecord && identifierRecord.fingerprint_hash) {
        fingerprintHash = identifierRecord.fingerprint_hash;
        console.log(`✅ [track-abandonment] Replicando fingerprint_hash do identificador: ${fingerprintHash}`);
      } else {
        // Fallback: gerar fingerprint_hash se não encontrado na tabela identificador
        const baseNormalizedIP = normalizeIP(clientIP);
        const effectiveAcceptLanguage = normalizeAcceptLanguage(acceptLanguage);
        fingerprintHash = await computeFingerprintHash([
          baseNormalizedIP,
          userAgent,
          effectiveAcceptLanguage
        ]);
        console.log(`⚠️ [track-abandonment] Não encontrou fingerprint_hash na tabela identificador, gerando fallback: ${fingerprintHash}`);
      }
    }

    // Verificar se o usuário já é um lead - se for, remover abandono e não processar
    const isAlreadyLead = await checkIfUserIsLead(supabaseAdmin, session_id, fingerprintHash, traffic_id, email);
    
    if (isAlreadyLead) {
      console.log('🎯 [track-abandonment] Usuário já é um lead, removendo abandonos existentes');
      await removeAbandonmentForLead(supabaseAdmin, session_id, fingerprintHash, traffic_id);
      
      return new Response(
        JSON.stringify({ success: true, message: 'User is already a lead, abandonment records cleaned up.' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Verificar deduplicação usando fingerprint_hash na tabela identificador
    const { data: existingIdentifier, error: dedupError } = await supabaseAdmin
      .schema('public')
      .from('oreino360-identificador')
      .select('created_at')
      .eq('fingerprint_hash', fingerprintHash)
      .maybeSingle();

    if (dedupError && dedupError.code !== 'PGRST116') {
      console.warn(`[track-abandonment] ⚠️ Erro ao verificar deduplicação: ${dedupError.message}`);
    }

    // Verificar se já existe abandono nas últimas 24 horas usando fingerprint_hash diretamente
    let shouldInsertAbandonment = true;
    let existingAbandonmentId = null;
    
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    // Buscar por fingerprint_hash diretamente na tabela de abandono
    let { data: existingAbandonment, error: abandonmentDedupError } = await supabaseAdmin
      .schema('public')
      .from('oreino360-abandono')
      .select('id, step_where_abandoned, reason, traffic_id, fingerprint_hash')
      .gte('created_at', twentyFourHoursAgo)
      .eq('fingerprint_hash', fingerprintHash)
      .limit(1);

    // Se não encontrou por fingerprint_hash, tentar por traffic_id (caso exista)
    if ((!existingAbandonment || existingAbandonment.length === 0) && finalTrafficId) {
      const { data: trafficAbandonment, error: trafficError } = await supabaseAdmin
        .schema('public')
        .from('oreino360-abandono')
        .select('id, step_where_abandoned, reason, traffic_id, fingerprint_hash')
        .gte('created_at', twentyFourHoursAgo)
        .eq('traffic_id', finalTrafficId)
        .limit(1);
      
      if (!trafficError && trafficAbandonment && trafficAbandonment.length > 0) {
        existingAbandonment = trafficAbandonment;
        console.log(`🔍 [track-abandonment] Encontrado abandono por traffic_id: ${finalTrafficId}`);
      }
    }

    if (abandonmentDedupError) {
      console.warn(`[track-abandonment] ⚠️ Erro ao verificar deduplicação de abandono: ${abandonmentDedupError.message}`);
    } else if (Array.isArray(existingAbandonment) && existingAbandonment.length > 0) {
      shouldInsertAbandonment = false;
      existingAbandonmentId = existingAbandonment[0].id;
      console.log(`🔄 [track-abandonment] Encontrado abandono existente nas últimas 24h (ID: ${existingAbandonmentId}), atualizando em vez de duplicar`);
    }
    if (shouldInsertAbandonment) {
      const abandonmentPayload = {
        session_id: session_id || null,
        reason: reason || 'fechamento_janela',
        step_where_abandoned: step_where_abandoned || 'unknown',
        produto: produto || 'tbz',
        fonte_de_trafego: finalFonteDeTrafego,
        tipo_de_funil: tipo_de_funil || 'quiz',
        traffic_id: finalTrafficId,
        fingerprint_hash: fingerprintHash,
        event_data: {
          timestamp: new Date().toISOString(),
          utm_source: utm_source || null,
          utm_medium: utm_medium || null,
          original_fonte_de_trafego: fonte_de_trafego || null,
          original_traffic_id: traffic_id || null
        }
      }

      console.log(`[track-abandonment] Processing abandonment record:`, abandonmentPayload);

      // Inserir o novo registro de abandono
      const { error } = await supabaseAdmin
        .schema('public')
        .from('oreino360-abandono')
        .insert(abandonmentPayload);
      
      if (error) {
        console.error(`[track-abandonment] Error inserting abandonment: ${error.message}`, error);
        return new Response(
          JSON.stringify({ success: false, error: `Database error: ${error.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[track-abandonment] ✅ Successfully recorded abandonment on step ${step_where_abandoned}`);
      
      return new Response(
        JSON.stringify({ success: true, message: 'Abandonment recorded successfully.' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } else if (existingAbandonmentId) {
      // Atualizar o registro existente em vez de criar um novo
      const updatePayload = {
        reason: reason || 'fechamento_janela',
        step_where_abandoned: step_where_abandoned || 'unknown',
        produto: produto || 'tbz',
        fonte_de_trafego: finalFonteDeTrafego,
        tipo_de_funil: tipo_de_funil || 'quiz',
        traffic_id: finalTrafficId,
        fingerprint_hash: fingerprintHash,
        event_data: {
          timestamp: new Date().toISOString(),
          utm_source: utm_source || null,
          utm_medium: utm_medium || null,
          original_fonte_de_trafego: fonte_de_trafego || null,
          original_traffic_id: traffic_id || null,
          updated_at: new Date().toISOString()
        }
      };

      console.log(`[track-abandonment] Atualizando registro existente ${existingAbandonmentId}:`, updatePayload);

      const { error: updateError } = await supabaseAdmin
        .schema('public')
        .from('oreino360-abandono')
        .update(updatePayload)
        .eq('id', existingAbandonmentId);

      if (updateError) {
        console.error(`[track-abandonment] Error updating abandonment: ${updateError.message}`, updateError);
        return new Response(
          JSON.stringify({ success: false, error: `Database error: ${updateError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[track-abandonment] ✅ Successfully updated abandonment record ${existingAbandonmentId} on step ${step_where_abandoned}`);
      
      return new Response(
        JSON.stringify({ success: true, message: 'Abandonment updated successfully.', action: 'updated' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } else {
      console.log(`🔁 [track-abandonment] Abandono suprimido por deduplicação`);
      
      return new Response(
        JSON.stringify({ success: true, message: 'Abandonment suppressed by deduplication.' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
  } catch (error: unknown) {
    console.error(`[track-abandonment] Unexpected error: ${(error as Error).message}`, error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message || 'Erro interno do servidor' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})