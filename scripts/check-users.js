const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:password123@localhost:5433/gestagent'
});

async function checkUsers() {
  try {
    console.log('📋 Verificando usuarios en PostgreSQL...\n');
    
    const result = await pool.query('SELECT username, email, role, is_active FROM users ORDER BY username');
    
    console.log('📋 Usuarios disponibles:');
    console.log('=' .repeat(60));
    
    result.rows.forEach((user, index) => {
      const status = user.is_active ? '✅ Activo' : '❌ Inactivo';
      console.log(`${index + 1}. Email: ${user.email}`);
      console.log(`   Usuario: ${user.username}`);
      console.log(`   Rol: ${user.role}`);
      console.log(`   Estado: ${status}`);
      console.log('-'.repeat(40));
    });
    
    console.log(`\n📊 Total de usuarios: ${result.rows.length}`);
    
    // Sugerir credenciales de prueba
    const activeUsers = result.rows.filter(user => user.is_active);
    if (activeUsers.length > 0) {
      console.log('\n💡 Para probar el login, usa:');
      console.log(`   Email: ${activeUsers[0].email}`);
      console.log(`   Contraseña: password123 (contraseña por defecto)`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al verificar usuarios:', error.message);
    process.exit(1);
  }
}

checkUsers(); 