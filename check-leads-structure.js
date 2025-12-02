import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ynxsksgttbzxooixgqzf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHNrc2d0dGJ6eG9vaXhncXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTU4ODAsImV4cCI6MjA3NDM5MTg4MH0.PTAaE9WV6gjpDwlQuRY_HZjI-k5BCZ5yoyIjSSiSfIg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkLeadsStructureAndCreateComments() {
  console.log('🔍 Verificando estrutura da tabela de leads...\n');
  
  try {
    // Verificar estrutura da tabela de leads
    const { data: leadsData, error: leadsError } = await supabase
      .from('oreino360-leads')
      .select('*')
      .limit(1);
      
    if (leadsError) {
      console.log('❌ Erro ao consultar leads:', leadsError.message);
      return false;
    }
    
    console.log('✅ Estrutura da tabela de leads:');
    if (leadsData && leadsData.length > 0) {
      console.log('📊 Colunas disponíveis:', Object.keys(leadsData[0]));
    }
    
    // Criar alguns comentários simulados usando a tabela de leads
    console.log('\n📝 Criando comentários simulados...');
    
    const simulatedComments = [
      {
        name: 'Comentário Instagram 1',
        email: 'instagram_comment_1@temp.com',
        phone: '11999999001',
        traffic_id: 'instagram_comment_1'
      },
      {
        name: 'Comentário Instagram 2', 
        email: 'instagram_comment_2@temp.com',
        phone: '11999999002',
        traffic_id: 'instagram_comment_2'
      },
      {
        name: 'Comentário Instagram 3',
        email: 'instagram_comment_3@temp.com', 
        phone: '11999999003',
        traffic_id: 'instagram_comment_3'
      },
      {
        name: 'Comentário Instagram 4',
        email: 'instagram_comment_4@temp.com',
        phone: '11999999004', 
        traffic_id: 'instagram_comment_4'
      },
      {
        name: 'Comentário Instagram 5',
        email: 'instagram_comment_5@temp.com',
        phone: '11999999005',
        traffic_id: 'instagram_comment_5'
      }
    ];
    
    const { data: insertedComments, error: insertError } = await supabase
      .from('oreino360-leads')
      .insert(simulatedComments)
      .select();
      
    if (insertError) {
      console.log('❌ Erro ao inserir comentários simulados:', insertError.message);
      return false;
    }
    
    console.log('✅ Comentários simulados criados com sucesso!');
    console.log('📊 Total de comentários inseridos:', insertedComments.length);
    
    // Contar total de "comentários" (leads com traffic_id começando com instagram_comment)
    const { data: commentsCount, error: countError } = await supabase
      .from('oreino360-leads')
      .select('id', { count: 'exact' })
      .like('traffic_id', 'instagram_comment_%');
      
    if (!countError) {
      console.log('📈 Total de comentários do Instagram simulados:', commentsCount.length);
    }
    
    // Verificar total de visitas para calcular conversão
    const { data: visitsCount, error: visitsError } = await supabase
      .from('oreino360-visitas')
      .select('id', { count: 'exact' });
      
    if (!visitsError) {
      console.log('👥 Total de visitas:', visitsCount.length);
      
      if (visitsCount.length > 0) {
        const conversionRate = ((insertedComments.length / visitsCount.length) * 100).toFixed(2);
        console.log('📊 Taxa de conversão (comentários/visitas):', `${conversionRate}%`);
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
    return false;
  }
}

// Executar
checkLeadsStructureAndCreateComments()
  .then((success) => {
    if (success) {
      console.log('\n✅ Comentários simulados criados! Agora podemos implementar o dashboard.');
      console.log('⚠️  NOTA: Estes são dados temporários. Uma tabela específica deve ser criada futuramente.');
    } else {
      console.log('\n❌ Falha ao criar comentários simulados.');
    }
  })
  .catch((error) => {
    console.error('❌ Erro na execução:', error);
  });