import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ynxsksgttbzxooixgqzf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHNrc2d0dGJ6eG9vaXhncXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTU4ODAsImV4cCI6MjA3NDM5MTg4MH0.PTAaE9WV6gjpDwlQuRY_HZjI-k5BCZ5yoyIjSSiSfIg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createInstagramCommentsTable() {
  console.log('🔧 Criando tabela de comentários do Instagram...\n');
  
  try {
    // SQL para criar a tabela
    const createTableSQL = `
      -- Criar tabela oreino360-instagram-comentos
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
    
    // Executar SQL usando RPC (se disponível) ou tentar inserir dados de teste
    console.log('📋 Tentando criar tabela...');
    
    // Primeiro, vamos tentar inserir um registro de teste para ver se a tabela já existe
    const { data: testData, error: testError } = await supabase
      .from('oreino360-instagram-comentos')
      .select('id')
      .limit(1);
      
    if (!testError) {
      console.log('✅ Tabela já existe!');
      console.log('📊 Dados de teste:', testData);
      return true;
    }
    
    console.log('❌ Tabela não existe. Erro:', testError.message);
    
    // Tentar criar alguns dados de exemplo para testar
    console.log('📝 Inserindo dados de exemplo...');
    
    const sampleComments = [
      {
        instagram_user_id: 'user123',
        instagram_username: 'usuario_teste',
        comment_text: 'Interessante! Quero saber mais.',
        post_id: 'post_123',
        comment_id: 'comment_123',
        produto: 'tbz'
      },
      {
        instagram_user_id: 'user456', 
        instagram_username: 'outro_usuario',
        comment_text: 'Como faço para participar?',
        post_id: 'post_456',
        comment_id: 'comment_456',
        produto: 'tbz'
      }
    ];
    
    // Se a tabela não existir, isso falhará e saberemos que precisamos criá-la
    const { data: insertData, error: insertError } = await supabase
      .from('oreino360-instagram-comentos')
      .insert(sampleComments)
      .select();
      
    if (insertError) {
      console.log('❌ Erro ao inserir dados (tabela provavelmente não existe):', insertError.message);
      console.log('🔧 A tabela precisa ser criada manualmente no Supabase Dashboard ou via migração.');
      return false;
    }
    
    console.log('✅ Dados inseridos com sucesso!');
    console.log('📊 Dados inseridos:', insertData);
    return true;
    
  } catch (error) {
    console.error('❌ Erro ao criar tabela:', error);
    return false;
  }
}

// Executar criação
createInstagramCommentsTable()
  .then((success) => {
    if (success) {
      console.log('\n✅ Tabela de comentários do Instagram está pronta para uso!');
    } else {
      console.log('\n❌ Tabela precisa ser criada manualmente. Verifique o Supabase Dashboard.');
    }
  })
  .catch((error) => {
    console.error('❌ Erro na execução:', error);
  });