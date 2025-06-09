const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://gestagent_user:gestagent_pass_2024@localhost:5433/gestagent'
});

async function checkAndFixAudit() {
  try {
    console.log('🔍 Verificando estado actual de audit_logs...');
    
    // Verificar si la tabla existe
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'audit_logs'
      )
    `);
    
    if (tableExists.rows[0].exists) {
      console.log('⚠️  La tabla audit_logs ya existe. Verificando estructura...');
      
      // Verificar columnas existentes
      const columns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'audit_logs'
        ORDER BY ordinal_position
      `);
      
      console.log('📋 Columnas actuales:');
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
      
      // Eliminar la tabla existente para recrearla limpia
      console.log('🗑️  Eliminando tabla existente para recrearla...');
      await pool.query('DROP TABLE IF EXISTS audit_logs CASCADE');
      console.log('✅ Tabla eliminada exitosamente');
      
    } else {
      console.log('✅ La tabla audit_logs no existe. Procederemos a crearla.');
    }
    
    // Verificar otras dependencias que pueden causar problemas
    console.log('🔍 Verificando funciones existentes...');
    const functions = await pool.query(`
      SELECT proname 
      FROM pg_proc 
      WHERE proname IN ('log_audit_action', 'trigger_audit_log', 'cleanup_old_audit_logs')
    `);
    
    if (functions.rows.length > 0) {
      console.log('🗑️  Eliminando funciones existentes...');
      await pool.query('DROP FUNCTION IF EXISTS log_audit_action CASCADE');
      await pool.query('DROP FUNCTION IF EXISTS trigger_audit_log CASCADE');
      await pool.query('DROP FUNCTION IF EXISTS cleanup_old_audit_logs CASCADE');
      console.log('✅ Funciones eliminadas');
    }
    
    // Verificar vistas existentes
    const views = await pool.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_name = 'audit_logs_view'
    `);
    
    if (views.rows.length > 0) {
      console.log('🗑️  Eliminando vista existente...');
      await pool.query('DROP VIEW IF EXISTS audit_logs_view CASCADE');
      console.log('✅ Vista eliminada');
    }
    
    console.log('✅ Limpieza completada. El sistema está listo para la migración.');
    
  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Ejecutar verificación
checkAndFixAudit()
  .then(() => {
    console.log('\n✅ Verificación completada. Ahora puedes ejecutar run-audit-migration.js');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error en la verificación:', error);
    process.exit(1);
  }); 