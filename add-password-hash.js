const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: 'localhost',
  port: 5433,
  database: 'gestagent',
  user: 'gestagent_user',
  password: 'gestagent_pass_2024'
});

async function addPasswordHash() {
  try {
    console.log('🔧 Agregando columna password_hash a la tabla users...\n');
    
    // 1. Agregar la columna password_hash
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)');
    console.log('✅ Columna password_hash agregada');
    
    // 2. Generar hash para la contraseña por defecto "password123"
    const defaultPassword = 'password123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    console.log('✅ Hash de contraseña generado');
    
    // 3. Actualizar todos los usuarios con la contraseña hasheada
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE password_hash IS NULL',
      [hashedPassword]
    );
    
    console.log(`✅ ${result.rowCount} usuarios actualizados con password_hash`);
    
    // 4. Verificar que todos los usuarios tienen password_hash
    const verification = await pool.query('SELECT username, email, password_hash IS NOT NULL as has_password FROM users');
    
    console.log('\n📋 Verificación de usuarios:');
    console.log('='.repeat(60));
    verification.rows.forEach(user => {
      const status = user.has_password ? '✅ Con contraseña' : '❌ Sin contraseña';
      console.log(`- ${user.email} (${user.username}): ${status}`);
    });
    
    console.log('\n🎉 ¡Migración completada! Ahora puedes hacer login con:');
    console.log('   Email: admin@gestagent.com');
    console.log('   Contraseña: password123');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en migración:', error.message);
    process.exit(1);
  }
}

addPasswordHash(); 