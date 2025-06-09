// API Route para actualizar datos de un documento específico
// /app/api/documents/update/[jobId]/route.ts
// Versión 2.0.0 - Migrado a PostgreSQL
// PUT: Actualiza los datos extraídos de un documento

import { NextRequest, NextResponse } from 'next/server';
import { PostgreSQLClient } from '@/lib/postgresql-client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AuditService } from '@/lib/services/audit.service';

export const dynamic = 'force-dynamic';

// Inicializar cliente PostgreSQL
const pgClient = new PostgreSQLClient();

// Interface para tipado del documento
interface DocumentData {
  job_id: string;
  document_type: string;
  status: string;
  upload_timestamp: string;
  processed_json?: any;
  document_date?: string;
  emitter_name?: string;
  receiver_name?: string;
  version?: string;
  user_id?: string;
}

// Función para convertir fecha DD/MM/YYYY a formato ISO YYYY-MM-DD
function convertToISODate(dateString: string | null | undefined): string | null {
  if (!dateString) return null;
  
  try {
    // Si ya está en formato ISO (YYYY-MM-DD), devolverlo tal como está
    if (/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
      return dateString.split('T')[0]; // Remover parte de tiempo si existe
    }
    
    // Si está en formato DD/MM/YYYY o DD/MM/YY
    const ddmmyyyy = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (ddmmyyyy) {
      const [, day, month, year] = ddmmyyyy;
      const fullYear = year.length === 2 ? `20${year}` : year;
      return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    return null;
  } catch (error) {
    console.warn('⚠️ [UPDATE] Error convirtiendo fecha:', dateString, error);
    return null;
  }
}

// Handler PUT - Actualizar datos de un documento
export async function PUT(
  request: NextRequest,
  context: { params: { jobId: string } }
) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { jobId } = context.params;
    const body = await request.json();
    const { extractedData, updateType = 'complete' } = body;

    console.log(`🔄 [UPDATE] Actualizando documento ${jobId} - Tipo: ${updateType}`);

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID es requerido' },
        { status: 400 }
      );
    }

    if (!extractedData) {
      return NextResponse.json(
        { error: 'Datos extraídos son requeridos' },
        { status: 400 }
      );
    }

    // 1. Verificar que el documento existe en PostgreSQL
    const fetchQuery = `
      SELECT * FROM documents 
      WHERE job_id = $1
    `;
    
    const fetchResult = await pgClient.query<DocumentData>(fetchQuery, [jobId]);

    if (fetchResult.error || !fetchResult.data || fetchResult.data.length === 0) {
      console.log(`❌ [UPDATE] Documento no encontrado en PostgreSQL: ${jobId}`);
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      );
    }

    const existingDocument = fetchResult.data[0];

    // 2. Extraer campos para actualización denormalizada
    let documentDate = null;
    let emitterName = null;
    let receiverName = null;

    if (Array.isArray(extractedData)) {
      const firstInvoice = extractedData[0];
      documentDate = convertToISODate(firstInvoice?.issue_date) || null;
      emitterName = firstInvoice?.emitter?.name || null;
      receiverName = firstInvoice?.receiver?.name || null;
    } else {
      documentDate = convertToISODate(extractedData?.issue_date) || null;
      emitterName = extractedData?.emitter?.name || null;
      receiverName = extractedData?.receiver?.name || null;
    }

    // 3. Actualizar documento en PostgreSQL
    const updateQuery = `
      UPDATE documents SET
        processed_json = $2,
        document_date = $3,
        emitter_name = $4,
        receiver_name = $5,
        status = 'validated',
        version = (COALESCE(CAST(version AS INTEGER), 1) + 1)::TEXT,
        upload_timestamp = NOW()
      WHERE job_id = $1
      RETURNING *
    `;

    const updateResult = await pgClient.query<DocumentData>(updateQuery, [
      jobId,
      JSON.stringify(extractedData),
      documentDate,
      emitterName,
      receiverName
    ]);

    if (updateResult.error || !updateResult.data || updateResult.data.length === 0) {
      console.error('❌ [UPDATE] Error actualizando PostgreSQL:', updateResult.error);
      return NextResponse.json(
        { 
          error: 'Error actualizando documento',
          details: updateResult.error?.message || 'Unknown error'
        },
        { status: 500 }
      );
    }

    const updatedDocument = updateResult.data[0];

    console.log(`✅ [UPDATE] Documento actualizado en PostgreSQL: ${jobId}`);

    // 4. Crear log de auditoría
    try {
      await AuditService.logDocumentUpdated(
        jobId,
        session.user?.id || 'unknown',
        {
          version: existingDocument.version,
          processed_json: existingDocument.processed_json,
          document_date: existingDocument.document_date,
          emitter_name: existingDocument.emitter_name,
          receiver_name: existingDocument.receiver_name
        },
        {
          updateType,
          version: updatedDocument.version,
          processed_json: updatedDocument.processed_json,
          document_date: updatedDocument.document_date,
          emitter_name: updatedDocument.emitter_name,
          receiver_name: updatedDocument.receiver_name
        }
      );
    } catch (auditError) {
      console.warn('⚠️ [UPDATE] Error creando audit log:', auditError);
      // No fallar si auditoría falla
    }

    return NextResponse.json({
      success: true,
      message: 'Documento actualizado correctamente',
      jobId: jobId,
      updateType: updateType,
      timestamp: new Date().toISOString(),
      document: {
        job_id: updatedDocument.job_id,
        document_type: updatedDocument.document_type,
        status: updatedDocument.status,
        version: updatedDocument.version,
        emitter_name: updatedDocument.emitter_name,
        receiver_name: updatedDocument.receiver_name,
        document_date: updatedDocument.document_date
      }
    }, { status: 200 });

  } catch (error) {
    console.error('❌ [UPDATE] Error en PUT /api/documents/update/[jobId]:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// Handler PATCH - Actualización parcial de campos específicos
export async function PATCH(
  request: NextRequest,
  context: { params: { jobId: string } }
) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { jobId } = context.params;
    const body = await request.json();
    const { field, value, updateType = 'partial' } = body;

    console.log(`🔄 [PATCH] Actualizando campo ${field} del documento ${jobId}`);

    if (!jobId || !field) {
      return NextResponse.json(
        { error: 'Job ID y campo son requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el documento existe
    const fetchQuery = `
      SELECT * FROM documents 
      WHERE job_id = $1
    `;
    
    const fetchResult = await pgClient.query<DocumentData>(fetchQuery, [jobId]);

    if (fetchResult.error || !fetchResult.data || fetchResult.data.length === 0) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      );
    }

    // Construir la consulta de actualización dinámicamente
    let updateQuery = '';
    let queryParams: any[] = [jobId];

    switch (field) {
      case 'status':
        updateQuery = `
          UPDATE documents SET
            status = $2,
            upload_timestamp = NOW()
          WHERE job_id = $1
          RETURNING *
        `;
        queryParams.push(value);
        break;
      
      case 'document_date':
        updateQuery = `
          UPDATE documents SET
            document_date = $2,
            upload_timestamp = NOW()
          WHERE job_id = $1
          RETURNING *
        `;
        queryParams.push(convertToISODate(value));
        break;
      
      case 'emitter_name':
      case 'receiver_name':
        updateQuery = `
          UPDATE documents SET
            ${field} = $2,
            upload_timestamp = NOW()
          WHERE job_id = $1
          RETURNING *
        `;
        queryParams.push(value);
        break;
      
      default:
        return NextResponse.json(
          { error: 'Campo no actualizable' },
          { status: 400 }
        );
    }

    const updateResult = await pgClient.query<DocumentData>(updateQuery, queryParams);

    if (updateResult.error || !updateResult.data || updateResult.data.length === 0) {
      return NextResponse.json(
        { 
          error: 'Error actualizando documento',
          details: updateResult.error?.message || 'Unknown error'
        },
        { status: 500 }
      );
    }

    const updatedDocument = updateResult.data[0];

    console.log(`✅ [PATCH] Campo ${field} actualizado en documento ${jobId}`);

    return NextResponse.json({
      success: true,
      message: `Campo ${field} actualizado correctamente`,
      jobId: jobId,
      field: field,
      value: value,
      updateType: updateType,
      timestamp: new Date().toISOString(),
      document: {
        job_id: updatedDocument.job_id,
        document_type: updatedDocument.document_type,
        status: updatedDocument.status,
        version: updatedDocument.version
      }
    }, { status: 200 });

  } catch (error) {
    console.error('❌ [PATCH] Error en PATCH /api/documents/update/[jobId]:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
} 