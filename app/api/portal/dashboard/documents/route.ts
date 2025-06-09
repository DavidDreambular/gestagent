import { NextRequest, NextResponse } from 'next/server';
import { postgresqlClient } from '@/lib/postgresql-client';
import { getToken } from 'next-auth/jwt';

/**
 * GET /api/portal/dashboard/documents
 * Obtiene los documentos del proveedor para el dashboard
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const token = await getToken({ req: request });
    if (!token || token.role !== 'provider') {
      return NextResponse.json(
        { error: 'No autorizado - Solo para proveedores' },
        { status: 401 }
      );
    }

    const supplierId = token.supplier_id as string;
    if (!supplierId) {
      return NextResponse.json(
        { error: 'ID de proveedor no encontrado' },
        { status: 400 }
      );
    }

    // Parámetros de consulta
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');

    console.log('📄 [Portal Documents] Obteniendo documentos para proveedor:', supplierId);

    // Construir query para obtener documentos del proveedor
    let query = `
      SELECT 
        d.job_id,
        d.document_type,
        d.title,
        d.status,
        d.upload_timestamp,
        d.processed_json,
        d.emitter_name,
        d.document_date,
        CASE 
          WHEN d.processed_json->>'document_number' IS NOT NULL 
          THEN d.processed_json->>'document_number'
          ELSE 'N/A'
        END as document_number
      FROM documents d
      WHERE d.processed_json->>'supplier_id' = $1
    `;

    const params: any[] = [supplierId];
    let paramIndex = 2;

    // Filtrar por estado si se especifica
    if (status) {
      query += ` AND d.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY d.upload_timestamp DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    // Ejecutar consulta
    const result = await postgresqlClient.query(query, params);

    if (result.error) {
      console.error('❌ [Portal Documents] Error obteniendo documentos:', result.error);
      return NextResponse.json(
        { error: 'Error obteniendo documentos' },
        { status: 500 }
      );
    }

    // Obtener conteo total
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM documents d
      WHERE d.processed_json->>'supplier_id' = $1
      ${status ? 'AND d.status = $2' : ''}
    `;
    
    const countParams = status ? [supplierId, status] : [supplierId];
    const countResult = await postgresqlClient.query(countQuery, countParams);
    const total = parseInt(countResult.data?.[0]?.total || '0');

    console.log('✅ [Portal Documents] Documentos obtenidos:', result.data?.length || 0);

    return NextResponse.json({
      documents: result.data || [],
      total,
      limit,
      offset,
      hasMore: (offset + limit) < total
    });

  } catch (error) {
    console.error('❌ [Portal Documents] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 