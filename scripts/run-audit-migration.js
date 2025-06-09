const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://gestagent_user:gestagent_pass_2024@localhost:5433/gestagent'
});

async function runAuditMigration() {
  try {
    console.log('🔄 Iniciando migración del sistema de auditoría...');
    
    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, 'create-audit-logs-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Ejecutar la migración
    await pool.query(sql);
    
    console.log('✅ Migración de auditoría completada exitosamente!');
    
    // Verificar que la tabla se creó
    const result = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'audit_logs'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Estructura de la tabla audit_logs:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
    // Verificar índices
    const indexes = await pool.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'audit_logs'
    `);
    
    console.log('\n🔍 Índices creados:');
    indexes.rows.forEach(row => {
      console.log(`  - ${row.indexname}`);
    });
    
    // Verificar funciones
    const functions = await pool.query(`
      SELECT proname, prosrc 
      FROM pg_proc 
      WHERE proname IN ('log_audit_action', 'trigger_audit_log', 'cleanup_old_audit_logs')
    `);
    
    console.log('\n⚙️ Funciones creadas:');
    functions.rows.forEach(row => {
      console.log(`  - ${row.proname}()`);
    });
    
    // Verificar vista
    const views = await pool.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_name = 'audit_logs_view'
    `);
    
    if (views.rows.length > 0) {
      console.log('\n👁️ Vista creada: audit_logs_view');
    }
    
    // Probar inserción de log de prueba
    console.log('\n🧪 Probando inserción de log de auditoría...');
    const testResult = await pool.query(`
      SELECT log_audit_action(
        $1::UUID,
        'TEST',
        'system',
        'migration_test',
        NULL,
        '{"message": "Sistema de auditoría inicializado"}'::jsonb,
        '127.0.0.1'::inet,
        'Migration Script',
        'migration_session',
        'migration_request',
        '{"source": "migration"}'::jsonb
      )
    `, ['550e8400-e29b-41d4-a716-446655440000']); // User ID de admin de prueba
    
    console.log(`✅ Log de prueba creado con ID: ${testResult.rows[0].log_audit_action}`);
    
    // Consultar el log insertado
    const logCheck = await pool.query(`
      SELECT * FROM audit_logs_view WHERE action = 'TEST' ORDER BY created_at DESC LIMIT 1
    `);
    
    if (logCheck.rows.length > 0) {
      console.log('✅ Log de prueba recuperado exitosamente');
      console.log(`   Acción: ${logCheck.rows[0].action_display}`);
      console.log(`   Entidad: ${logCheck.rows[0].entity_type_display}`);
      console.log(`   Fecha: ${logCheck.rows[0].created_at}`);
    }
    
    console.log('\n🎉 Sistema de auditoría completamente funcional!');
    console.log('\n📋 Siguientes pasos:');
    console.log('   1. Implementar servicio de auditoría en el backend');
    console.log('   2. Integrar auditoría en las operaciones de documentos');
    console.log('   3. Crear interfaz de visualización de logs');
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Ejecutar migración
runAuditMigration()
  .then(() => {
    console.log('\n✅ Migración completada exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error en la migración:', error);
    process.exit(1);
  }); 