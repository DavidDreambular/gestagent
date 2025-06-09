// API Debug para diagnosticar problemas de documentos
// /app/api/documents/debug/route.ts
// Versión 2.0.0 - Migrado a PostgreSQL

import { NextRequest, NextResponse } from 'next/server';
import { PostgreSQLClient } from '@/lib/postgresql-client';
import fs from 'fs';
import path from 'path';

// Inicializar cliente PostgreSQL
let pgClient: PostgreSQLClient | null = null;
try {
  pgClient = new PostgreSQLClient();
} catch (error) {
  console.warn('⚠️ [DEBUG] PostgreSQL no configurado');
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'full';

  try {
    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      action: action,
      environment: {
        postgresql_configured: !!pgClient,
        postgres_host: process.env.POSTGRES_HOST || 'localhost',
        postgres_port: process.env.POSTGRES_PORT || '5433',
        postgres_db: process.env.POSTGRES_DB || 'gestagent'
      }
    };

    // Verificar base temporal (mockDB)
    const TEMP_DB_FILE = path.join(process.cwd(), 'temp-documents.json');
    let rawMockData: Record<string, any> = {};
    
    try {
      if (fs.existsSync(TEMP_DB_FILE)) {
        const data = fs.readFileSync(TEMP_DB_FILE, 'utf8');
        rawMockData = JSON.parse(data);
      }
    } catch (error) {
      console.warn('⚠️ [DEBUG] Error leyendo archivo temporal:', error);
    }

    debugInfo.mock_database = {
      total_documents: Object.keys(rawMockData).length,
      file_exists: fs.existsSync(TEMP_DB_FILE),
      file_path: TEMP_DB_FILE,
      documents: Object.keys(rawMockData).map(jobId => ({
        job_id: jobId,
        document_type: rawMockData[jobId]?.documentType || 'unknown',
        status: rawMockData[jobId]?.status || 'unknown',
        user_id: rawMockData[jobId]?.user_id,
        has_extracted_data: !!rawMockData[jobId]?.extracted_data,
        upload_timestamp: rawMockData[jobId]?.uploadTimestamp
      }))
    };

    // Verificar PostgreSQL
    if (pgClient) {
      try {
        // Contar documentos totales
        const countResult = await pgClient.query('SELECT COUNT(*) as count FROM documents');
        
        if (countResult.error) {
          debugInfo.postgresql_database = {
            error: 'Error contando documentos',
            details: countResult.error
          };
        } else {
          const totalDocs = parseInt(countResult.data?.[0]?.count || '0');
          debugInfo.postgresql_database = {
            total_documents: totalDocs,
            connection_status: 'active'
          };

          // Obtener últimos 5 documentos
          const recentDocsResult = await pgClient.query(`
            SELECT job_id, document_type, status, user_id, upload_timestamp, document_date
            FROM documents 
            ORDER BY upload_timestamp DESC 
            LIMIT 5
          `);

          if (recentDocsResult.error) {
            debugInfo.postgresql_database.recent_documents_error = recentDocsResult.error;
          } else {
            debugInfo.postgresql_database.recent_documents = recentDocsResult.data;
          }

          // Estadísticas adicionales
          const statsResult = await pgClient.query(`
            SELECT 
              COUNT(*) as total,
              COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
              COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
              COUNT(CASE WHEN status = 'error' THEN 1 END) as errors
            FROM documents
          `);

          if (statsResult.data && statsResult.data.length > 0) {
            debugInfo.postgresql_database.statistics = statsResult.data[0];
          }
        }
      } catch (postgresqlError) {
        debugInfo.postgresql_database = {
          error: 'Error conectando a PostgreSQL',
          details: postgresqlError
        };
      }
    } else {
      debugInfo.postgresql_database = {
        status: 'not_configured',
        message: 'PostgreSQL no está configurado'
      };
    }

    // Comparar discrepancias
    const mockCount = Object.keys(rawMockData).length;
    const postgresqlCount = debugInfo.postgresql_database?.total_documents || 0;

    debugInfo.comparison = {
      mock_count: mockCount,
      postgresql_count: postgresqlCount,
      discrepancy: mockCount - postgresqlCount,
      sync_status: mockCount === postgresqlCount ? 'synced' : 'out_of_sync'
    };

    // Análisis de problemas
    debugInfo.issues_detected = [];

    if (mockCount > 0 && postgresqlCount === 0) {
      debugInfo.issues_detected.push({
        type: 'missing_postgresql_data',
        description: 'Documentos en base temporal pero no en PostgreSQL',
        severity: 'high',
        solution: 'Revisar errores de inserción en logs del servidor'
      });
    }

    if (mockCount === 0 && postgresqlCount === 0) {
      debugInfo.issues_detected.push({
        type: 'no_documents',
        description: 'No hay documentos en ninguna base de datos',
        severity: 'medium',
        solution: 'Subir un documento de prueba'
      });
    }

    if (debugInfo.postgresql_database?.error) {
      debugInfo.issues_detected.push({
        type: 'postgresql_connection_error',
        description: 'Error conectando a PostgreSQL',
        severity: 'high',
        solution: 'Verificar configuración de PostgreSQL y variables de entorno'
      });
    }

    // Verificación de tablas
    if (pgClient) {
      try {
        const tablesResult = await pgClient.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          ORDER BY table_name
        `);

        debugInfo.postgresql_database.tables = tablesResult.data?.map(row => row.table_name) || [];
      } catch (error) {
        debugInfo.postgresql_database.table_check_error = error;
      }
    }

    return NextResponse.json(debugInfo, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({
      error: 'Error en diagnóstico',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === 'fix_sync') {
      // Sincronizar documentos de mockDB a PostgreSQL
      if (!pgClient) {
        return NextResponse.json({
          error: 'PostgreSQL no configurado',
          timestamp: new Date().toISOString()
        }, { status: 400 });
      }

      // Leer documentos del archivo temporal
      const TEMP_DB_FILE = path.join(process.cwd(), 'temp-documents.json');
      let mockDocs: Record<string, any> = {};
      
      try {
        if (fs.existsSync(TEMP_DB_FILE)) {
          const data = fs.readFileSync(TEMP_DB_FILE, 'utf8');
          mockDocs = JSON.parse(data);
        }
      } catch (error) {
        return NextResponse.json({
          error: 'Error leyendo base temporal',
          details: error instanceof Error ? error.message : 'Error desconocido',
          timestamp: new Date().toISOString()
        }, { status: 500 });
      }

      const results = [];

      for (const [jobId, docData] of Object.entries(mockDocs)) {
        try {
          // Verificar si ya existe en PostgreSQL
          const existingResult = await pgClient.query(
            'SELECT job_id FROM documents WHERE job_id = $1',
            [jobId]
          );

          if (existingResult.data && existingResult.data.length > 0) {
            results.push({
              job_id: jobId,
              action: 'skipped',
              reason: 'already_exists'
            });
            continue;
          }

          // Insertar documento en PostgreSQL
          const insertResult = await pgClient.query(`
            INSERT INTO documents (
              job_id, document_type, status, user_id, 
              upload_timestamp, processed_json, raw_json
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING job_id
          `, [
            jobId,
            docData.documentType || 'unknown',
            docData.status || 'processing',
            docData.user_id || 'system',
            docData.uploadTimestamp || new Date().toISOString(),
            JSON.stringify(docData.extracted_data || {}),
            JSON.stringify(docData.raw_data || {})
          ]);

          if (insertResult.error) {
            results.push({
              job_id: jobId,
              action: 'error',
              error: insertResult.error.message
            });
          } else {
            results.push({
              job_id: jobId,
              action: 'synced',
              message: 'Documento sincronizado exitosamente'
            });
          }

        } catch (error) {
          results.push({
            job_id: jobId,
            action: 'error',
            error: error instanceof Error ? error.message : 'Error desconocido'
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: `Sincronización completada`,
        results: results,
        summary: {
          total_processed: results.length,
          synced: results.filter(r => r.action === 'synced').length,
          skipped: results.filter(r => r.action === 'skipped').length,
          errors: results.filter(r => r.action === 'error').length
        },
        timestamp: new Date().toISOString()
      }, { status: 200 });

    } else if (action === 'cleanup_temp') {
      // Limpiar archivo temporal
      const TEMP_DB_FILE = path.join(process.cwd(), 'temp-documents.json');
      
      try {
        if (fs.existsSync(TEMP_DB_FILE)) {
          fs.unlinkSync(TEMP_DB_FILE);
          return NextResponse.json({
            success: true,
            message: 'Archivo temporal eliminado',
            timestamp: new Date().toISOString()
          }, { status: 200 });
        } else {
          return NextResponse.json({
            success: true,
            message: 'No había archivo temporal para eliminar',
            timestamp: new Date().toISOString()
          }, { status: 200 });
        }
      } catch (error) {
        return NextResponse.json({
          error: 'Error eliminando archivo temporal',
          details: error instanceof Error ? error.message : 'Error desconocido',
          timestamp: new Date().toISOString()
        }, { status: 500 });
      }

    } else {
      return NextResponse.json({
        error: 'Acción no soportada',
        supported_actions: ['fix_sync', 'cleanup_temp'],
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

  } catch (error: any) {
    return NextResponse.json({
      error: 'Error procesando acción',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 