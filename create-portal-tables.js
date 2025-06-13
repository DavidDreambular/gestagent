const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  user: 'gestagent_user',
  host: 'localhost',
  database: 'gestagent',
  password: 'gestagent_pass_2024',
  port: 5432,
});

async function createPortalTables() {
  try {
    console.log('🏗️ Creando tablas del portal de proveedores...');
    
    // 1. Crear tabla provider_users
    console.log('📋 Creando tabla provider_users...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS provider_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        supplier_id UUID REFERENCES suppliers(supplier_id) ON DELETE CASCADE,
        name VARCHAR(255),
        company_name VARCHAR(255),
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        last_login TIMESTAMPTZ
      );
    `);
    
    // 2. Crear índices
    console.log('🔍 Creando índices...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_provider_users_email ON provider_users(email);
      CREATE INDEX IF NOT EXISTS idx_provider_users_supplier_id ON provider_users(supplier_id);
      CREATE INDEX IF NOT EXISTS idx_provider_users_active ON provider_users(active);
    `);
    
    // 3. Crear tabla de notificaciones del portal
    console.log('📧 Creando tabla provider_notifications...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS provider_notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        provider_user_id UUID REFERENCES provider_users(id) ON DELETE CASCADE,
        title VARCHAR(500) NOT NULL,
        message TEXT,
        type VARCHAR(50) DEFAULT 'info', -- info, success, warning, error
        is_read BOOLEAN DEFAULT false,
        action_url VARCHAR(500),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        read_at TIMESTAMPTZ
      );
    `);
    
    // 4. Índices para notificaciones
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_provider_notifications_user_id ON provider_notifications(provider_user_id);
      CREATE INDEX IF NOT EXISTS idx_provider_notifications_is_read ON provider_notifications(is_read);
      CREATE INDEX IF NOT EXISTS idx_provider_notifications_created_at ON provider_notifications(created_at DESC);
    `);
    
    // 5. Crear tabla de sesiones del portal
    console.log('🔐 Creando tabla provider_sessions...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS provider_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        provider_user_id UUID REFERENCES provider_users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    
    // 6. Índices para sesiones
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_provider_sessions_user_id ON provider_sessions(provider_user_id);
      CREATE INDEX IF NOT EXISTS idx_provider_sessions_token_hash ON provider_sessions(token_hash);
      CREATE INDEX IF NOT EXISTS idx_provider_sessions_expires_at ON provider_sessions(expires_at);
    `);
    
    // 7. Crear tabla de preferencias de notificaciones
    console.log('📧 Creando tabla provider_notification_preferences...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS provider_notification_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        provider_user_id UUID UNIQUE REFERENCES provider_users(id) ON DELETE CASCADE,
        email_notifications BOOLEAN DEFAULT true,
        weekly_reports BOOLEAN DEFAULT true,
        document_upload_notifications BOOLEAN DEFAULT true,
        document_processed_notifications BOOLEAN DEFAULT true,
        error_notifications BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    
    // 8. Índices para preferencias de notificaciones
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_provider_notification_preferences_user_id ON provider_notification_preferences(provider_user_id);
    `);
    
    // 9. Función para limpiar sesiones expiradas
    console.log('🧹 Creando función de limpieza...');
    await pool.query(`
      CREATE OR REPLACE FUNCTION cleanup_expired_provider_sessions()
      RETURNS INTEGER AS $$
      DECLARE
        deleted_count INTEGER;
      BEGIN
        DELETE FROM provider_sessions WHERE expires_at < NOW();
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RETURN deleted_count;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // 10. Verificar si tenemos proveedores para crear usuarios de prueba
    console.log('👥 Verificando proveedores existentes...');
    const suppliers = await pool.query(`
      SELECT supplier_id, name FROM suppliers 
      WHERE name IS NOT NULL 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    if (suppliers.rows.length > 0) {
      console.log(`📊 Encontrados ${suppliers.rows.length} proveedores para crear usuarios`);
      
      // 11. Crear usuarios de prueba para cada proveedor
      const passwordHash = await bcrypt.hash('portal123', 10);
      
      for (const supplier of suppliers.rows) {
        const email = `${supplier.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@portal.test`;
        const userName = `Usuario ${supplier.name}`;
        
        try {
          await pool.query(`
            INSERT INTO provider_users (email, password_hash, supplier_id, name, company_name, active)
            VALUES ($1, $2, $3, $4, $5, true)
            ON CONFLICT (email) DO NOTHING
          `, [email, passwordHash, supplier.supplier_id, userName, supplier.name]);
          
          console.log(`   ✅ Usuario creado: ${email} → ${supplier.name}`);
        } catch (error) {
          console.log(`   ⚠️ Usuario ya existe: ${email}`);
        }
      }
    } else {
      console.log('⚠️ No se encontraron proveedores para crear usuarios de prueba');
    }
    
    // 12. Estadísticas finales
    console.log('\n📊 Verificando tablas creadas...');
    
    const userCount = await pool.query('SELECT COUNT(*) FROM provider_users');
    const sessionCount = await pool.query('SELECT COUNT(*) FROM provider_sessions');
    const notificationCount = await pool.query('SELECT COUNT(*) FROM provider_notifications');
    const preferencesCount = await pool.query('SELECT COUNT(*) FROM provider_notification_preferences');
    
    console.log(`   • Usuarios del portal: ${userCount.rows[0].count}`);
    console.log(`   • Sesiones activas: ${sessionCount.rows[0].count}`);
    console.log(`   • Notificaciones: ${notificationCount.rows[0].count}`);
    console.log(`   • Preferencias de notificaciones: ${preferencesCount.rows[0].count}`);
    
    // 13. Mostrar usuarios creados
    if (parseInt(userCount.rows[0].count) > 0) {
      console.log('\n👤 Usuarios del portal creados:');
      const users = await pool.query(`
        SELECT pu.email, pu.name, pu.company_name, pu.active, s.name as supplier_name
        FROM provider_users pu
        LEFT JOIN suppliers s ON pu.supplier_id = s.supplier_id
        ORDER BY pu.created_at DESC
      `);
      
      users.rows.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email}`);
        console.log(`      • Nombre: ${user.name}`);
        console.log(`      • Empresa: ${user.company_name || user.supplier_name}`);
        console.log(`      • Estado: ${user.active ? 'Activo' : 'Inactivo'}`);
        console.log(`      • Contraseña de prueba: portal123`);
      });
    }
    
    console.log('\n✅ Tablas del portal de proveedores creadas exitosamente!');
    
  } catch (error) {
    console.error('❌ Error creando tablas:', error);
  } finally {
    await pool.end();
  }
}

createPortalTables();