import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import pgClient from '@/lib/postgresql-client'

// Middleware para verificar autenticación API
async function verifyApiAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Token de autorización requerido', status: 401 }
  }

  const token = authHeader.substring(7)

  try {
    const decoded = jwt.verify(
      token,
      process.env.NEXTAUTH_SECRET || 'fallback-secret'
    ) as any

    if (!decoded || decoded.role !== 'provider_api') {
      return { error: 'Token inválido', status: 401 }
    }

    return { success: true, user: decoded }
  } catch (error) {
    return { error: 'Token inválido o expirado', status: 401 }
  }
}

/**
 * GET /api/v1/documents/[id]
 * Obtener detalles de un documento específico
 * 
 * Response:
 * {
 *   "success": true,
 *   "document": {
 *     "id": "uuid",
 *     "type": "factura",
 *     "title": "Factura - FAC-001",
 *     "status": "completed",
 *     "uploadedAt": "2024-01-01T00:00:00Z",
 *     "metadata": {...},
 *     "processingLog": [...],
 *     "extractedData": {...}
 *   }
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación
    const auth = await verifyApiAuth(request)
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error, code: 'UNAUTHORIZED' },
        { status: auth.status }
      )
    }

    const documentId = params.id
    const providerId = auth.user.providerId

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: 'ID de documento requerido', code: 'MISSING_DOCUMENT_ID' },
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
        { success: false, error: 'Proveedor no encontrado', code: 'PROVIDER_NOT_FOUND' },
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
        processing_log,
        raw_text
      FROM document_processing 
      WHERE job_id = $1
      AND (
        processed_json->>'supplier'->>'nif' = $2
        OR processed_json->>'supplier'->>'name' ILIKE $3
        OR processed_json->>'supplier'->>'id' = $4
      )
    `, [documentId, provider.nif, `%${provider.name}%`, providerId])

    if (documentError) {
      console.error('❌ [API v1 Document Detail] Error consultando documento:', documentError)
      return NextResponse.json(
        { success: false, error: 'Error consultando documento', code: 'DATABASE_ERROR' },
        { status: 500 }
      )
    }

    if (!documentData || documentData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Documento no encontrado', code: 'DOCUMENT_NOT_FOUND' },
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
          auth.user.userId,
          'VIEW',
          'document',
          documentId,
          JSON.stringify({
            document_type: document.document_type,
            status: document.status,
            viewed_by: 'api_integration'
          })
        ]
      )
    } catch (auditError) {
      console.log('Audit log not available:', auditError)
    }

    // Formatear respuesta
    const response = {
      id: document.job_id,
      type: document.document_type,
      title: document.processed_json?.title || `${document.document_type} - ${document.processed_json?.document_number || 'Sin número'}`,
      status: document.status,
      uploadedAt: document.upload_timestamp,
      metadata: {
        documentNumber: document.processed_json?.document_number,
        description: document.processed_json?.description,
        fileName: document.processed_json?.file_name,
        fileSize: document.processed_json?.file_size,
        uploadedBy: document.processed_json?.uploaded_by
      },
      processingLog: document.processing_log || [],
      extractedData: null,
      rawText: null
    }

    // Incluir datos extraídos solo si el documento está completado
    if (document.status === 'completed' || document.status === 'processed') {
      // Filtrar datos sensibles y estructurar la respuesta
      const extractedData = document.processed_json || {}
      
      response.extractedData = {
        supplier: extractedData.supplier || null,
        documentInfo: {
          number: extractedData.document_number,
          type: extractedData.document_type,
          description: extractedData.description
        },
        // Agregar más campos extraídos según sea necesario
        // amounts: extractedData.amounts,
        // dates: extractedData.dates,
        // etc.
      }

      // Incluir texto extraído si está disponible (opcional)
      if (document.raw_text && document.raw_text.length > 0) {
        response.rawText = document.raw_text.substring(0, 5000) // Limitar a 5KB
      }
    }

    console.log(`✅ [API v1 Document Detail] Documento obtenido: ${documentId}`)

    return NextResponse.json({
      success: true,
      document: response
    })

  } catch (error) {
    console.error('❌ [API v1 Document Detail] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/v1/documents/[id]
 * Actualizar metadatos de un documento
 * 
 * Body:
 * {
 *   "description": "Nueva descripción",
 *   "metadata": {...}
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "document": {...}
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación
    const auth = await verifyApiAuth(request)
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error, code: 'UNAUTHORIZED' },
        { status: auth.status }
      )
    }

    const documentId = params.id
    const providerId = auth.user.providerId
    const { description, metadata } = await request.json()

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: 'ID de documento requerido', code: 'MISSING_DOCUMENT_ID' },
        { status: 400 }
      )
    }

    // Verificar que el documento pertenece al proveedor
    const { data: documentData, error: documentError } = await pgClient.query(`
      SELECT job_id, processed_json
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
        { success: false, error: 'Documento no encontrado', code: 'DOCUMENT_NOT_FOUND' },
        { status: 404 }
      )
    }

    const document = documentData[0]
    let updatedJson = { ...document.processed_json }

    // Actualizar campos permitidos
    if (description !== undefined) {
      updatedJson.description = description
    }

    if (metadata && typeof metadata === 'object') {
      updatedJson.api_metadata = {
        ...updatedJson.api_metadata,
        ...metadata,
        updated_at: new Date().toISOString(),
        updated_by: 'api_integration'
      }
    }

    // Guardar cambios en la base de datos
    const { error: updateError } = await pgClient.query(
      'UPDATE document_processing SET processed_json = $1, updated_at = NOW() WHERE job_id = $2',
      [JSON.stringify(updatedJson), documentId]
    )

    if (updateError) {
      console.error('❌ [API v1 Document Update] Error actualizando documento:', updateError)
      return NextResponse.json(
        { success: false, error: 'Error actualizando documento', code: 'DATABASE_ERROR' },
        { status: 500 }
      )
    }

    // Registrar en audit logs
    try {
      await pgClient.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          auth.user.userId,
          'UPDATE',
          'document',
          documentId,
          JSON.stringify({
            description: description,
            metadata: metadata,
            updated_by: 'api_integration'
          })
        ]
      )
    } catch (auditError) {
      console.log('Audit log not available:', auditError)
    }

    console.log(`✅ [API v1 Document Update] Documento actualizado: ${documentId}`)

    return NextResponse.json({
      success: true,
      message: 'Documento actualizado correctamente',
      document: {
        id: documentId,
        description: updatedJson.description,
        metadata: updatedJson.api_metadata
      }
    })

  } catch (error) {
    console.error('❌ [API v1 Document Update] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}