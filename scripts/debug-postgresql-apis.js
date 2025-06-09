const { Pool } = require('pg');

// Verificar variables de entorno
console.log('🔍 [DEBUG] Verificando configuración de PostgreSQL...');

const config = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5433,
  database: process.env.POSTGRES_DATABASE || 'gestagent',
  user: process.env.POSTGRES_USER || 'gestagent_user',
  password: process.env.POSTGRES_PASSWORD || 'gestagent_pass_2024',
  ssl: process.env.POSTGRES_SSL === 'true'
};

console.log('📋 [DEBUG] Configuración PostgreSQL:');
console.log('   🏠 Host:', config.host);
console.log('   🔌 Port:', config.port);
console.log('   🗄️ Database:', config.database);
console.log('   👤 User:', config.user);
console.log('   🔒 SSL:', config.ssl);
console.log('   🔑 Password:', config.password ? '***SET***' : '***NOT SET***');

// Test específico del cliente PostgreSQL
async function testPostgreSQLClient() {
  try {
    console.log('\\n🧪 [DEBUG] Probando cliente PostgreSQL directo...');
    
    // Importar cliente
    const pgClient = require('../lib/postgresql-client');
    
    // Test de conexión básica
    const { data: testData, error: testError } = await pgClient.query('SELECT 1 as test');
    if (testError) {
      console.error('❌ [DEBUG] Error en query test:', testError);
      return false;
    }
    console.log('✅ [DEBUG] Query test exitosa:', testData);

    // Test de método getSuppliers
    console.log('\\n🧪 [DEBUG] Probando método getSuppliers...');
    const { data: suppliers, error: suppliersError } = await pgClient.getSuppliers({ limit: 5 });
    if (suppliersError) {
      console.error('❌ [DEBUG] Error en getSuppliers:', suppliersError);
      return false;
    }
    console.log('✅ [DEBUG] getSuppliers exitoso:', suppliers?.length || 0, 'proveedores');

    // Test de método getCustomers  
    console.log('\\n🧪 [DEBUG] Probando método getCustomers...');
    const { data: customers, error: customersError } = await pgClient.getCustomers({ limit: 5 });
    if (customersError) {
      console.error('❌ [DEBUG] Error en getCustomers:', customersError);
      return false;
    }
    console.log('✅ [DEBUG] getCustomers exitoso:', customers?.length || 0, 'clientes');

    return true;
  } catch (error) {
    console.error('❌ [DEBUG] Error general en cliente PostgreSQL:', error);
    return false;
  }
}

// Test de APIs específicas
async function testAPIs() {
  try {
    console.log('\\n🌐 [DEBUG] Probando APIs en localhost:3001...');
    
    const axios = require('axios');
    
    // Test API stats (ya funciona)
    try {
      const statsResponse = await axios.get('http://localhost:3001/api/dashboard/stats');
      console.log('✅ [DEBUG] API /dashboard/stats OK:', statsResponse.status);
    } catch (error) {
      console.error('❌ [DEBUG] API /dashboard/stats ERROR:', error.response?.status, error.message);
    }

    // Test API documents/list (ya funciona)
    try {
      const docsResponse = await axios.get('http://localhost:3001/api/documents/list');
      console.log('✅ [DEBUG] API /documents/list OK:', docsResponse.status);
    } catch (error) {
      console.error('❌ [DEBUG] API /documents/list ERROR:', error.response?.status, error.message);
    }

    // Test API suppliers (con error)
    try {
      const suppliersResponse = await axios.get('http://localhost:3001/api/suppliers');
      console.log('✅ [DEBUG] API /suppliers OK:', suppliersResponse.status);
    } catch (error) {
      console.error('❌ [DEBUG] API /suppliers ERROR:', error.response?.status, error.message);
      if (error.response?.data) {
        console.error('   📄 Response data:', error.response.data);
      }
    }

    // Test API customers (con error)
    try {
      const customersResponse = await axios.get('http://localhost:3001/api/customers');
      console.log('✅ [DEBUG] API /customers OK:', customersResponse.status);
    } catch (error) {
      console.error('❌ [DEBUG] API /customers ERROR:', error.response?.status, error.message);
      if (error.response?.data) {
        console.error('   📄 Response data:', error.response.data);
      }
    }

  } catch (error) {
    console.error('❌ [DEBUG] Error general en test de APIs:', error);
  }
}

// Ejecutar diagnóstico completo
async function main() {
  console.log('🚀 [DEBUG] Iniciando diagnóstico de APIs PostgreSQL...');
  
  try {
    // 1. Test directo del cliente
    const clientOK = await testPostgreSQLClient();
    
    // 2. Test de APIs
    await testAPIs();
    
    // 3. Resumen
    console.log('\\n📋 [DEBUG] === RESUMEN DIAGNÓSTICO ===');
    console.log(`✅ Cliente PostgreSQL: ${clientOK ? 'OK' : 'ERROR'}`);
    console.log('🔍 Revisar logs de APIs arriba para errores específicos');
    
  } catch (error) {
    console.error('❌ [DEBUG] Error en diagnóstico:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
} 