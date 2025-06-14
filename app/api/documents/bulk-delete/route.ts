// API Route para borrado múltiple de documentos
// /app/api/documents/bulk-delete/route.ts

import { NextRequest, NextResponse } from 'next/server';
import pgClient from '@/lib/postgresql-client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import AuditService, { AuditAction, AuditEntityType } from '@/services/audit.service';
import { unlinkSync } from 'fs';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    console.log('🗑️ [API] Iniciando borrado múltiple de documentos...');

    // Verificar autenticación (opcional para desarrollo)
    let userId = '00000000-0000-0000-0000-000000000000';
    try {
      const session = await getServerSession(authOptions);
      userId = session?.user?.id || '00000000-0000-0000-0000-000000000000';
    } catch (authError) {
      console.warn('⚠️ [API] Sin autenticación, usando usuario de desarrollo');
    }

    // Parsear datos de la request
    const { document_ids, delete_files = false, hard_delete = false } = await request.json();

    // Validaciones
    if (!document_ids || !Array.isArray(document_ids) || document_ids.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Se requiere un array de document_ids válido',
        error_code: 'INVALID_DOCUMENT_IDS'
      }, { status: 400 });
    }

    if (document_ids.length > 100) {
      return NextResponse.json({
        success: false,
        error: 'Máximo 100 documentos por operación',
        error_code: 'TOO_MANY_DOCUMENTS'
      }, { status: 400 });
    }

    console.log(`📋 [API] Solicitado borrado de ${document_ids.length} documentos`);

    // Verificar que los documentos existen
    const { data: existingDocuments, error: checkError } = await pgClient.query(
      `SELECT job_id, document_type, emitter_name, receiver_name, file_path, status 
       FROM documents 
       WHERE job_id = ANY($1)`,
      [document_ids]
    );

    if (checkError) {
      console.error('❌ [API] Error verificando documentos:', checkError);
      return NextResponse.json({
        success: false,
        error: 'Error verificando documentos en base de datos',
        error_code: 'DATABASE_CHECK_ERROR'
      }, { status: 500 });
    }

    const foundDocuments = existingDocuments || [];
    const notFoundIds = document_ids.filter(id => !foundDocuments.find(d => d.job_id === id));

    if (notFoundIds.length > 0) {
      console.warn(`⚠️ [API] Documentos no encontrados: ${notFoundIds.join(', ')}`);
    }

    // Proceder con el borrado
    const results = {
      deleted: [] as any[],
      files_deleted: [] as any[],
      errors: [] as any[],
      warnings: [] as any[]
    };

    for (const document of foundDocuments) {
      try {
        // Eliminar archivo físico si se solicita
        if (delete_files && document.file_path) {
          try {
            const fullPath = join(process.cwd(), document.file_path);
            unlinkSync(fullPath);
            console.log(`🗂️ [API] Archivo eliminado: ${document.file_path}`);
            results.files_deleted.push({
              job_id: document.job_id,
              file_path: document.file_path
            });
          } catch (fileError) {
            console.warn(`⚠️ [API] Error eliminando archivo ${document.file_path}:`, fileError);
            results.warnings.push({
              job_id: document.job_id,
              warning: `No se pudo eliminar el archivo: ${document.file_path}`
            });
          }
        }

        let deleteQuery;
        let deleteParams;

        if (hard_delete) {
          // Borrado físico permanente
          deleteQuery = 'DELETE FROM documents WHERE job_id = $1';
          deleteParams = [document.job_id];
        } else {
          // Borrado lógico (marcar como eliminado)
          deleteQuery = `UPDATE documents 
                         SET status = 'deleted', 
                             updated_at = NOW(),
                             deleted_at = NOW()
                         WHERE job_id = $1`;
          deleteParams = [document.job_id];
        }

        const { error: deleteError } = await pgClient.query(deleteQuery, deleteParams);

        if (deleteError) {
          console.error(`❌ [API] Error eliminando documento ${document.job_id}:`, deleteError);
          results.errors.push({
            job_id: document.job_id,
            emitter_name: document.emitter_name,
            error: deleteError.message
          });
        } else {
          console.log(`✅ [API] Documento ${hard_delete ? 'eliminado permanentemente' : 'marcado como eliminado'}: ${document.job_id}`);
          results.deleted.push({
            job_id: document.job_id,
            document_type: document.document_type,
            emitter_name: document.emitter_name,
            receiver_name: document.receiver_name,
            delete_type: hard_delete ? 'permanent' : 'logical',
            file_deleted: delete_files && document.file_path ? true : false
          });

          // Auditoría
          await AuditService.logFromRequest(request, {
            userId,
            action: AuditAction.DELETE,
            entityType: AuditEntityType.DOCUMENTS,
            entityId: document.job_id,
            oldValues: {
              document_type: document.document_type,
              emitter_name: document.emitter_name,
              receiver_name: document.receiver_name,
              status: document.status
            },
            metadata: {
              operation: 'bulk_delete',
              delete_type: hard_delete ? 'permanent' : 'logical',
              file_deleted: delete_files,
              source: 'bulk_delete_api'
            }
          });
        }
      } catch (error) {
        console.error(`❌ [API] Error procesando documento ${document.job_id}:`, error);
        results.errors.push({
          job_id: document.job_id,
          emitter_name: document.emitter_name,
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }

    // Agregar warnings para IDs no encontrados
    notFoundIds.forEach(id => {
      results.warnings.push({
        job_id: id,
        warning: 'Documento no encontrado'
      });
    });

    const response = {
      success: true,
      message: `Operación completada: ${results.deleted.length} eliminados, ${results.errors.length} errores, ${results.warnings.length} advertencias`,
      results: {
        total_requested: document_ids.length,
        deleted_count: results.deleted.length,
        files_deleted_count: results.files_deleted.length,
        error_count: results.errors.length,
        warning_count: results.warnings.length,
        deleted_documents: results.deleted,
        files_deleted: results.files_deleted,
        errors: results.errors,
        warnings: results.warnings
      },
      operation_details: {
        hard_delete_used: hard_delete,
        delete_files_used: delete_files,
        timestamp: new Date().toISOString(),
        user_id: userId
      }
    };

    console.log(`✅ [API] Borrado múltiple completado: ${results.deleted.length}/${document_ids.length} eliminados`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [API] Error general en borrado múltiple de documentos:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      error_code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}