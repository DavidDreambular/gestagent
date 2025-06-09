const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Configuración de la base de datos
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'gestagent',
  password: process.env.POSTGRES_PASSWORD || 'password123',
  port: process.env.POSTGRES_PORT || 5432,
});

async function setupPortalUsers() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Configurando usuarios del portal de proveedores...');

    // 1. Crear tabla provider_users si no existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS provider_users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          provider_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
          name VARCHAR(255),
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          last_login TIMESTAMPTZ
      );
    `);

    // 2. Crear índices
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_provider_users_email ON provider_users(email);
      CREATE INDEX IF NOT EXISTS idx_provider_users_provider_id ON provider_users(provider_id);
      CREATE INDEX IF NOT EXISTS idx_provider_users_active ON provider_users(active);
    `);

    // 3. Obtener proveedores existentes
    const suppliersResult = await client.query('SELECT id, name FROM suppliers LIMIT 3');
    const suppliers = suppliersResult.rows;

    if (suppliers.length === 0) {
      console.log('⚠️  No hay proveedores en la base de datos. Creando proveedores de prueba...');
      
      // Crear proveedores de prueba
      const testSuppliers = [
        { name: 'Proveedor Test 1', nif: '12345678A', email: 'contacto@proveedor1.com' },
        { name: 'Proveedor Test 2', nif: '87654321B', email: 'contacto@proveedor2.com' },
        { name: 'Proveedor Test 3', nif: '11223344C', email: 'contacto@proveedor3.com' }
      ];

      for (const supplier of testSuppliers) {
        await client.query(`
          INSERT INTO suppliers (name, nif_cif, email, created_at)
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT (nif_cif) DO NOTHING
        `, [supplier.name, supplier.nif, supplier.email]);
      }

      // Obtener proveedores recién creados
      const newSuppliersResult = await client.query('SELECT id, name FROM suppliers LIMIT 3');
      suppliers.push(...newSuppliersResult.rows);
    }

    // 4. Crear usuarios del portal
    const testUsers = [
      { email: 'proveedor1@test.com', password: 'password123', name: 'Usuario Proveedor 1' },
      { email: 'proveedor2@test.com', password: 'password123', name: 'Usuario Proveedor 2' },
      { email: 'proveedor3@test.com', password: 'password123', name: 'Usuario Proveedor 3' }
    ];

    console.log('👤 Creando usuarios del portal...');

    for (let i = 0; i < testUsers.length && i < suppliers.length; i++) {
      const user = testUsers[i];
      const supplier = suppliers[i];
      
      // Hash de la contraseña
      const passwordHash = await bcrypt.hash(user.password, 10);
      
      try {
        await client.query(`
          INSERT INTO provider_users (email, password_hash, name, provider_id, active)
          VALUES ($1, $2, $3, $4, true)
          ON CONFLICT (email) DO UPDATE SET
            password_hash = EXCLUDED.password_hash,
            name = EXCLUDED.name,
            provider_id = EXCLUDED.provider_id,
            updated_at = NOW()
        `, [user.email, passwordHash, user.name, supplier.id]);
        
        console.log(`✅ Usuario creado: ${user.email} -> ${supplier.name}`);
      } catch (error) {
        console.error(`❌ Error creando usuario ${user.email}:`, error.message);
      }
    }

    // 5. Crear tabla de notificaciones si no existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS provider_notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          provider_user_id UUID REFERENCES provider_users(id) ON DELETE CASCADE,
          type VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          data JSONB DEFAULT '{}',
          read BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_provider_notifications_user_id ON provider_notifications(provider_user_id);
      CREATE INDEX IF NOT EXISTS idx_provider_notifications_read ON provider_notifications(read);
      CREATE INDEX IF NOT EXISTS idx_provider_notifications_created_at ON provider_notifications(created_at);
    `);

    console.log('✅ Configuración del portal completada');
    console.log('\n📋 Usuarios de prueba creados:');
    console.log('   Email: proveedor1@test.com | Password: password123');
    console.log('   Email: proveedor2@test.com | Password: password123');
    console.log('   Email: proveedor3@test.com | Password: password123');
    console.log('\n🌐 Accede al portal en: http://localhost:3000/portal');

  } catch (error) {
    console.error('❌ Error configurando usuarios del portal:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  setupPortalUsers()
    .then(() => {
      console.log('🎉 Configuración completada exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en la configuración:', error);
      process.exit(1);
    });
}

module.exports = { setupPortalUsers }; 