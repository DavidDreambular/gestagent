const { createClient } = require('@supabase/supabase-js');
const { config } = require('dotenv');
const path = require('path');

// Cargar variables de entorno
config({ path: path.resolve('.env.local') });

console.log('🚀 VERIFICACIÓN POST-FIX - GESTAGENT');
console.log('=' .repeat(60));

async function verifySystem() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('📋 1. VERIFICACIÓN DE CONFIGURACIÓN');
  console.log(`  Supabase URL: ${supabaseUrl ? '✅' : '❌'}`);
  console.log(`  Anon Key: ${supabaseAnonKey ? '✅' : '❌'}`);
  console.log(`  Service Key: ${supabaseServiceKey ? '✅' : '❌'}`);
  console.log('');

  const client = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('📋 2. VERIFICACIÓN DE CONEXIÓN A SUPABASE');
    
    // Test básico de conexión
    const { data: testData, error: testError } = await client
      .from('users')
      .select('count(*)')
      .limit(1);
    
    if (testError) {
      console.log('❌ Error de conexión:', testError.message);
      return false;
    }
    console.log('✅ Conexión a Supabase exitosa');

    console.log('');
    console.log('📋 3. VERIFICACIÓN DE ESTRUCTURA DE BASE DE DATOS');
    
    // Verificar tablas existentes
    const tables = ['users', 'documents', 'audit_logs'];
    for (const table of tables) {
      const { data, error } = await client
        .from(table)
        .select('count(*)')
        .limit(1);
      
      if (error) {
        console.log(`❌ Tabla '${table}': ${error.message}`);
      } else {
        console.log(`✅ Tabla '${table}': Existente`);
      }
    }

    console.log('');
    console.log('📋 4. VERIFICACIÓN DE USUARIO DE PRUEBA');
    
    // Verificar usuario admin@example.com en auth
    const { data: authUsers, error: authError } = await client.auth.admin.listUsers();
    
    if (authError) {
      console.log('❌ Error verificando usuarios auth:', authError.message);
    } else {
      const adminUser = authUsers.users.find(u => u.email === 'admin@example.com');
      if (adminUser) {
        console.log('✅ Usuario admin@example.com existe en Auth');
        console.log(`   ID: ${adminUser.id}`);
        console.log(`   Confirmado: ${adminUser.email_confirmed_at ? 'Sí' : 'No'}`);
      } else {
        console.log('❌ Usuario admin@example.com NO existe en Auth');
      }
    }

    // Verificar usuario en tabla users
    const { data: userData, error: userError } = await client
      .from('users')
      .select('*')
      .eq('email', 'admin@example.com')
      .single();
    
    if (userError) {
      console.log('❌ Usuario admin@example.com NO existe en tabla users');
      console.log('💡 Nota: Necesitas crear este registro en la tabla');
    } else {
      console.log('✅ Usuario admin@example.com existe en tabla users');
      console.log(`   Role: ${userData.role}`);
      console.log(`   Username: ${userData.username}`);
    }

    console.log('');
    console.log('📋 5. TEST DE AUTENTICACIÓN');
    
    // Test de login
    const { data: authData, error: authLoginError } = await client.auth.signInWithPassword({
      email: 'admin@example.com',
      password: 'admin1234'
    });

    if (authLoginError) {
      console.log('❌ Error en autenticación:', authLoginError.message);
      if (authLoginError.message.includes('Invalid login credentials')) {
        console.log('💡 El usuario existe pero la contraseña es incorrecta');
        console.log('💡 O el usuario no está confirmado');
      }
    } else {
      console.log('✅ Autenticación exitosa');
      console.log(`   User ID: ${authData.user?.id}`);
      console.log(`   Email: ${authData.user?.email}`);
    }

    console.log('');
    console.log('=' .repeat(60));
    console.log('🎯 RESUMEN DE VERIFICACIÓN');
    
    return true;

  } catch (error) {
    console.error('❌ Error general:', error.message);
    return false;
  }
}

verifySystem().then((success) => {
  if (success) {
    console.log('✅ Sistema verificado - Listo para testing');
    console.log('');
    console.log('🚀 PRÓXIMO PASO:');
    console.log('   Abre http://localhost:3001 e intenta login con:');
    console.log('   Email: admin@example.com');
    console.log('   Password: admin1234');
  } else {
    console.log('❌ Verificación falló - Revisa errores arriba');
  }
  console.log('=' .repeat(60));
}); 