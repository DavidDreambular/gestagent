// API Debug para diagnosticar problemas de documentos
// /app/api/documents/debug/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Configurar Supabase
let supabase: any = null;
try {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
} catch (error) {
  console.warn('⚠️ [DEBUG] Supabase no configurado');
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'full';

  try {
    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      action: action,
      environment: {
        supabase_configured: !!supabase,
        supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing',
        service_key: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'configured' : 'missing'
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

    // Verificar Supabase
    if (supabase) {
      try {
        // Contar documentos totales
        const { count: totalDocs, error: countError } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true });

        if (countError) {
          debugInfo.supabase_database = {
            error: 'Error contando documentos',
            details: countError
          };
        } else {
          debugInfo.supabase_database = {
            total_documents: totalDocs,
            connection_status: 'active'
          };

          // Obtener últimos 5 documentos
          const { data: recentDocs, error: docsError } = await supabase
            .from('documents')
            .select('job_id, document_type, status, user_id, upload_timestamp, document_date')
            .order('upload_timestamp', { ascending: false })
            .limit(5);

          if (docsError) {
            debugInfo.supabase_database.recent_documents_error = docsError;
          } else {
            debugInfo.supabase_database.recent_documents = recentDocs;
          }
        }
      } catch (supabaseError) {
        debugInfo.supabase_database = {
          error: 'Error conectando a Supabase',
          details: supabaseError
        };
      }
    } else {
      debugInfo.supabase_database = {
        status: 'not_configured',
        message: 'Supabase no está configurado'
      };
    }

    // Comparar discrepancias
    const mockCount = Object.keys(rawMockData).length;
    const supabaseCount = debugInfo.supabase_database?.total_documents || 0;

    debugInfo.comparison = {
      mock_count: mockCount,
      supabase_count: supabaseCount,
      discrepancy: mockCount - supabaseCount,
      sync_status: mockCount === supabaseCount ? 'synced' : 'out_of_sync'
    };

    // Análisis de problemas
    debugInfo.issues_detected = [];

    if (mockCount > 0 && supabaseCount === 0) {
      debugInfo.issues_detected.push({
        type: 'missing_supabase_data',
        description: 'Documentos en base temporal pero no en Supabase',
        severity: 'high',
        solution: 'Revisar errores de inserción en logs del servidor'
      });
    }

    if (mockCount === 0 && supabaseCount === 0) {
      debugInfo.issues_detected.push({
        type: 'no_documents',
        description: 'No hay documentos en ninguna base de datos',
        severity: 'medium',
        solution: 'Subir un documento de prueba'
      });
    }

    if (debugInfo.supabase_database?.error) {
      debugInfo.issues_detected.push({
        type: 'supabase_connection_error',
        description: 'Error conectando a Supabase',
        severity: 'high',
        solution: 'Verificar configuración de variables de entorno'
      });
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
      // Sincronizar documentos de mockDB a Supabase
      if (!supabase) {
        return NextResponse.json({
          error: 'Supabase no configurado',
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
          // Verificar si ya existe en Supabase
          const { data: existing } = await supabase
            .from('documents')
            .select('job_id')
            .eq('job_id', jobId)
            .single();

          if (!existing) {
            // Convertir fecha si es necesario
            let documentDate = null;
            if (Array.isArray((docData as any).extracted_data)) {
              documentDate = (docData as any).extracted_data[0]?.issue_date || null;
            } else {
              documentDate = (docData as any).extracted_data?.issue_date || null;
            }

            // Convertir formato de fecha DD/MM/YYYY a YYYY-MM-DD
            if (documentDate && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(documentDate)) {
              const [day, month, year] = documentDate.split('/');
              documentDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }

            // Crear registro en Supabase
            const { error: insertError } = await supabase
              .from('documents')
              .insert({
                job_id: jobId,
                document_type: (docData as any).documentType || 'factura',
                processed_json: (docData as any).extracted_data,
                upload_timestamp: (docData as any).uploadTimestamp || new Date().toISOString(),
                user_id: (docData as any).user_id || '00000000-0000-0000-0000-000000000000',
                status: 'completed',
                version: 5,
                title: `${(docData as any).documentType || 'factura'}_${jobId}`,
                file_path: (docData as any).document_url,
                document_date: documentDate,
                supplier_id: (docData as any).supplier_id,
                customer_id: (docData as any).customer_id
              });

            if (insertError) {
              results.push({
                job_id: jobId,
                status: 'error',
                error: insertError.message
              });
            } else {
              results.push({
                job_id: jobId,
                status: 'synced'
              });
            }
          } else {
            results.push({
              job_id: jobId,
              status: 'already_exists'
            });
          }
        } catch (error: any) {
          results.push({
            job_id: jobId,
            status: 'error',
            error: error.message
          });
        }
      }

      return NextResponse.json({
        action: 'fix_sync',
        results: results,
        synced_count: results.filter(r => r.status === 'synced').length,
        error_count: results.filter(r => r.status === 'error').length,
        already_exists_count: results.filter(r => r.status === 'already_exists').length,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({
      error: 'Acción no reconocida',
      timestamp: new Date().toISOString()
    }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({
      error: 'Error ejecutando acción',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 