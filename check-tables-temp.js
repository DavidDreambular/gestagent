const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5433,
  database: 'gestagent',
  user: 'gestagent_user',
  password: 'gestagent_pass_2024'
});

async function checkTables() {
  try {
    console.log('📋 Verificando tablas en la base de datos...\n');
    
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📋 Tablas disponibles:');
    console.log('='.repeat(40));
    result.rows.forEach(table => {
      console.log(`- ${table.table_name}`);
    });
    
    console.log(`\n📊 Total de tablas: ${result.rows.length}`);
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkTables(); 