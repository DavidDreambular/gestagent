const { Pool } = require('pg');

// Configuración para conectar como postgres (administrador)
const adminPool = new Pool({
  host: 'localhost',
  port: 5433,
  user: 'postgres',
  password: 'Powalola01',
  database: 'gestagent'
});

async function fixPermissions() {
  console.log('🔧 [PERMISOS] Corrigiendo permisos de PostgreSQL...');
  
  try {
    // Otorgar permisos completos al usuario gestagent_user
    console.log('🔑 [PERMISOS] Otorgando permisos al usuario gestagent_user...');
    
    const permissions = [
      // Permisos sobre el schema public
      'GRANT ALL PRIVILEGES ON SCHEMA public TO gestagent_user',
      
      // Permisos sobre todas las tablas existentes
      'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO gestagent_user',
      
      // Permisos sobre todas las secuencias
      'GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO gestagent_user',
      
      // Permisos sobre todas las funciones
      'GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO gestagent_user',
      
      // Permisos por defecto para futuras tablas
      'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO gestagent_user',
      'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO gestagent_user',
      'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO gestagent_user',
      
      // Hacer al usuario propietario de las tablas principales
      'ALTER TABLE users OWNER TO gestagent_user',
      'ALTER TABLE documents OWNER TO gestagent_user',
      'ALTER TABLE suppliers OWNER TO gestagent_user',
      'ALTER TABLE customers OWNER TO gestagent_user',
      'ALTER TABLE audit_logs OWNER TO gestagent_user'
    ];
    
    for (const permission of permissions) {
      try {
        await adminPool.query(permission);
        console.log(`✅ [PERMISOS] ${permission}`);
      } catch (error) {
        console.log(`⚠️ [PERMISOS] ${permission} - ${error.message}`);
      }
    }
    
    console.log('\n🎉 [PERMISOS] ¡Permisos corregidos exitosamente!');
    return true;
    
  } catch (error) {
    console.error('❌ [PERMISOS] Error corrigiendo permisos:', error.message);
    return false;
  } finally {
    await adminPool.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  fixPermissions()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ [PERMISOS] Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { fixPermissions }; 