const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuración específica del usuario - PostgreSQL 16 en puerto 5433
const DB_CONFIG = {
  host: 'localhost',
  port: 5433, // PostgreSQL 16 está en puerto 5433
  user: 'postgres',
  password: 'Powalola01', // Contraseña específica del usuario
  database: 'postgres' // Base de datos inicial
};

const PROJECT_DB = 'gestagent';
const PROJECT_USER = 'gestagent_user';
const PROJECT_PASSWORD = 'gestagent_pass_2024';

async function setupPostgreSQL() {
  console.log('🚀 [SETUP] Iniciando configuración de PostgreSQL para GestAgent...');
  
  let client;
  try {
    // Conectar como postgres
    console.log('📡 [SETUP] Conectando a PostgreSQL...');
    client = new Pool(DB_CONFIG);
    
    // Verificar conexión
    const result = await client.query('SELECT version()');
    console.log('✅ [SETUP] Conectado a PostgreSQL:', result.rows[0].version);
    
    // Crear base de datos del proyecto
    console.log(`📦 [SETUP] Creando base de datos ${PROJECT_DB}...`);
    try {
      await client.query(`CREATE DATABASE ${PROJECT_DB}`);
      console.log(`✅ [SETUP] Base de datos ${PROJECT_DB} creada`);
    } catch (error) {
      if (error.code === '42P04') {
        console.log(`⚠️ [SETUP] Base de datos ${PROJECT_DB} ya existe`);
      } else {
        throw error;
      }
    }
    
    // Crear usuario del proyecto
    console.log(`👤 [SETUP] Creando usuario ${PROJECT_USER}...`);
    try {
      await client.query(`CREATE USER ${PROJECT_USER} WITH PASSWORD '${PROJECT_PASSWORD}'`);
      console.log(`✅ [SETUP] Usuario ${PROJECT_USER} creado`);
    } catch (error) {
      if (error.code === '42710') {
        console.log(`⚠️ [SETUP] Usuario ${PROJECT_USER} ya existe`);
      } else {
        throw error;
      }
    }
    
    // Otorgar permisos
    console.log('🔑 [SETUP] Configurando permisos...');
    await client.query(`GRANT ALL PRIVILEGES ON DATABASE ${PROJECT_DB} TO ${PROJECT_USER}`);
    await client.query(`ALTER USER ${PROJECT_USER} CREATEDB`);
    console.log('✅ [SETUP] Permisos configurados');
    
    await client.end();
    
    // Conectar a la nueva base de datos para crear el schema
    console.log('🏗️ [SETUP] Inicializando schema...');
    const projectClient = new Pool({
      ...DB_CONFIG,
      database: PROJECT_DB
    });
    
    // Leer y ejecutar el schema SQL
    const schemaPath = path.join(__dirname, 'init-postgresql.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await projectClient.query(schema);
    console.log('✅ [SETUP] Schema inicializado correctamente');
    
    await projectClient.end();
    
    // Generar archivo de variables de entorno
    console.log('📝 [SETUP] Generando archivo de configuración...');
    const envConfig = `# PostgreSQL Configuration for GestAgent
# Generated automatically on ${new Date().toISOString()}

# Database Configuration
 DATABASE_URL=postgresql://${PROJECT_USER}:${PROJECT_PASSWORD}@localhost:5433/${PROJECT_DB}
 POSTGRES_HOST=localhost
 POSTGRES_PORT=5433
POSTGRES_DB=${PROJECT_DB}
POSTGRES_USER=${PROJECT_USER}
POSTGRES_PASSWORD=${PROJECT_PASSWORD}

# Connection Pool Settings
POSTGRES_MAX_CONNECTIONS=20
POSTGRES_IDLE_TIMEOUT=30000
POSTGRES_CONNECTION_TIMEOUT=2000

# Features
POSTGRES_SSL=false
POSTGRES_SSL_REJECT_UNAUTHORIZED=false

# Migration Status
POSTGRESQL_MIGRATED=true
POSTGRESQL_SETUP_DATE=${new Date().toISOString()}
`;

    fs.writeFileSync('.env.postgresql', envConfig);
    console.log('✅ [SETUP] Archivo .env.postgresql generado');
    
    console.log('\n🎉 [SETUP] ¡PostgreSQL configurado exitosamente!');
    console.log('\n📋 [SETUP] Variables de conexión:');
    console.log(`   Host: localhost`);
         console.log(`   Puerto: 5433`);
    console.log(`   Base de datos: ${PROJECT_DB}`);
    console.log(`   Usuario: ${PROJECT_USER}`);
    console.log(`   Contraseña: ${PROJECT_PASSWORD}`);
    console.log('\n📄 [SETUP] Configuración guardada en .env.postgresql');
    console.log('\n🔧 [SETUP] Siguiente paso: Integrar con NextJS');
    
    return true;
    
  } catch (error) {
    console.error('❌ [SETUP] Error en configuración:', error.message);
    if (client) await client.end();
    return false;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  setupPostgreSQL()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ [SETUP] Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { setupPostgreSQL, DB_CONFIG, PROJECT_DB, PROJECT_USER, PROJECT_PASSWORD }; 