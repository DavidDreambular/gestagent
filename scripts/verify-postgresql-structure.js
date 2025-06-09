const { Pool } = require('pg');

// Configuración para conectar como gestagent_user
const pool = new Pool({
  host: 'localhost',
  port: 5433,
  user: 'gestagent_user',
  password: 'gestagent_pass_2024',
  database: 'gestagent'
});

async function verifyStructure() {
  console.log('🔍 [VERIFY] Verificando estructura completa de PostgreSQL...');
  
  try {
    // 1. Verificar tablas existentes
    console.log('\n📋 [VERIFY] === TABLAS EXISTENTES ===');
    const tablesResult = await pool.query(`
      SELECT 
        tablename as table_name,
        schemaname as schema_name
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    
    console.log(`📊 [VERIFY] Total de tablas: ${tablesResult.rows.length}`);
    tablesResult.rows.forEach(table => {
      console.log(`   📄 ${table.table_name}`);
    });

    // 2. Verificar estructura de cada tabla
    console.log('\n🏗️ [VERIFY] === ESTRUCTURA DE TABLAS ===');
    for (const table of tablesResult.rows) {
      const columnsResult = await pool.query(`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns 
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position
      `, [table.table_name]);
      
      console.log(`\n📋 [VERIFY] Tabla: ${table.table_name} (${columnsResult.rows.length} columnas)`);
      columnsResult.rows.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(NOT NULL)';
        const defaultVal = col.column_default ? `default: ${col.column_default}` : '';
        console.log(`   📝 ${col.column_name}: ${col.data_type} ${nullable} ${defaultVal}`);
      });
    }

    // 3. Verificar índices
    console.log('\n🗂️ [VERIFY] === ÍNDICES ===');
    const indexesResult = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `);
    
    console.log(`📊 [VERIFY] Total de índices: ${indexesResult.rows.length}`);
    let currentTable = '';
    indexesResult.rows.forEach(idx => {
      if (idx.tablename !== currentTable) {
        console.log(`\n📄 [VERIFY] Tabla: ${idx.tablename}`);
        currentTable = idx.tablename;
      }
      console.log(`   🗂️ ${idx.indexname}`);
    });

    // 4. Verificar claves foráneas
    console.log('\n🔗 [VERIFY] === CLAVES FORÁNEAS ===');
    const fkeysResult = await pool.query(`
      SELECT
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name
    `);
    
    console.log(`📊 [VERIFY] Total de claves foráneas: ${fkeysResult.rows.length}`);
    fkeysResult.rows.forEach(fk => {
      console.log(`   🔗 ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });

    // 5. Verificar triggers
    console.log('\n⚡ [VERIFY] === TRIGGERS ===');
    const triggersResult = await pool.query(`
      SELECT 
        trigger_name,
        event_object_table as table_name,
        action_timing,
        event_manipulation
      FROM information_schema.triggers 
      WHERE trigger_schema = 'public'
      ORDER BY event_object_table, trigger_name
    `);
    
    console.log(`📊 [VERIFY] Total de triggers: ${triggersResult.rows.length}`);
    triggersResult.rows.forEach(trigger => {
      console.log(`   ⚡ ${trigger.table_name}.${trigger.trigger_name} (${trigger.action_timing} ${trigger.event_manipulation})`);
    });

    // 6. Verificar vistas
    console.log('\n👁️ [VERIFY] === VISTAS ===');
    const viewsResult = await pool.query(`
      SELECT 
        table_name as view_name,
        view_definition
      FROM information_schema.views 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log(`📊 [VERIFY] Total de vistas: ${viewsResult.rows.length}`);
    viewsResult.rows.forEach(view => {
      console.log(`   👁️ ${view.view_name}`);
    });

    // 7. Verificar extensiones
    console.log('\n🔌 [VERIFY] === EXTENSIONES ===');
    const extensionsResult = await pool.query(`
      SELECT extname, extversion
      FROM pg_extension
      ORDER BY extname
    `);
    
    console.log(`📊 [VERIFY] Total de extensiones: ${extensionsResult.rows.length}`);
    extensionsResult.rows.forEach(ext => {
      console.log(`   🔌 ${ext.extname} (v${ext.extversion})`);
    });

    // 8. Verificar datos en cada tabla
    console.log('\n📊 [VERIFY] === RECUENTO DE DATOS ===');
    for (const table of tablesResult.rows) {
      const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table.table_name}`);
      const count = countResult.rows[0].count;
      console.log(`   📄 ${table.table_name}: ${count} registros`);
    }

    // 9. Verificar funciones personalizadas
    console.log('\n⚙️ [VERIFY] === FUNCIONES PERSONALIZADAS ===');
    const functionsResult = await pool.query(`
      SELECT 
        routines.routine_name,
        routines.data_type as return_type,
        parameters.parameter_name,
        parameters.data_type as param_type
      FROM information_schema.routines 
      LEFT JOIN information_schema.parameters 
        ON routines.specific_name = parameters.specific_name
      WHERE routines.routine_schema = 'public'
        AND routines.routine_type = 'FUNCTION'
      ORDER BY routines.routine_name, parameters.ordinal_position
    `);
    
    const functions = {};
    functionsResult.rows.forEach(func => {
      if (!functions[func.routine_name]) {
        functions[func.routine_name] = {
          return_type: func.return_type,
          parameters: []
        };
      }
      if (func.parameter_name) {
        functions[func.parameter_name] = {
          name: func.parameter_name,
          type: func.param_type
        };
      }
    });
    
    console.log(`📊 [VERIFY] Total de funciones: ${Object.keys(functions).length}`);
    Object.keys(functions).forEach(funcName => {
      console.log(`   ⚙️ ${funcName}() -> ${functions[funcName].return_type}`);
    });

    console.log('\n🎉 [VERIFY] ¡Verificación completada!');
    
    return {
      success: true,
      tables: tablesResult.rows.length,
      indexes: indexesResult.rows.length,
      foreign_keys: fkeysResult.rows.length,
      triggers: triggersResult.rows.length,
      views: viewsResult.rows.length,
      extensions: extensionsResult.rows.length,
      functions: Object.keys(functions).length
    };
    
  } catch (error) {
    console.error('❌ [VERIFY] Error en verificación:', error.message);
    return { success: false, error: error.message };
  } finally {
    await pool.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  verifyStructure()
    .then(result => {
      if (result.success) {
        console.log('\n✅ [VERIFY] Verificación exitosa');
      } else {
        console.log('\n❌ [VERIFY] Verificación falló:', result.error);
      }
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ [VERIFY] Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { verifyStructure }; 