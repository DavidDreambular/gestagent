import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import pgClient from '@/lib/postgresql-client'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('portal-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Verificar y decodificar el token
    const decoded = jwt.verify(
      token,
      process.env.NEXTAUTH_SECRET || 'fallback-secret'
    ) as any

    if (!decoded || decoded.role !== 'provider') {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    const documentId = params.id
    const providerId = decoded.providerId

    if (!documentId) {
      return NextResponse.json(
        { error: 'ID de documento requerido' },
        { status: 400 }
      )
    }

    // Obtener información del proveedor
    const { data: providerData, error: providerError } = await pgClient.query(
      'SELECT name, nif FROM suppliers WHERE supplier_id = $1',
      [providerId]
    )

    if (providerError || !providerData || providerData.length === 0) {
      return NextResponse.json(
        { error: 'Proveedor no encontrado' },
        { status: 404 }
      )
    }

    const provider = providerData[0]

    // Obtener el documento específico
    const { data: documentData, error: documentError } = await pgClient.query(`
      SELECT 
        job_id,
        document_type,
        file_path,
        status,
        upload_timestamp,
        processed_json,
        processing_log
      FROM document_processing 
      WHERE job_id = $1
      AND (
        processed_json->>'supplier'->>'nif' = $2
        OR processed_json->>'supplier'->>'name' ILIKE $3
        OR processed_json->>'supplier'->>'id' = $4
      )
    `, [documentId, provider.nif, `%${provider.name}%`, providerId])

    if (documentError) {
      console.error('❌ [Portal Document Detail] Error consultando documento:', documentError)
      return NextResponse.json(
        { error: 'Error consultando documento' },
        { status: 500 }
      )
    }

    if (!documentData || documentData.length === 0) {
      return NextResponse.json(
        { error: 'Documento no encontrado o no tienes acceso a él' },
        { status: 404 }
      )
    }

    const document = documentData[0]

    // Registrar acceso al documento en audit logs
    try {
      await pgClient.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          decoded.userId,
          'VIEW',
          'document',
          documentId,
          JSON.stringify({
            document_type: document.document_type,
            status: document.status,
            viewed_by: 'portal_provider'
          })
        ]
      );
    } catch (auditError) {
      // Si no existe la tabla de auditoría, continuar sin error
      console.log('Audit log not available:', auditError);
    }

    return NextResponse.json({
      document: {
        job_id: document.job_id,
        document_type: document.document_type,
        file_path: document.file_path,
        status: document.status,
        upload_timestamp: document.upload_timestamp,
        processed_json: document.processed_json,
        processing_log: document.processing_log || []
      }
    })

  } catch (error) {
    console.error('❌ [Portal Document Detail] Error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('portal-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Verificar y decodificar el token
    const decoded = jwt.verify(
      token,
      process.env.NEXTAUTH_SECRET || 'fallback-secret'
    ) as any

    if (!decoded || decoded.role !== 'provider') {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    const documentId = params.id
    const providerId = decoded.providerId
    const { action } = await request.json()

    if (!documentId) {
      return NextResponse.json(
        { error: 'ID de documento requerido' },
        { status: 400 }
      )
    }

    // Verificar que el documento pertenece al proveedor
    const { data: documentData, error: documentError } = await pgClient.query(`
      SELECT job_id, status, processed_json
      FROM document_processing 
      WHERE job_id = $1
      AND (
        processed_json->>'supplier'->>'id' = $2
        OR processed_json->>'supplier'->>'nif' IN (
          SELECT nif FROM suppliers WHERE supplier_id = $2
        )
      )
    `, [documentId, providerId])

    if (documentError || !documentData || documentData.length === 0) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      )
    }

    const document = documentData[0]

    // Manejar diferentes acciones
    switch (action) {
      case 'retry_processing':
        if (document.status !== 'error') {
          return NextResponse.json(
            { error: 'Solo se pueden reintentar documentos con error' },
            { status: 400 }
          )
        }

        // Resetear estado a pending para reprocesamiento
        const { error: updateError } = await pgClient.query(
          'UPDATE document_processing SET status = $1, updated_at = NOW() WHERE job_id = $2',
          ['pending', documentId]
        )

        if (updateError) {
          console.error('❌ [Portal Document Action] Error actualizando estado:', updateError)
          return NextResponse.json(
            { error: 'Error reintentando procesamiento' },
            { status: 500 }
          )
        }

        // Crear notificación
        await pgClient.query(
          `INSERT INTO provider_notifications (
            provider_user_id, 
            title, 
            message, 
            type,
            created_at
          ) VALUES ($1, $2, $3, $4, NOW())`,
          [
            decoded.userId,
            'Procesamiento reintentado',
            `El documento ${documentId} ha sido enviado nuevamente para procesamiento.`,
            'info'
          ]
        )

        return NextResponse.json({
          success: true,
          message: 'Documento enviado para reprocesamiento'
        })

      default:
        return NextResponse.json(
          { error: 'Acción no válida' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('❌ [Portal Document Action] Error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}