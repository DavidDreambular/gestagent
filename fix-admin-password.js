const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function resetPasswords() {
  console.log('🔐 Resetting user passwords to known values...');
  
  const client = new Client({
    host: 'localhost',
    port: 5433,
    database: 'gestagent', 
    user: 'gestagent_user',
    password: 'gestagent_pass_2024'
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    // Nuevas contraseñas conocidas
    const newPasswords = {
      'admin@gestagent.com': 'admin123',
      'demo@gestagent.com': 'demo123',
      'contable@gestagent.com': 'contable123',
      'gestor@gestagent.com': 'gestor123'
    };

    console.log('\n🔄 Updating passwords...');
    
    for (const [email, password] of Object.entries(newPasswords)) {
      // Generar nuevo hash
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      // Actualizar en base de datos
      const result = await client.query(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2',
        [hashedPassword, email]
      );
      
      if (result.rowCount > 0) {
        console.log(`   ✅ ${email} → ${password}`);
        
        // Verificar que funciona
        const verification = await bcrypt.compare(password, hashedPassword);
        console.log(`      Verification: ${verification ? '✅' : '❌'}`);
      } else {
        console.log(`   ❌ ${email} not found`);
      }
    }

    // Mostrar usuarios actualizados
    console.log('\n👥 Current users:');
    const users = await client.query('SELECT user_id, email, username, role FROM users ORDER BY email');
    
    users.rows.forEach(user => {
      const password = Object.entries(newPasswords).find(([email]) => email === user.email)?.[1] || 'unknown';
      console.log(`   📧 ${user.email}`);
      console.log(`      Username: ${user.username}`);
      console.log(`      Role: ${user.role}`);
      console.log(`      Password: ${password}`);
      console.log(`      User ID: ${user.user_id}`);
      console.log('');
    });

    console.log('🎉 Password reset complete!');
    console.log('\n🌐 Now try to login at: http://localhost:3002/auth/login');
    console.log('   Use: admin@gestagent.com / admin123');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

resetPasswords().catch(console.error); 