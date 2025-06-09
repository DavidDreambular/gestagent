const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: 'localhost',
  port: 5433,
  database: 'gestagent',
  user: 'gestagent_user',
  password: 'gestagent_pass_2024'
});

async function debugAuth() {
  try {
    console.log('🔍 Debugging autenticación...\n');
    
    const email = 'admin@gestagent.com';
    const password = 'password123';
    
    // 1. Verificar estructura de la tabla
    console.log('📋 Estructura de la tabla users:');
    const structure = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    structure.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type}`);
    });
    
    // 2. Buscar usuario
    console.log(`\n🔍 Buscando usuario: ${email}`);
    const userResult = await pool.query(
      'SELECT user_id, username, email, password_hash, role FROM users WHERE email = $1',
      [email]
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ Usuario no encontrado');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('✅ Usuario encontrado:');
    console.log(`   ID: ${user.user_id}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Tiene password_hash: ${user.password_hash ? 'Sí' : 'No'}`);
    
    // 3. Verificar contraseña
    console.log(`\n🔐 Verificando contraseña...`);
    if (!user.password_hash) {
      console.log('❌ No hay password_hash en la base de datos');
      return;
    }
    
    const isValid = await bcrypt.compare(password, user.password_hash);
    console.log(`   Contraseña válida: ${isValid ? '✅ Sí' : '❌ No'}`);
    
    // 4. Generar nuevo hash para comparar
    console.log(`\n🔧 Generando nuevo hash para comparar...`);
    const newHash = await bcrypt.hash(password, 10);
    console.log(`   Hash actual: ${user.password_hash.substring(0, 20)}...`);
    console.log(`   Hash nuevo:  ${newHash.substring(0, 20)}...`);
    
    const testCompare = await bcrypt.compare(password, newHash);
    console.log(`   Test con nuevo hash: ${testCompare ? '✅ Sí' : '❌ No'}`);
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

debugAuth(); 