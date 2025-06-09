const { Pool } = require('pg');

async function testConnection(config) {
  const pool = new Pool(config);
  try {
    const result = await pool.query('SELECT NOW() as time');
    console.log('✅ Conexión exitosa con:', JSON.stringify(config, null, 2));
    console.log('   Tiempo:', result.rows[0].time);
    await pool.end();
    return true;
  } catch (error) {
    console.log('❌ Falló con:', JSON.stringify(config, null, 2));
    console.log('   Error:', error.message);
    await pool.end();
    return false;
  }
}

async function findCorrectCredentials() {
  console.log('🔍 Buscando credenciales correctas de PostgreSQL...\n');

  const configs = [
    // Config actual del .env.local
    {
      host: 'localhost',
      port: 5433,
      database: 'gestagent',
      user: 'gestagent_user',
      password: 'gestagent_pass_2024'
    },
    // Config alternativa con puerto estándar
    {
      host: 'localhost',
      port: 5432,
      database: 'gestagent',
      user: 'gestagent_user',
      password: 'gestagent_pass_2024'
    },
    // Config con usuario y DB diferentes
    {
      host: 'localhost',
      port: 5432,
      database: 'gestagent_db',
      user: 'gestagent',
      password: 'gestagent123'
    },
    // Config con puerto no estándar
    {
      host: 'localhost',
      port: 5433,
      database: 'gestagent_db',
      user: 'gestagent',
      password: 'gestagent123'
    },
    // Config con usuario postgres por defecto
    {
      host: 'localhost',
      port: 5432,
      database: 'gestagent',
      user: 'postgres',
      password: 'postgres'
    }
  ];

  for (const config of configs) {
    console.log(`\n🧪 Probando configuración...`);
    const success = await testConnection(config);
    if (success) {
      console.log('\n🎉 ¡Credenciales correctas encontradas!');
      console.log('Actualizar .env.local con:');
      console.log(`POSTGRES_HOST=${config.host}`);
      console.log(`POSTGRES_PORT=${config.port}`);
      console.log(`POSTGRES_DB=${config.database}`);
      console.log(`POSTGRES_USER=${config.user}`);
      console.log(`POSTGRES_PASSWORD=${config.password}`);
      console.log(`DATABASE_URL=postgresql://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`);
      return config;
    }
  }

  console.log('\n❌ No se encontraron credenciales válidas.');
  console.log('Verifica que PostgreSQL esté corriendo: pg_ctl status');
  return null;
}

findCorrectCredentials(); 