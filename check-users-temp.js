const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5433,
  database: 'gestagent',
  user: 'gestagent_user',
  password: 'gestagent_pass_2024'
});

async function checkUsers() {
  try {
    console.log('📋 Verificando estructura de tabla users...\n');
    
    // Primero verificar la estructura de la tabla
    const structure = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Estructura de la tabla users:');
    console.log('='.repeat(60));
    structure.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    console.log('\n📋 Usuarios disponibles:');
    console.log('='.repeat(60));
    
    // Obtener usuarios sin la columna is_active
    const result = await pool.query('SELECT user_id, username, email, role, created_at FROM users ORDER BY username');
    
    result.rows.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}`);
      console.log(`   Usuario: ${user.username}`);
      console.log(`   Rol: ${user.role}`);
      console.log(`   ID: ${user.user_id}`);
      console.log(`   Creado: ${user.created_at}`);
      console.log('-'.repeat(40));
    });
    
    console.log(`\n📊 Total de usuarios: ${result.rows.length}`);
    
    if (result.rows.length > 0) {
      console.log('\n💡 Para probar el login, usa:');
      console.log(`   Email: ${result.rows[0].email}`);
      console.log(`   Contraseña: password123 (contraseña por defecto)`);
    }
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al verificar usuarios:', error.message);
    process.exit(1);
  }
}

checkUsers(); 