/**
 * Utilitários para gerenciamento inteligente de abandono
 * Implementa lógica de remoção de abandono quando usuário vira lead
 */

export async function removeAbandonmentForLead(
  supabase: any, 
  sessionId?: string, 
  fingerprintHash?: string,
  trafficId?: string
): Promise<void> {
  console.log('=== REMOVING ABANDONMENT FOR CONVERTED LEAD ===');
  console.log('Parameters received:', { sessionId, fingerprintHash, trafficId });
  
  if (!sessionId && !fingerprintHash && !trafficId) {
    console.warn('No valid identifiers provided for abandonment removal');
    return;
  }
  
  try {
    let abandonmentRecords: any[] = [];
    
    // Estratégia 1: Buscar por fingerprint_hash se disponível
    if (fingerprintHash) {
      console.log('🔍 Strategy 1: Searching abandonment records by fingerprint_hash:', fingerprintHash);
      const { data, error } = await supabase
        .schema('public')
        .from('oreino360-abandono')
        .select('id, session_id, step_where_abandoned, reason, traffic_id, fingerprint_hash')
        .eq('fingerprint_hash', fingerprintHash);
      
      if (!error && data && data.length > 0) {
        abandonmentRecords = data;
        console.log(`✅ Found ${data.length} records by fingerprint_hash`);
      } else {
        console.log('❌ No records found by fingerprint_hash');
      }
    }
    
    // Estratégia 2: Se não encontrou por fingerprint_hash, buscar por traffic_id
    if (abandonmentRecords.length === 0 && trafficId) {
      console.log('🔍 Strategy 2: Searching abandonment records by traffic_id:', trafficId);
      const { data, error } = await supabase
        .schema('public')
        .from('oreino360-abandono')
        .select('id, session_id, step_where_abandoned, reason, traffic_id, fingerprint_hash')
        .eq('traffic_id', trafficId);
      
      if (!error && data && data.length > 0) {
        abandonmentRecords = data;
        console.log(`✅ Found ${data.length} records by traffic_id`);
      } else {
        console.log('❌ No records found by traffic_id');
      }
    }
    
    // Estratégia 3: Se ainda não encontrou, buscar por session_id
    if (abandonmentRecords.length === 0 && sessionId) {
      console.log('🔍 Strategy 3: Searching abandonment records by session_id:', sessionId);
      const { data, error } = await supabase
        .schema('public')
        .from('oreino360-abandono')
        .select('id, session_id, step_where_abandoned, reason, traffic_id, fingerprint_hash')
        .eq('session_id', sessionId);
      
      if (!error && data && data.length > 0) {
        abandonmentRecords = data;
        console.log(`✅ Found ${data.length} records by session_id`);
      } else {
        console.log('❌ No records found by session_id');
      }
    }
    
    // Estratégia 4: Busca combinada para casos onde há múltiplos critérios
    if (abandonmentRecords.length === 0 && (sessionId || trafficId)) {
      console.log('🔍 Strategy 4: Combined search using available criteria');
      let combinedQuery = supabase
        .schema('public')
        .from('oreino360-abandono')
        .select('id, session_id, step_where_abandoned, reason, traffic_id, fingerprint_hash');
      
      if (sessionId && trafficId) {
        combinedQuery = combinedQuery.or(`session_id.eq.${sessionId},traffic_id.eq.${trafficId}`);
      } else if (sessionId) {
        combinedQuery = combinedQuery.eq('session_id', sessionId);
      } else if (trafficId) {
        combinedQuery = combinedQuery.eq('traffic_id', trafficId);
      }
      
      const { data, error } = await combinedQuery;
      
      if (!error && data && data.length > 0) {
        abandonmentRecords = data;
        console.log(`✅ Found ${data.length} records by combined search`);
      } else {
        console.log('❌ No records found by combined search');
      }
    }
    
    if (!abandonmentRecords || abandonmentRecords.length === 0) {
      console.log('❌ No abandonment records found to remove');
      return;
    }
    
    console.log(`✅ Found ${abandonmentRecords.length} abandonment record(s) to remove:`, abandonmentRecords);
    
    // Remover os registros usando os IDs encontrados (mais preciso)
    const recordIds = abandonmentRecords.map(record => record.id);
    console.log('🗑️ Removing records with IDs:', recordIds);
    
    const { error: deleteError } = await supabase
      .schema('public')
      .from('oreino360-abandono')
      .delete()
      .in('id', recordIds);
    
    if (deleteError) {
      console.error('❌ Error removing abandonment records:', deleteError);
      return;
    }
    
    console.log(`🎉 Successfully removed ${abandonmentRecords.length} abandonment record(s) for converted lead`);
    
    // Log detalhado dos registros removidos
    abandonmentRecords.forEach((record, index) => {
      console.log(`   ${index + 1}. ID: ${record.id}, Step: ${record.step_where_abandoned}, Reason: ${record.reason}`);
    });
    
  } catch (error) {
    console.error('❌ Exception in removeAbandonmentForLead:', error);
  }
}

/**
 * Verifica se um usuário já é um lead baseado nos identificadores disponíveis
 */
export async function checkIfUserIsLead(
  supabase: any,
  sessionId?: string,
  fingerprintHash?: string,
  trafficId?: string,
  email?: string
): Promise<boolean> {
  try {
    let query = supabase
      .schema('public')
      .from('oreino360-leads')
      .select('id')
      .eq('is_valid_lead', true);
    
    // Priorizar email se disponível
    if (email) {
      query = query.eq('email', email);
    } else if (trafficId) {
      query = query.eq('traffic_id', trafficId);
    } else {
      // Se não temos email nem traffic_id, não podemos verificar
      return false;
    }
    
    const { data: leadData, error: leadError } = await query.limit(1);
    
    if (leadError) {
      console.error('Error checking if user is lead:', leadError);
      return false;
    }
    
    const isLead = leadData && leadData.length > 0;
    console.log(`User is ${isLead ? 'already a' : 'not a'} lead`);
    
    return isLead;
    
  } catch (error) {
    console.error('Unexpected error in checkIfUserIsLead:', error);
    return false;
  }
}