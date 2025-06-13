import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import pgClient from '@/lib/postgresql-client'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'

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
 * GET /api/v1/documents
 * Obtener lista de documentos del proveedor
 * 
 * Query params:
 * - limit: número de documentos (default: 10, max: 100)
 * - offset: offset para paginación (default: 0)
 * - status: filtrar por estado (pending, processing, completed, error)
 * - start_date: fecha inicio (ISO string)
 * - end_date: fecha fin (ISO string)
 * 
 * Response:
 * {
 *   "success": true,
 *   "documents": [...],
 *   "pagination": {
 *     "total": 150,
 *     "limit": 10,
 *     "offset": 0,
 *     "hasMore": true
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const auth = await verifyApiAuth(request)
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error, code: 'UNAUTHORIZED' },
        { status: auth.status }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    const providerId = auth.user.providerId

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

    // Construir query dinámico
    let whereClause = `WHERE (processed_json->>'supplier'->>'nif' = $1 OR processed_json->>'supplier'->>'name' ILIKE $2)`
    const params = [provider.nif, `%${provider.name}%`]
    let paramIndex = 3

    if (status) {
      whereClause += ` AND status = $${paramIndex}`
      params.push(status)
      paramIndex++
    }

    if (startDate) {
      whereClause += ` AND upload_timestamp >= $${paramIndex}`
      params.push(startDate)
      paramIndex++
    }

    if (endDate) {
      whereClause += ` AND upload_timestamp <= $${paramIndex}`
      params.push(endDate)
      paramIndex++
    }

    // Obtener documentos
    const { data: documentsData, error: documentsError } = await pgClient.query(`
      SELECT 
        job_id,
        document_type,
        status,
        upload_timestamp,
        processed_json,
        processing_log,
        COALESCE(processed_json->>'title', 'Documento sin título') as title
      FROM document_processing 
      ${whereClause}
      ORDER BY upload_timestamp DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset])

    if (documentsError) {
      console.error('❌ [API v1 Documents] Error consultando documentos:', documentsError)
      return NextResponse.json(
        { success: false, error: 'Error consultando documentos', code: 'DATABASE_ERROR' },
        { status: 500 }
      )
    }

    // Obtener total de documentos para paginación
    const { data: countData, error: countError } = await pgClient.query(`
      SELECT COUNT(*) as total
      FROM document_processing 
      ${whereClause}
    `, params)

    const totalDocuments = countData?.[0]?.total || 0

    // Formatear respuesta
    const documents = (documentsData || []).map(doc => ({
      id: doc.job_id,
      type: doc.document_type,
      title: doc.title,
      status: doc.status,
      uploadedAt: doc.upload_timestamp,
      metadata: {
        documentNumber: doc.processed_json?.document_number,
        description: doc.processed_json?.description,
        fileName: doc.processed_json?.file_name,
        fileSize: doc.processed_json?.file_size
      },
      processingLog: doc.processing_log || []
    }))

    console.log(`✅ [API v1 Documents] Documentos obtenidos: ${documents.length} de ${totalDocuments}`)

    return NextResponse.json({
      success: true,
      documents,
      pagination: {
        total: parseInt(totalDocuments),
        limit,
        offset,
        hasMore: offset + limit < parseInt(totalDocuments)
      }
    })

  } catch (error) {
    console.error('❌ [API v1 Documents] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/v1/documents
 * Subir un nuevo documento
 * 
 * Content-Type: multipart/form-data
 * - file: archivo PDF
 * - document_type: tipo de documento
 * - document_number: número de documento
 * - description: descripción (opcional)
 * 
 * Response:
 * {
 *   "success": true,
 *   "document": {
 *     "id": "uuid",
 *     "type": "factura",
 *     "status": "pending",
 *     "uploadedAt": "2024-01-01T00:00:00Z"
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const auth = await verifyApiAuth(request)
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error, code: 'UNAUTHORIZED' },
        { status: auth.status }
      )
    }

    // Obtener datos del formulario
    const formData = await request.formData()
    const file = formData.get('file') as File
    const documentType = formData.get('document_type') as string
    const documentNumber = formData.get('document_number') as string
    const description = formData.get('description') as string || ''

    // Validaciones
    if (!file || !documentType || !documentNumber) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Archivo, tipo de documento y número son requeridos',
          code: 'MISSING_REQUIRED_FIELDS'
        },
        { status: 400 }
      )
    }

    // Validar archivo PDF
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Solo se permiten archivos PDF',
          code: 'INVALID_FILE_TYPE'
        },
        { status: 400 }
      )
    }

    // Validar tamaño (10MB máximo)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'El archivo no puede superar los 10MB',
          code: 'FILE_TOO_LARGE'
        },
        { status: 400 }
      )
    }

    // Obtener información del proveedor
    const { data: providerData, error: providerError } = await pgClient.query(
      'SELECT name, nif FROM suppliers WHERE supplier_id = $1',
      [auth.user.providerId]
    )

    if (providerError || !providerData || providerData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Proveedor no encontrado', code: 'PROVIDER_NOT_FOUND' },
        { status: 404 }
      )
    }

    const provider = providerData[0]

    // Generar ID único para el documento
    const jobId = uuidv4()
    
    // Convertir archivo a buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Crear directorio de uploads si no existe
    const uploadsDir = path.join(process.cwd(), 'uploads')
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }

    // Guardar archivo
    const fileName = `${Date.now()}_${file.name}`
    const filePath = path.join(uploadsDir, fileName)
    fs.writeFileSync(filePath, buffer)

    // Preparar datos para inserción
    const documentData = {
      document_number: documentNumber,
      document_type: documentType,
      description: description,
      supplier: {
        id: auth.user.providerId,
        name: provider.name,
        nif: provider.nif
      },
      uploaded_by: 'api_integration',
      file_size: file.size,
      file_name: file.name,
      uploaded_at: new Date().toISOString(),
      api_upload: true,
      user_agent: request.headers.get('user-agent') || 'API Client'
    }

    // Insertar documento en la base de datos
    const { data: result, error: insertError } = await pgClient.query(`
      INSERT INTO document_processing (
        job_id,
        document_type,
        file_path,
        processed_json,
        upload_timestamp,
        status
      ) VALUES (
        $1, $2, $3, $4, NOW(), $5
      ) RETURNING *
    `, [
      jobId,
      documentType,
      filePath,
      JSON.stringify(documentData),
      'pending'
    ])

    if (insertError) {
      console.error('❌ [API v1 Documents] Error insertando documento:', insertError)
      return NextResponse.json(
        { success: false, error: 'Error guardando documento', code: 'DATABASE_ERROR' },
        { status: 500 }
      )
    }

    const document = result[0]

    // Registrar en audit logs
    try {
      await pgClient.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          auth.user.userId,
          'CREATE',
          'document',
          jobId,
          JSON.stringify({
            document_type: documentType,
            document_number: documentNumber,
            supplier_name: provider.name,
            source: 'api_integration'
          })
        ]
      )
    } catch (auditError) {
      console.log('Audit log not available:', auditError)
    }

    // Enviar notificación
    try {
      const { notificationService } = await import('@/lib/services/notification-service')
      
      await notificationService.notifyDocumentUploaded({
        userId: auth.user.userId,
        documentId: jobId,
        documentType: documentType,
        documentNumber: documentNumber,
        uploadTimestamp: new Date().toISOString()
      })
    } catch (notificationError) {
      console.error('Error enviando notificación:', notificationError)
    }

    console.log('✅ [API v1 Documents] Documento subido exitosamente:', jobId)

    return NextResponse.json({
      success: true,
      document: {
        id: jobId,
        type: documentType,
        title: `${documentType} - ${documentNumber}`,
        status: 'pending',
        uploadedAt: document.upload_timestamp,
        metadata: {
          documentNumber: documentNumber,
          description: description,
          fileName: file.name,
          fileSize: file.size
        }
      },
      message: 'Documento subido exitosamente y en cola de procesamiento'
    }, { status: 201 })

  } catch (error) {
    console.error('❌ [API v1 Documents] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}