// Script para completar todas las migraciones de APIs restantes
// scripts/complete-all-api-migrations.js

const fs = require('fs');
const path = require('path');

// APIs restantes a migrar
const REMAINING_APIS = [
  'app/api/documents/export/sage/route.ts',
  'app/api/documents/link/route.ts', 
  'app/api/setup-test-users/route.ts',
  'app/api/test-supabase/route.ts'
];

// Template para migrar APIs simples
const MIGRATION_TEMPLATES = {
  'export-sage': `// API Route para exportar documentos a formato Sage
// /app/api/documents/export/sage/route.ts
// Versión 2.0.0 - Migrado a PostgreSQL

import { NextRequest, NextResponse } from 'next/server';
import { PostgreSQLClient } from '@/lib/postgresql-client';

const pgClient = new PostgreSQLClient();

export async function GET(request: NextRequest) {
  try {
    console.log('📊 [Export Sage] Generando exportación Sage...');

    // Obtener documentos para exportar
    const documentsResult = await pgClient.query(\`
      SELECT 
        job_id,
        document_type,
        processed_json,
        document_date,
        emitter_name,
        receiver_name,
        total_amount,
        upload_timestamp
      FROM documents 
      WHERE status = 'completed'
      ORDER BY document_date DESC
      LIMIT 100
    \`);

    if (documentsResult.error) {
      return NextResponse.json(
        { error: 'Error obteniendo documentos', details: documentsResult.error.message },
        { status: 500 }
      );
    }

    const documents = documentsResult.data || [];
    
    // Formatear para Sage
    const sageData = documents.map(doc => ({
      fecha: doc.document_date,
      tipo: doc.document_type,
      emisor: doc.emitter_name,
      receptor: doc.receiver_name,
      importe: parseFloat(doc.total_amount || '0'),
      referencia: doc.job_id
    }));

    return NextResponse.json({
      success: true,
      format: 'sage',
      total_documents: documents.length,
      data: sageData,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Export Sage] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}`,

  'link': `// API Route para gestión de enlaces de documentos
// /app/api/documents/link/route.ts
// Versión 2.0.0 - Migrado a PostgreSQL

import { NextRequest, NextResponse } from 'next/server';
import { PostgreSQLClient } from '@/lib/postgresql-client';

const pgClient = new PostgreSQLClient();

export async function POST(request: NextRequest) {
  try {
    const { jobId, linkType, targetId } = await request.json();

    console.log(\`🔗 [Link] Creando enlace: \${jobId} -> \${targetId}\`);

    if (!jobId || !linkType || !targetId) {
      return NextResponse.json(
        { error: 'jobId, linkType y targetId son requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el documento existe
    const docResult = await pgClient.query(
      'SELECT job_id FROM documents WHERE job_id = $1',
      [jobId]
    );

    if (docResult.error || !docResult.data || docResult.data.length === 0) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      );
    }

    // Actualizar enlace según el tipo
    let updateQuery = '';
    let params = [jobId, targetId];

    if (linkType === 'supplier') {
      updateQuery = \`
        UPDATE documents 
        SET supplier_id = $2, updated_at = NOW()
        WHERE job_id = $1
        RETURNING *
      \`;
    } else if (linkType === 'customer') {
      updateQuery = \`
        UPDATE documents 
        SET customer_id = $2, updated_at = NOW()
        WHERE job_id = $1
        RETURNING *
      \`;
    } else {
      return NextResponse.json(
        { error: 'Tipo de enlace no válido (supplier/customer)' },
        { status: 400 }
      );
    }

    const updateResult = await pgClient.query(updateQuery, params);

    if (updateResult.error) {
      return NextResponse.json(
        { error: 'Error actualizando enlace', details: updateResult.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: \`Enlace \${linkType} creado exitosamente\`,
      jobId: jobId,
      linkType: linkType,
      targetId: targetId
    });

  } catch (error) {
    console.error('❌ [Link] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}`,

  'setup-test-users': `// API para crear usuarios de prueba
// /app/api/setup-test-users/route.ts
// Versión 2.0.0 - Migrado a PostgreSQL

import { NextRequest, NextResponse } from 'next/server';
import { PostgreSQLClient } from '@/lib/postgresql-client';

const pgClient = new PostgreSQLClient();

export async function POST() {
  try {
    console.log('👥 [Setup Users] Creando usuarios de prueba...');

    const testUsers = [
      { username: 'admin', email: 'admin@gestagent.com', role: 'admin' },
      { username: 'contable', email: 'contable@gestagent.com', role: 'contable' },
      { username: 'gestor', email: 'gestor@gestagent.com', role: 'gestor' },
      { username: 'usuario', email: 'usuario@gestagent.com', role: 'user' }
    ];

    const results = [];

    for (const user of testUsers) {
      try {
        const result = await pgClient.query(\`
          INSERT INTO users (username, email, role)
          VALUES ($1, $2, $3)
          ON CONFLICT (email) DO UPDATE SET
            username = EXCLUDED.username,
            role = EXCLUDED.role,
            updated_at = NOW()
          RETURNING user_id, username, email, role
        \`, [user.username, user.email, user.role]);

        if (result.error) {
          results.push({
            user: user.username,
            success: false,
            error: result.error.message
          });
        } else {
          results.push({
            user: user.username,
            success: true,
            data: result.data?.[0]
          });
        }
      } catch (err) {
        results.push({
          user: user.username,
          success: false,
          error: err.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return NextResponse.json({
      success: successCount > 0,
      message: \`\${successCount}/\${testUsers.length} usuarios creados/actualizados\`,
      results: results
    });

  } catch (error) {
    console.error('❌ [Setup Users] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const result = await pgClient.query(\`
      SELECT user_id, username, email, role, created_at, updated_at
      FROM users
      ORDER BY created_at
    \`);

    if (result.error) {
      return NextResponse.json(
        { error: 'Error obteniendo usuarios', details: result.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      users: result.data || [],
      total: result.data?.length || 0
    });

  } catch (error) {
    console.error('❌ [Setup Users] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}`,

  'test-postgresql': `// API para probar conexión PostgreSQL
// /app/api/test-postgresql/route.ts
// Versión 2.0.0 - Migrado a PostgreSQL (reemplaza test-supabase)

import { NextRequest, NextResponse } from 'next/server';
import { PostgreSQLClient } from '@/lib/postgresql-client';

const pgClient = new PostgreSQLClient();

export async function GET() {
  try {
    console.log('🧪 [Test PostgreSQL] Probando conexión...');

    // Test básico de conexión
    const connectionTest = await pgClient.query('SELECT NOW() as current_time, version() as pg_version');
    
    if (connectionTest.error) {
      return NextResponse.json({
        success: false,
        test: 'connection',
        error: connectionTest.error.message,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    // Test de tablas
    const tablesTest = await pgClient.query(\`
      SELECT 
        t.table_name,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE t.table_schema = 'public'
      ORDER BY t.table_name
    \`);

    // Test de documentos
    const documentsTest = await pgClient.query(\`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing
      FROM documents
    \`);

    // Test de usuarios
    const usersTest = await pgClient.query('SELECT COUNT(*) as total FROM users');

    return NextResponse.json({
      success: true,
      tests: {
        connection: {
          success: true,
          time: connectionTest.data?.[0]?.current_time,
          version: connectionTest.data?.[0]?.pg_version
        },
        tables: {
          success: !tablesTest.error,
          count: tablesTest.data?.length || 0,
          tables: tablesTest.data || []
        },
        documents: {
          success: !documentsTest.error,
          stats: documentsTest.data?.[0] || { total: 0, completed: 0, processing: 0 }
        },
        users: {
          success: !usersTest.error,
          total: parseInt(usersTest.data?.[0]?.total || '0')
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Test PostgreSQL] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Error en test de PostgreSQL',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    const { testType } = await request.json();

    if (testType === 'full') {
      // Test completo con inserción de datos de prueba
      const testDoc = {
        job_id: \`test-\${Date.now()}\`,
        document_type: 'test',
        processed_json: { test: true },
        status: 'completed',
        title: 'Documento de prueba'
      };

      const insertResult = await pgClient.query(\`
        INSERT INTO documents (job_id, document_type, processed_json, status, title)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING job_id
      \`, [testDoc.job_id, testDoc.document_type, JSON.stringify(testDoc.processed_json), testDoc.status, testDoc.title]);

      if (insertResult.error) {
        return NextResponse.json({
          success: false,
          test: 'full_insert',
          error: insertResult.error.message
        }, { status: 500 });
      }

      // Eliminar documento de prueba
      await pgClient.query('DELETE FROM documents WHERE job_id = $1', [testDoc.job_id]);

      return NextResponse.json({
        success: true,
        test: 'full_insert_delete',
        message: 'Test completo exitoso'
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Tipo de test no válido'
    }, { status: 400 });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}`
};

function migrateAPI(apiPath, template) {
  try {
    const fullPath = path.join(process.cwd(), apiPath);
    
    // Crear directorio si no existe
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Escribir el nuevo archivo migrado
    fs.writeFileSync(fullPath, template);
    
    console.log(\`✅ [\${apiPath}] Migrado exitosamente\`);
    return { success: true, path: apiPath };
  } catch (error) {
    console.error(\`❌ [\${apiPath}] Error en migración:\`, error);
    return { success: false, path: apiPath, error: error.message };
  }
}

function main() {
  console.log('🚀 [Migration] Iniciando migración de APIs restantes...');
  
  const results = [];
  
  // Migrar export/sage
  results.push(migrateAPI(
    'app/api/documents/export/sage/route.ts',
    MIGRATION_TEMPLATES['export-sage']
  ));
  
  // Migrar link
  results.push(migrateAPI(
    'app/api/documents/link/route.ts',
    MIGRATION_TEMPLATES['link']
  ));
  
  // Migrar setup-test-users
  results.push(migrateAPI(
    'app/api/setup-test-users/route.ts',
    MIGRATION_TEMPLATES['setup-test-users']
  ));
  
  // Migrar test-supabase -> test-postgresql
  results.push(migrateAPI(
    'app/api/test-postgresql/route.ts',
    MIGRATION_TEMPLATES['test-postgresql']
  ));
  
  // Eliminar el archivo test-supabase
  try {
    const oldTestPath = path.join(process.cwd(), 'app/api/test-supabase/route.ts');
    if (fs.existsSync(oldTestPath)) {
      fs.unlinkSync(oldTestPath);
      console.log('🗑️ [test-supabase] Archivo eliminado (reemplazado por test-postgresql)');
    }
  } catch (error) {
    console.warn('⚠️ Error eliminando test-supabase:', error.message);
  }

  // Resumen
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(\`\n📊 [Migration] Resumen:\`);
  console.log(\`✅ Exitosas: \${successful}/\${total}\`);
  console.log(\`❌ Fallidas: \${total - successful}/\${total}\`);
  
  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    console.log(\`\${icon} \${result.path}\`);
    if (!result.success) {
      console.log(\`   Error: \${result.error}\`);
    }
  });
  
  if (successful === total) {
    console.log(\`\n🎉 [Migration] ¡Todas las APIs han sido migradas exitosamente!\`);
  } else {
    console.log(\`\n⚠️ [Migration] Migración completada con \${total - successful} errores\`);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = { migrateAPI, MIGRATION_TEMPLATES }; 