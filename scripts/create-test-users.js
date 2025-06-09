// Script para crear usuarios de prueba con diferentes roles
// scripts/create-test-users.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configurar cliente Supabase con service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Usuarios de prueba con diferentes roles
const testUsers = [
  {
    email: 'admin@gestagent.test',
    password: 'admin123456',
    username: 'Admin Principal',
    role: 'admin'
  },
  {
    email: 'supervisor@gestagent.test', 
    password: 'supervisor123456',
    username: 'Supervisor Gestoría',
    role: 'supervisor'
  },
  {
    email: 'contable@gestagent.test',
    password: 'contable123456', 
    username: 'Contable Principal',
    role: 'contable'
  },
  {
    email: 'gestor@gestagent.test',
    password: 'gestor123456',
    username: 'Gestor Clientes',
    role: 'gestor'
  },
  {
    email: 'operador@gestagent.test',
    password: 'operador123456',
    username: 'Operador Base',
    role: 'operador'
  }
];

async function createTestUsers() {
  console.log('🚀 Iniciando creación de usuarios de prueba...\n');

  for (const user of testUsers) {
    try {
      console.log(`📝 Creando usuario: ${user.email} (${user.role})`);

      // 1. Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true, // Confirmar email automáticamente
        user_metadata: {
          username: user.username,
          role: user.role
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          console.log(`   ⚠️  Usuario ya existe: ${user.email}`);
        } else {
          console.error(`   ❌ Error:`, authError.message);
          continue;
        }
      } else {
        console.log(`   ✅ Usuario creado: ${authData.user.id}`);
      }

      // 2. Obtener o usar ID de usuario
      let userId = authData?.user?.id;
      
      if (!userId) {
        // Si el usuario ya existe, obtener su ID
        const { data: existingUser } = await supabase.auth.admin.listUsers();
        const found = existingUser.users.find(u => u.email === user.email);
        userId = found?.id;
      }

      if (!userId) {
        console.error(`   ❌ No se pudo obtener ID de usuario`);
        continue;
      }

      // 3. Crear/actualizar registro en tabla users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .upsert({
          id: userId,
          email: user.email,
          username: user.username,
          role: user.role,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        })
        .select();

      if (userError) {
        console.error(`   ❌ Error tabla users:`, userError.message);
      } else {
        console.log(`   ✅ Registro en tabla users`);
      }

      console.log(`   🎯 Completo: ${user.email} | ${user.role} | ${userId}\n`);

    } catch (error) {
      console.error(`❌ Error general:`, error.message);
    }
  }

  console.log('🎉 Proceso completado!\n');
  console.log('📋 CREDENCIALES:');
  console.log('='.repeat(40));
  testUsers.forEach(user => {
    console.log(`${user.role.toUpperCase()}: ${user.email} / ${user.password}`);
  });
  console.log('='.repeat(40));
}

async function verifyUsers() {
  console.log('🔍 Verificando usuarios creados...\n');
  
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, username, role, created_at')
      .order('role');

    if (error) {
      console.error('❌ Error consultando usuarios:', error);
      return;
    }

    console.log('👥 USUARIOS EN BASE DE DATOS:');
    console.log('==========================================');
    users.forEach(user => {
      console.log(`${user.role.toUpperCase().padEnd(10)} | ${user.email.padEnd(25)} | ${user.username}`);
    });
    console.log('==========================================\n');

    // Verificar roles disponibles
    const roles = [...new Set(users.map(u => u.role))];
    console.log(`🎭 Roles disponibles: ${roles.join(', ')}`);
    console.log(`👥 Total usuarios: ${users.length}\n`);

  } catch (error) {
    console.error('❌ Error verificando usuarios:', error);
  }
}

// Función para limpiar usuarios de prueba (opcional)
async function cleanTestUsers() {
  console.log('🧹 Limpiando usuarios de prueba...\n');
  
  for (const user of testUsers) {
    try {
      // Obtener usuario por email
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const userToDelete = authUsers.users.find(u => u.email === user.email);
      
      if (userToDelete) {
        // Eliminar de Auth
        await supabase.auth.admin.deleteUser(userToDelete.id);
        
        // Eliminar de tabla users
        await supabase.from('users').delete().eq('id', userToDelete.id);
        
        console.log(`✅ Usuario eliminado: ${user.email}`);
      }
    } catch (error) {
      console.error(`❌ Error eliminando ${user.email}:`, error.message);
    }
  }
}

// Ejecutar script
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'clean') {
    cleanTestUsers().then(() => {
      console.log('🎉 Limpieza completada');
      process.exit(0);
    });
  } else {
    createTestUsers().then(() => {
      console.log('🎉 Script completado');
      process.exit(0);
    });
  }
}

module.exports = { createTestUsers, verifyUsers, cleanTestUsers }; 