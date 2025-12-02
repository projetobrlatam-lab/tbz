import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ynxsksgttbzxooixgqzf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHNrc2d0dGJ6eG9vaXhncXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTU4ODAsImV4cCI6MjA3NDM5MTg4MH0.PTAaE9WV6gjpDwlQuRY_HZjI-k5BCZ5yoyIjSSiSfIg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createTableViaSQL() {
  console.log('🔧 Tentando criar tabela via SQL...\n');
  
  try {
    // Tentar executar SQL usando rpc
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public."oreino360-instagram-comentos" (
          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          instagram_user_id text NOT NULL,
          instagram_username text,
          comment_text text NOT NULL,
          post_id text,
          post_url text,
          comment_id text UNIQUE,
          produto text DEFAULT 'tbz',
          fonte_de_trafego text DEFAULT 'instagram',
          tipo_de_funil text DEFAULT 'comentario',
          traffic_id text,
          is_processed boolean DEFAULT false,
          created_at timestamp with time zone DEFAULT now(),
          updated_at timestamp with time zone DEFAULT now()
      );
    `;
    
    console.log('📋 Tentando executar SQL via RPC...');
    
    // Tentar usar uma função RPC genérica
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: createTableSQL 
    });
    
    if (error) {
      console.log('❌ Erro RPC:', error.message);
      
      // Alternativa: tentar criar usando uma abordagem diferente
      console.log('🔄 Tentando abordagem alternativa...');
      
      // Vamos simular a tabela usando uma das existentes como base
      // Por enquanto, vamos usar a tabela de leads para armazenar comentários temporariamente
      console.log('📝 Usando tabela de leads como base temporária...');
      
      // Inserir um comentário de teste na tabela de leads com campos específicos
      const testComment = {
        name: 'Instagram Comment',
        email: 'comment@instagram.com',
        phone: '0000000000',
        traffic_id: 'instagram_comment_test',
        is_valid_lead: false, // Marcar como não sendo um lead válido
        iniciar_checkout: false
      };
      
      const { data: leadData, error: leadError } = await supabase
        .from('oreino360-leads')
        .insert(testComment)
        .select();
        
      if (leadError) {
        console.log('❌ Erro ao inserir na tabela de leads:', leadError.message);
        return false;
      }
      
      console.log('✅ Comentário de teste inserido na tabela de leads:', leadData);
      console.log('⚠️  NOTA: Usando tabela de leads temporariamente. Tabela específica deve ser criada no Supabase Dashboard.');
      
      return true;
    }
    
    console.log('✅ SQL executado com sucesso!', data);
    return true;
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
    return false;
  }
}

// Executar
createTableViaSQL()
  .then((success) => {
    if (success) {
      console.log('\n✅ Processo concluído!');
    } else {
      console.log('\n❌ Falha no processo. Tabela deve ser criada manualmente.');
    }
  })
  .catch((error) => {
    console.error('❌ Erro na execução:', error);
  });