// Script para verificar el estado final de la migración completa
// scripts/final-migration-check.js

const fs = require('fs');
const path = require('path');

// Todas las APIs del sistema
const ALL_APIS = [
  // APIs críticas ya migradas
  'app/api/dashboard/stats/route.ts',
  'app/api/documents/list/route.ts',
  'app/api/documents/upload/route.ts',
  'app/api/customers/route.ts',
  'app/api/suppliers/route.ts',

  // APIs secundarias que hemos migrado
  'app/api/customers/[id]/route.ts',
  'app/api/documents/data/[jobId]/route.ts',
  'app/api/documents/debug/route.ts',
  'app/api/documents/update/[jobId]/route.ts',
  'app/api/setup-database/route.ts',
  'app/api/suppliers/[id]/route.ts',

  // APIs restantes a verificar
  'app/api/documents/export/sage/route.ts',
  'app/api/documents/link/route.ts',
  'app/api/setup-test-users/route.ts',
  'app/api/test-supabase/route.ts'
];

function checkAPIFile(apiPath) {
  try {
    const fullPath = path.join(process.cwd(), apiPath);
    
    if (!fs.existsSync(fullPath)) {
      return {
        exists: false,
        migrated: false,
        status: 'missing',
        path: apiPath
      };
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    
    // Verificar si está migrado a PostgreSQL
    const isPostgreSQL = content.includes('PostgreSQLClient') && 
                         !content.includes('@supabase/supabase-js');
    
    const isSupabase = content.includes('@supabase/supabase-js');
    
    let status = 'unknown';
    if (isPostgreSQL && !isSupabase) {
      status = 'postgresql';
    } else if (isSupabase && !isPostgreSQL) {
      status = 'supabase';
    } else if (isSupabase && isPostgreSQL) {
      status = 'mixed';
    }

    return {
      exists: true,
      migrated: status === 'postgresql',
      status: status,
      path: apiPath,
      size: content.length
    };

  } catch (error) {
    return {
      exists: false,
      migrated: false,
      status: 'error',
      path: apiPath,
      error: error.message
    };
  }
}

function main() {
  console.log('🔍 [Final Check] Verificando estado final de migración...\n');

  const results = ALL_APIS.map(checkAPIFile);
  
  // Categorizar resultados
  const migrated = results.filter(r => r.migrated);
  const supabase = results.filter(r => r.status === 'supabase');
  const missing = results.filter(r => r.status === 'missing');
  const mixed = results.filter(r => r.status === 'mixed');
  const errors = results.filter(r => r.status === 'error');

  // Mostrar resumen
  console.log('📊 RESUMEN DE MIGRACIÓN:');
  console.log('========================');
  console.log(`✅ Migradas a PostgreSQL: ${migrated.length}/${ALL_APIS.length} (${Math.round(migrated.length/ALL_APIS.length*100)}%)`);
  console.log(`⚠️  Pendientes (Supabase): ${supabase.length}`);
  console.log(`❓ Archivos faltantes: ${missing.length}`);
  console.log(`🔀 Migración mixta: ${mixed.length}`);
  console.log(`❌ Errores: ${errors.length}\n`);

  // Mostrar APIs migradas
  if (migrated.length > 0) {
    console.log('✅ APIs MIGRADAS A POSTGRESQL:');
    migrated.forEach(api => {
      console.log(`   ${api.path}`);
    });
    console.log('');
  }

  // Mostrar APIs pendientes
  if (supabase.length > 0) {
    console.log('⚠️  APIs PENDIENTES (aún en Supabase):');
    supabase.forEach(api => {
      console.log(`   ${api.path}`);
    });
    console.log('');
  }

  // Mostrar APIs faltantes
  if (missing.length > 0) {
    console.log('❓ APIs FALTANTES:');
    missing.forEach(api => {
      console.log(`   ${api.path}`);
    });
    console.log('');
  }

  // Mostrar APIs con problemas
  if (mixed.length > 0) {
    console.log('🔀 APIs CON MIGRACIÓN MIXTA:');
    mixed.forEach(api => {
      console.log(`   ${api.path}`);
    });
    console.log('');
  }

  // Mostrar errores
  if (errors.length > 0) {
    console.log('❌ ERRORES:');
    errors.forEach(api => {
      console.log(`   ${api.path}: ${api.error}`);
    });
    console.log('');
  }

  // Estado general
  const completionRate = migrated.length / ALL_APIS.length;
  
  if (completionRate === 1.0) {
    console.log('🎉 ¡MIGRACIÓN COMPLETA! Todas las APIs están en PostgreSQL.');
  } else if (completionRate >= 0.8) {
    console.log('🚀 MIGRACIÓN CASI COMPLETA. Pocas APIs pendientes.');
  } else if (completionRate >= 0.5) {
    console.log('🔄 MIGRACIÓN EN PROGRESO. Más del 50% completado.');
  } else {
    console.log('🏗️  MIGRACIÓN INICIADA. Aún queda trabajo por hacer.');
  }

  console.log(`\n📈 Progreso: ${Math.round(completionRate * 100)}% completado`);
  
  // Generar reporte JSON
  const report = {
    timestamp: new Date().toISOString(),
    total_apis: ALL_APIS.length,
    migrated_count: migrated.length,
    pending_count: supabase.length,
    missing_count: missing.length,
    completion_rate: completionRate,
    status: completionRate === 1.0 ? 'complete' : 'in_progress',
    apis: results
  };

  fs.writeFileSync(
    path.join(process.cwd(), 'final-migration-report.json'),
    JSON.stringify(report, null, 2)
  );

  console.log('\n📄 Reporte guardado en: final-migration-report.json');

  return report;
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = { checkAPIFile, main }; 