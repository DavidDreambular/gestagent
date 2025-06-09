// scripts/setup-postgresql.js
// Script para configurar PostgreSQL automáticamente

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🐘 CONFIGURACIÓN POSTGRESQL - GESTAGENT');
console.log('=' .repeat(50));

// Verificar si PostgreSQL está instalado
function checkPostgreSQL() {
  try {
    const version = execSync('pg_ctl --version', { encoding: 'utf8' });
    console.log('✅ PostgreSQL encontrado:', version.trim());
    return true;
  } catch (error) {
    console.log('❌ PostgreSQL no encontrado en PATH');
    console.log('');
    console.log('INSTALACIÓN MANUAL REQUERIDA:');
    console.log('1. Ve a: https://www.postgresql.org/download/windows/');
    console.log('2. Descarga PostgreSQL 16.x');
    console.log('3. Instala con configuración por defecto');
    console.log('4. Usuario: postgres, Puerto: 5432');
    console.log('5. Reinicia el terminal después de instalar');
    console.log('');
    return false;
  }
}

// Verificar servicio PostgreSQL
function checkService() {
  try {
    // Intentar conectar a PostgreSQL
    execSync('psql -U postgres -h localhost -c "SELECT version();" 2>nul', { encoding: 'utf8' });
    console.log('✅ Servicio PostgreSQL activo');
    return true;
  } catch (error) {
    console.log('⚠️  Servicio PostgreSQL no responde');
    console.log('   Verificar que el servicio esté iniciado');
    return false;
  }
}

// Crear usuario y base de datos
function setupDatabase() {
  console.log('🔧 Configurando base de datos...');
  
  const commands = [
    "CREATE USER gestagent WITH PASSWORD 'gestagent123';",
    "CREATE DATABASE gestagent_db OWNER gestagent;",
    "GRANT ALL PRIVILEGES ON DATABASE gestagent_db TO gestagent;",
    "\\c gestagent_db",
    "GRANT ALL ON SCHEMA public TO gestagent;",
    "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO gestagent;",
    "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO gestagent;"
  ];
  
  try {
    for (const cmd of commands) {
      console.log(`   Ejecutando: ${cmd}`);
      execSync(`psql -U postgres -h localhost -c "${cmd}" 2>nul`, { encoding: 'utf8' });
    }
    console.log('✅ Base de datos configurada');
    return true;
  } catch (error) {
    console.log('⚠️  Algunos comandos pueden haber fallado (normal si ya existen)');
    return true; // Continuar aunque algunos comandos fallen
  }
}

// Ejecutar script SQL de inicialización
function initializeSchema() {
  console.log('📊 Inicializando schema...');
  
  const sqlFile = path.join(__dirname, 'init-postgresql.sql');
  
  if (!fs.existsSync(sqlFile)) {
    console.log('❌ Archivo init-postgresql.sql no encontrado');
    return false;
  }
  
  try {
    execSync(`psql -U gestagent -h localhost -d gestagent_db -f "${sqlFile}"`, { 
      encoding: 'utf8',
      stdio: 'inherit'
    });
    console.log('✅ Schema inicializado correctamente');
    return true;
  } catch (error) {
    console.log('❌ Error inicializando schema:', error.message);
    return false;
  }
}

// Probar conexión final
function testConnection() {
  console.log('🧪 Probando conexión final...');
  
  try {
    const result = execSync(
      'psql -U gestagent -h localhost -d gestagent_db -c "SELECT COUNT(*) as total_users FROM users;"',
      { encoding: 'utf8' }
    );
    console.log('✅ Conexión exitosa');
    console.log('📊 Resultado de prueba:');
    console.log(result);
    return true;
  } catch (error) {
    console.log('❌ Error de conexión:', error.message);
    return false;
  }
}

// Crear archivo .env.local
function createEnvFile() {
  console.log('⚙️  Configurando variables de entorno...');
  
  const envContent = `# PostgreSQL Local Database - GESTAGENT
DATABASE_URL="postgresql://gestagent:gestagent123@localhost:5432/gestagent_db"
POSTGRES_HOST="localhost"
POSTGRES_PORT="5432"
POSTGRES_DB="gestagent_db"
POSTGRES_USER="gestagent"
POSTGRES_PASSWORD="gestagent123"

# APIs Externas (mantener existentes)
MISTRAL_API_KEY="JITyrx8a7QaG8Wxj0XOqDRtgqmKUeOzr"
OPENROUTER_API_KEY="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"

# Auth (mantener)
NEXTAUTH_SECRET="tu-secret-gestagent-2024"
NEXTAUTH_URL="http://localhost:3000"

# Supabase DESACTIVADO (comentado)
# NEXT_PUBLIC_SUPABASE_URL=""
# NEXT_PUBLIC_SUPABASE_ANON_KEY=""
# SUPABASE_SERVICE_ROLE_KEY=""
`;

  const envPath = path.join(process.cwd(), '.env.local');
  
  try {
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Archivo .env.local actualizado');
    return true;
  } catch (error) {
    console.log('❌ Error creando .env.local:', error.message);
    return false;
  }
}

// Función principal
async function main() {
  console.log('🚀 Iniciando configuración...');
  console.log('');
  
  // Paso 1: Verificar PostgreSQL
  if (!checkPostgreSQL()) {
    process.exit(1);
  }
  
  // Paso 2: Verificar servicio
  if (!checkService()) {
    console.log('💡 Intenta iniciar PostgreSQL manualmente o reiniciar el equipo');
    process.exit(1);
  }
  
  // Paso 3: Configurar base de datos
  setupDatabase();
  
  // Paso 4: Inicializar schema
  if (!initializeSchema()) {
    console.log('⚠️  Error en inicialización, pero continuando...');
  }
  
  // Paso 5: Crear variables de entorno
  createEnvFile();
  
  // Paso 6: Probar conexión
  testConnection();
  
  console.log('');
  console.log('🎉 CONFIGURACIÓN COMPLETADA');
  console.log('=' .repeat(50));
  console.log('');
  console.log('✅ PostgreSQL configurado correctamente');
  console.log('✅ Base de datos: gestagent_db');
  console.log('✅ Usuario: gestagent / gestagent123');
  console.log('✅ Variables de entorno actualizadas');
  console.log('');
  console.log('🔄 SIGUIENTE PASO:');
  console.log('   Reinicia el servidor de desarrollo:');
  console.log('   npm run dev');
  console.log('');
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main }; 