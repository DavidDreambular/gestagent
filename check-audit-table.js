const { postgresqlClient } = require('./lib/postgresql-client');

async function checkAuditTable() {
  console.log('🔍 Verificando tabla audit_logs...');
  
  try {
    // Verificar si la tabla existe
    const tableCheck = await postgresqlClient.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_logs'
      );
    `);
    
    const tableExists = tableCheck.data[0].exists;
    console.log(`📋 Tabla audit_logs existe: ${tableExists ? '✅ SÍ' : '❌ NO'}`);
    
    if (tableExists) {
      // Verificar estructura de la tabla
      const columns = await postgresqlClient.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'audit_logs'
        ORDER BY ordinal_position;
      `);
      
      console.log('📊 Estructura de la tabla:');
      columns.data.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
      });
      
      // Verificar índices
      const indexes = await postgresqlClient.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'audit_logs';
      `);
      
      console.log('🔗 Índices:');
      indexes.data.forEach(idx => {
        console.log(`  - ${idx.indexname}`);
      });
      
      // Contar registros
      const count = await postgresqlClient.query('SELECT COUNT(*) FROM audit_logs');
      console.log(`📈 Registros en audit_logs: ${count.data[0].count}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAuditTable(); 