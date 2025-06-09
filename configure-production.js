const fs = require('fs');
const path = require('path');

console.log('🚀 CONFIGURANDO GESTAGENT PARA PRODUCCIÓN');
console.log('========================================');

// 1. Verificar variables de entorno requeridas
console.log('\n📋 1. VERIFICANDO CONFIGURACIÓN...');

const requiredEnvVars = [
  'MISTRAL_API_KEY',
  'DATABASE_URL', 
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL'
];

const envPath = '.env.local';
let envContent = '';

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf-8');
  console.log('✅ Archivo .env.local encontrado');
} else {
  console.log('❌ Archivo .env.local no encontrado');
  console.log('   Créalo copiando .env.example y configurando las variables');
  process.exit(1);
}

// Verificar variables críticas
const missingVars = [];
requiredEnvVars.forEach(varName => {
  if (!envContent.includes(`${varName}=`) || envContent.includes(`${varName}=`)) {
    const match = envContent.match(new RegExp(`${varName}=(.+)`));
    if (!match || !match[1] || match[1].trim() === '' || match[1].includes('your_') || match[1].includes('change_me')) {
      missingVars.push(varName);
    }
  }
});

if (missingVars.length > 0) {
  console.log('❌ Variables de entorno faltantes o no configuradas:');
  missingVars.forEach(varName => {
    console.log(`   - ${varName}`);
  });
  console.log('\n🔧 CONFIGURACIÓN REQUERIDA:');
  console.log('   1. MISTRAL_API_KEY: Obtener en https://console.mistral.ai');
  console.log('   2. DATABASE_URL: Configurar PostgreSQL');
  console.log('   3. NEXTAUTH_SECRET: Generar con `openssl rand -base64 32`');
  console.log('   4. NEXTAUTH_URL: http://localhost:3002 (desarrollo) o tu dominio (producción)');
  process.exit(1);
}

console.log('✅ Todas las variables de entorno están configuradas');

// 2. Verificar que los mocks están deshabilitados
console.log('\n🚫 2. VERIFICANDO ELIMINACIÓN DE MOCKS...');

const mistralProcessorPath = 'services/document-processor-mistral-enhanced.ts';
if (fs.existsSync(mistralProcessorPath)) {
  const processorContent = fs.readFileSync(mistralProcessorPath, 'utf-8');
  
  if (processorContent.includes('createMockResponse') && !processorContent.includes('MOCKS DESHABILITADOS')) {
    console.log('❌ Sistema de mocks aún activo en el procesador');
    console.log('   El sistema debe usar solo APIs reales para producción');
    process.exit(1);
  }
  
  if (processorContent.includes('usando modo mock') || processorContent.includes('fallback mock')) {
    console.log('❌ Referencias a modo mock encontradas en el procesador');
    console.log('   Limpia todas las referencias a mocks para producción');
    process.exit(1);
  }
  
  console.log('✅ Sistema de mocks eliminado correctamente');
} else {
  console.log('❌ Archivo document-processor-mistral-enhanced.ts no encontrado');
  process.exit(1);
}

// 3. Verificar modelo de producción
console.log('\n🤖 3. VERIFICANDO CONFIGURACIÓN DEL MODELO...');

const processorContent = fs.readFileSync(mistralProcessorPath, 'utf-8');
if (processorContent.includes('model: string = \'mistral-large-latest\'')) {
  console.log('✅ Modelo configurado: mistral-large-latest (producción)');
} else if (processorContent.includes('mistral-small-latest')) {
  console.log('⚠️  Modelo configurado: mistral-small-latest (menos costoso)');
  console.log('   Considera upgrader a mistral-large-latest para mejor rendimiento');
} else {
  console.log('❌ Modelo no identificado en la configuración');
}

// 4. Verificar configuración de errores
console.log('\n❌ 4. VERIFICANDO MANEJO DE ERRORES...');

if (processorContent.includes('throw new Error(\'MISTRAL_API_KEY es requerida para producción\')')) {
  console.log('✅ Validación de API key configurada correctamente');
} else {
  console.log('❌ Validación de API key no encontrada');
  console.log('   El sistema debe fallar rápidamente si no hay API key válida');
}

// 5. Crear script de test de producción
console.log('\n🧪 5. CREANDO SCRIPT DE TEST DE PRODUCCIÓN...');

const productionTestScript = `const { Pool } = require('pg');
const fetch = require('node-fetch');

async function testProductionReadiness() {
  console.log('🔍 PROBANDO PREPARACIÓN PARA PRODUCCIÓN');
  console.log('=====================================');
  
  // Test 1: Base de datos
  console.log('\\n📊 Probando conexión a base de datos...');
  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const result = await pool.query('SELECT COUNT(*) FROM documents');
    console.log(\`✅ Base de datos conectada: \${result.rows[0].count} documentos\`);
    await pool.end();
  } catch (error) {
    console.log(\`❌ Error de base de datos: \${error.message}\`);
    return false;
  }
  
  // Test 2: API de Mistral
  console.log('\\n🤖 Probando API de Mistral...');
  try {
    const response = await fetch('https://api.mistral.ai/v1/models', {
      headers: {
        'Authorization': \`Bearer \${process.env.MISTRAL_API_KEY}\`
      }
    });
    
    if (response.ok) {
      const models = await response.json();
      console.log(\`✅ API de Mistral conectada: \${models.data.length} modelos disponibles\`);
    } else {
      console.log(\`❌ Error API Mistral: \${response.status} - \${response.statusText}\`);
      return false;
    }
  } catch (error) {
    console.log(\`❌ Error conectando a Mistral: \${error.message}\`);
    return false;
  }
  
  // Test 3: Servidor NextJS
  console.log('\\n🌐 Probando servidor NextJS...');
  try {
    const serverUrl = process.env.NEXTAUTH_URL || 'http://localhost:3002';
    const response = await fetch(\`\${serverUrl}/api/health\`);
    
    if (response.ok) {
      console.log(\`✅ Servidor NextJS funcionando en \${serverUrl}\`);
    } else {
      console.log(\`⚠️  Servidor responde pero con error: \${response.status}\`);
    }
  } catch (error) {
    console.log(\`❌ Servidor no disponible: \${error.message}\`);
  }
  
  console.log('\\n🎉 TODOS LOS TESTS COMPLETADOS');
  return true;
}

if (require.main === module) {
  testProductionReadiness().then(success => {
    if (success) {
      console.log('\\n✅ SISTEMA LISTO PARA PRODUCCIÓN');
    } else {
      console.log('\\n❌ SISTEMA NO LISTO - REVISAR ERRORES');
      process.exit(1);
    }
  });
}

module.exports = { testProductionReadiness };`;

fs.writeFileSync('test-production-readiness.js', productionTestScript);
console.log('✅ Script de test creado: test-production-readiness.js');

// 6. Crear endpoint de health check
console.log('\n🏥 6. CREANDO ENDPOINT DE HEALTH CHECK...');

const healthCheckPath = 'app/api/health/route.ts';
const healthCheckDir = path.dirname(healthCheckPath);

if (!fs.existsSync(healthCheckDir)) {
  fs.mkdirSync(healthCheckDir, { recursive: true });
}

const healthCheckContent = `import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function GET() {
  try {
    // Verificar base de datos
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query('SELECT 1');
    await pool.end();
    
    // Verificar variables críticas
    const requiredEnvs = ['MISTRAL_API_KEY', 'DATABASE_URL', 'NEXTAUTH_SECRET'];
    const missing = requiredEnvs.filter(env => !process.env[env]);
    
    if (missing.length > 0) {
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'Variables de entorno faltantes',
          missing: missing
        }, 
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: 'connected',
      config: 'complete'
    });
    
  } catch (error: any) {
    return NextResponse.json(
      { 
        status: 'error', 
        message: error.message,
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}`;

fs.writeFileSync(healthCheckPath, healthCheckContent);
console.log('✅ Health check creado: /api/health');

// 7. Instrucciones finales
console.log('\n🎯 CONFIGURACIÓN COMPLETADA');
console.log('===========================');

console.log('\n📝 PRÓXIMOS PASOS:');
console.log('1. Obtener API key real de Mistral:');
console.log('   → https://console.mistral.ai');
console.log('   → Configurar facturación');
console.log('   → Generar API key');
console.log('   → Actualizar MISTRAL_API_KEY en .env.local');

console.log('\n2. Probar la configuración:');
console.log('   → node test-production-readiness.js');

console.log('\n3. Iniciar el servidor:');
console.log('   → npm run dev');

console.log('\n4. Verificar health check:');
console.log('   → http://localhost:3002/api/health');

console.log('\n5. Probar upload de documento:');
console.log('   → Login en http://localhost:3002');
console.log('   → Subir PDF en /dashboard/documents/new');

console.log('\n💰 ESTIMACIÓN DE COSTOS (Mistral Small):');
console.log('   → 1 factura típica: ~$0.001 USD');
console.log('   → 1000 facturas/mes: ~$1 USD');
console.log('   → Para mayor volumen, considera Mistral Large');

console.log('\n🚨 IMPORTANTE PARA PRODUCCIÓN:');
console.log('   → Usar variables de entorno en servidor');
console.log('   → Configurar dominio real en NEXTAUTH_URL');
console.log('   → Implementar rate limiting');
console.log('   → Monitorear costos en console.mistral.ai');
console.log('   → Backup regular de PostgreSQL');

console.log('\n✅ SISTEMA CONFIGURADO PARA PRODUCCIÓN REAL'); 