import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import pgClient from '@/lib/postgresql-client'

export async function GET(request: NextRequest) {
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

    const providerId = decoded.providerId
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') || '10'
    const offset = searchParams.get('offset') || '0'

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

    // Obtener documentos del proveedor
    const { data: documentsData, error: documentsError } = await pgClient.query(`
      SELECT 
        job_id,
        document_type,
        file_path,
        status,
        upload_timestamp,
        processed_json,
        COALESCE(processed_json->>'title', 'Documento sin título') as title
      FROM document_processing 
      WHERE (processed_json->>'supplier'->>'nif' = $1
             OR processed_json->>'supplier'->>'name' ILIKE $2)
      ORDER BY upload_timestamp DESC
      LIMIT $3 OFFSET $4
    `, [provider.nif, `%${provider.name}%`, limit, offset])

    if (documentsError) {
      console.error('❌ [Portal Documents] Error consultando documentos:', documentsError)
      return NextResponse.json(
        { error: 'Error consultando documentos' },
        { status: 500 }
      )
    }

    // Obtener total de documentos para paginación
    const { data: countData, error: countError } = await pgClient.query(`
      SELECT COUNT(*) as total
      FROM document_processing 
      WHERE (processed_json->>'supplier'->>'nif' = $1
             OR processed_json->>'supplier'->>'name' ILIKE $2)
    `, [provider.nif, `%${provider.name}%`])

    const totalDocuments = countData?.[0]?.total || 0

    return NextResponse.json({
      documents: documentsData || [],
      pagination: {
        total: parseInt(totalDocuments),
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < parseInt(totalDocuments)
      }
    })

  } catch (error) {
    console.error('❌ [Portal Documents] Error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}