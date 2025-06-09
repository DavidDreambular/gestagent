const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://gestagent_user:gestagent_pass_2024@localhost:5433/gestagent'
});

async function checkUsersStructure() {
  try {
    console.log('🔍 Verificando estructura de todas las tablas...');
    
    // Verificar qué tablas existen
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📋 Tablas existentes:');
    tables.rows.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });
    
    // Verificar estructura de la tabla users
    console.log('\n🔍 Estructura de la tabla users:');
    const userColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    if (userColumns.rows.length > 0) {
      userColumns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}) ${col.column_default ? `default: ${col.column_default}` : ''}`);
      });
      
      // Buscar la columna de clave primaria
      const primaryKey = await pool.query(`
        SELECT column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'users' 
          AND tc.constraint_type = 'PRIMARY KEY'
      `);
      
      if (primaryKey.rows.length > 0) {
        console.log(`\n🔑 Clave primaria de users: ${primaryKey.rows[0].column_name}`);
      }
    } else {
      console.log('⚠️  La tabla users no existe o no tiene columnas');
    }
    
    // Verificar estructura de documents también
    console.log('\n🔍 Estructura de la tabla documents:');
    const docColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'documents'
      ORDER BY ordinal_position
    `);
    
    if (docColumns.rows.length > 0) {
      docColumns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Ejecutar verificación
checkUsersStructure()
  .then(() => {
    console.log('\n✅ Verificación de estructura completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error en la verificación:', error);
    process.exit(1);
  }); 