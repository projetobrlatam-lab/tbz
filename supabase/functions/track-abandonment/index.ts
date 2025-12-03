import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.1'
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

      // Tentar buscar pela sessão se tiver session_id (mais confiável no novo schema)
      if (session_id) {
        const { data: sessionData } = await supabaseAdmin
          .schema('tbz')
          .from('sessoes')
          .select('fingerprint_hash')
          .eq('session_id', session_id)
          .maybeSingle();

        if (sessionData) {
          identifierRecord = sessionData;
          console.log(`🎯 [track-abandonment] Encontrado fingerprint_hash pela sessão: ${identifierRecord.fingerprint_hash}`);
        }
      }

      if (identifierRecord && identifierRecord.fingerprint_hash) {
        fingerprintHash = identifierRecord.fingerprint_hash;
        console.log(`✅ [track-abandonment] Replicando fingerprint_hash: ${fingerprintHash}`);
      } else {
        // Fallback: gerar fingerprint_hash
        const baseNormalizedIP = normalizeIP(clientIP);
        const effectiveAcceptLanguage = normalizeAcceptLanguage(acceptLanguage);
        fingerprintHash = await computeFingerprintHash([
          baseNormalizedIP,
          userAgent,
          effectiveAcceptLanguage
        ]);
        console.log(`⚠️ [track-abandonment] Gerando fallback fingerprint_hash: ${fingerprintHash}`);

        // Garantir que identificador existe (para FK)
        await supabaseAdmin.schema('tbz').from('identificador').upsert({
          fingerprint_hash: fingerprintHash,
          original_ip: clientIP,
          user_agent: userAgent,
          created_at: new Date().toISOString()
        }, { onConflict: 'fingerprint_hash' });
      }
    }

    // Verificar se o usuário já é um lead - se for, remover abandono e não processar
    // TODO: Atualizar checkIfUserIsLead e removeAbandonmentForLead para usar schema tbz se necessário, 
    // mas por enquanto vamos fazer a verificação direta aqui para garantir
    const { data: leadCheck } = await supabaseAdmin
      .schema('tbz')
      .from('leads')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (leadCheck) {
      console.log('🎯 [track-abandonment] Usuário já é um lead, removendo abandonos existentes');
      // Remover abandonos anteriores deste lead/fingerprint
      await supabaseAdmin.schema('tbz').from('abandono').delete().eq('fingerprint_hash', fingerprintHash);

      return new Response(
        JSON.stringify({ success: true, message: 'User is already a lead, abandonment records cleaned up.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obter UUID da sessão (FK)
    let sessionUUID = null;
    if (session_id) {
      const { data: sData } = await supabaseAdmin.schema('tbz').from('sessoes').select('id').eq('session_id', session_id).maybeSingle();
      sessionUUID = sData?.id;
    }

    // Verificar se já existe abandono nas últimas 24 horas
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    let { data: existingAbandonment } = await supabaseAdmin
      .schema('tbz')
      .from('abandono')
      .select('id')
      .gte('created_at', twentyFourHoursAgo)
      .eq('fingerprint_hash', fingerprintHash)
      .limit(1);

    if (existingAbandonment && existingAbandonment.length > 0) {
      const existingId = existingAbandonment[0].id;
      console.log(`🔄 [track-abandonment] Atualizando abandono existente ${existingId}`);

      const updatePayload = {
        reason: reason || 'fechamento_janela',
        step_where_abandoned: step_where_abandoned || 'unknown',
        produto: produto || 'tbz',
        // session_id: sessionUUID // Opcional atualizar sessão
      };

      await supabaseAdmin.schema('tbz').from('abandono').update(updatePayload).eq('id', existingId);

      return new Response(
        JSON.stringify({ success: true, message: 'Abandonment updated successfully.', action: 'updated' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Inserir novo
      const abandonmentPayload = {
        session_id: sessionUUID, // Pode ser null se não achou (mas idealmente deveria ter)
        fingerprint_hash: fingerprintHash, // FK
        reason: reason || 'fechamento_janela',
        step_where_abandoned: step_where_abandoned || 'unknown',
        produto: produto || 'tbz',
        created_at: new Date().toISOString()
      };

      console.log(`[track-abandonment] Inserting abandonment:`, abandonmentPayload);

      const { error } = await supabaseAdmin
        .schema('tbz')
        .from('abandono')
        .insert(abandonmentPayload);

      if (error) {
        console.error(`[track-abandonment] Error inserting: ${error.message}`);
        return new Response(
          JSON.stringify({ success: false, error: `Database error: ${error.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Abandonment recorded successfully.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: unknown) {
    console.error(`[track-abandonment] Unexpected error: ${(error as Error).message}`, error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message || 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});