import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ynxsksgttbzxooixgqzf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHNrc2d0dGJ6eG9vaXhncXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTU4ODAsImV4cCI6MjA3NDM5MTg4MH0.PTAaE9WV6gjpDwlQuRY_HZjI-k5BCZ5yoyIjSSiSfIg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkInstagramCommentsTable() {
  console.log('🔍 Verificando tabelas existentes no banco de dados...\n');
  
  try {
    // Tentar consultar tabelas que podem conter comentários do Instagram
    const possibleTableNames = [
      'Instagram Comentos',
      'instagram_comentos', 
      'instagram-comentos',
      'oreino360-instagram-comentos',
      'oreino360_instagram_comentos',
      'comentarios_instagram',
      'instagram_comments',
      'comments'
    ];
    
    for (const tableName of possibleTableNames) {
      console.log(`📋 Testando tabela: ${tableName}`);
      
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
          
        if (!error) {
          console.log(`✅ Tabela encontrada: ${tableName}`);
          console.log('📊 Estrutura da tabela:', data);
          
          // Verificar colunas da tabela
          const { data: columns, error: columnsError } = await supabase
            .rpc('get_table_columns', { table_name: tableName });
            
          if (!columnsError && columns) {
            console.log('📝 Colunas da tabela:', columns);
          }
          
          return tableName;
        }
      } catch (err) {
        // Tabela não existe, continuar
      }
    }
    
    console.log('❌ Nenhuma tabela de comentários do Instagram encontrada.');
    
    // Listar todas as tabelas disponíveis
    console.log('\n📋 Listando todas as tabelas disponíveis:');
    
    // Tentar consultar information_schema para listar tabelas
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_all_tables');
      
    if (!tablesError && tables) {
      console.log('📊 Tabelas disponíveis:', tables);
    } else {
      // Método alternativo - tentar algumas tabelas conhecidas
      const knownTables = [
        'oreino360-leads',
        'oreino360-visitas', 
        'oreino360-eventos',
        'oreino360-sessoes',
        'oreino360-abandono',
        'oreino360-compras'
      ];
      
      console.log('📋 Verificando tabelas conhecidas:');
      for (const table of knownTables) {
        try {
          const { error } = await supabase.from(table).select('id').limit(1);
          if (!error) {
            console.log(`✅ ${table} - existe`);
          }
        } catch (err) {
          console.log(`❌ ${table} - não existe`);
        }
      }
    }
    
    return null;
    
  } catch (error) {
    console.error('❌ Erro ao verificar tabelas:', error);
    return null;
  }
}

// Executar verificação
checkInstagramCommentsTable()
  .then((result) => {
    if (result) {
      console.log(`\n✅ Tabela de comentários encontrada: ${result}`);
    } else {
      console.log('\n❌ Tabela de comentários do Instagram não encontrada. Será necessário criar.');
    }
  })
  .catch((error) => {
    console.error('❌ Erro na execução:', error);
  });