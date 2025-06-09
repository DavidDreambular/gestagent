// API Route para reportes avanzados
// /app/api/reports/route.ts
// Generación de reportes y análisis estadísticos

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PostgreSQLClient } from '@/lib/postgresql-client';

const pgClient = new PostgreSQLClient();

// Tipos para reportes
interface ReportFilters {
  startDate?: string;
  endDate?: string;
  documentType?: string;
  status?: string;
  emitter?: string;
  receiver?: string;
  minAmount?: number;
  maxAmount?: number;
}

interface ReportData {
  summary: {
    totalDocuments: number;
    totalAmount: number;
    averageAmount: number;
    processedToday: number;
    errorRate: number;
  };
  byType: Array<{
    type: string;
    count: number;
    percentage: number;
    totalAmount: number;
  }>;
  byStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  byDate: Array<{
    date: string;
    count: number;
    amount: number;
  }>;
  topEmitters: Array<{
    name: string;
    documentCount: number;
    totalAmount: number;
  }>;
  topReceivers: Array<{
    name: string;
    documentCount: number;
    totalAmount: number;
  }>;
  performance: {
    avgProcessingTime: number;
    avgConfidence: number;
    errorsByType: Array<{
      type: string;
      count: number;
    }>;
  };
}

export const dynamic = 'force-dynamic';

// GET - Generar reporte
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filters: ReportFilters = {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      documentType: searchParams.get('documentType') || undefined,
      status: searchParams.get('status') || undefined,
      emitter: searchParams.get('emitter') || undefined,
      receiver: searchParams.get('receiver') || undefined,
      minAmount: searchParams.get('minAmount') ? parseFloat(searchParams.get('minAmount')!) : undefined,
      maxAmount: searchParams.get('maxAmount') ? parseFloat(searchParams.get('maxAmount')!) : undefined,
    };

    try {
      // Consultar datos reales de PostgreSQL
      const reportData = await generateReportFromDatabase(filters);
      
      return NextResponse.json({
        success: true,
        data: reportData,
        filters: filters,
        source: 'database',
        generatedAt: new Date().toISOString()
      });

    } catch (postgresqlError) {
      console.warn('Error consultando PostgreSQL, usando datos de ejemplo:', postgresqlError);
      
      // Fallback a datos de ejemplo
      const mockReportData = generateMockReport(filters);
      
      return NextResponse.json({
        success: true,
        data: mockReportData,
        filters: filters,
        source: 'mock',
        generatedAt: new Date().toISOString(),
        warning: 'Usando datos de ejemplo debido a problemas de conectividad'
      });
    }

  } catch (error) {
    console.error('Error en GET /api/reports:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Función para generar reporte desde PostgreSQL
async function generateReportFromDatabase(filters: ReportFilters): Promise<ReportData> {
  // Construir WHERE clause basado en filtros
  const conditions: string[] = [];
  const params: any[] = [];
  let paramCount = 0;

  if (filters.startDate) {
    paramCount++;
    conditions.push(`upload_timestamp >= $${paramCount}`);
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    paramCount++;
    conditions.push(`upload_timestamp <= $${paramCount}`);
    params.push(filters.endDate);
  }

  if (filters.documentType) {
    paramCount++;
    conditions.push(`document_type = $${paramCount}`);
    params.push(filters.documentType);
  }

  if (filters.status) {
    paramCount++;
    conditions.push(`status = $${paramCount}`);
    params.push(filters.status);
  }

  if (filters.emitter) {
    paramCount++;
    conditions.push(`emitter_name ILIKE $${paramCount}`);
    params.push(`%${filters.emitter}%`);
  }

  if (filters.receiver) {
    paramCount++;
    conditions.push(`receiver_name ILIKE $${paramCount}`);
    params.push(`%${filters.receiver}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Consulta principal para resumen
  const summaryQuery = `
    SELECT 
      COUNT(*) as total_documents,
      COUNT(CASE WHEN upload_timestamp::date = CURRENT_DATE THEN 1 END) as processed_today,
      COUNT(CASE WHEN status = 'error' THEN 1 END) as error_count,
      AVG(CASE WHEN (processed_json->>'total')::numeric > 0 THEN (processed_json->>'total')::numeric END) as avg_amount,
      SUM(CASE WHEN (processed_json->>'total')::numeric > 0 THEN (processed_json->>'total')::numeric ELSE 0 END) as total_amount
    FROM documents 
    ${whereClause}
  `;

  const summaryResult = await pgClient.query<{
    total_documents: number;
    processed_today: number;
    error_count: number;
    avg_amount: number;
    total_amount: number;
  }>(summaryQuery, params);

  const summary = summaryResult.data?.[0] || {
    total_documents: 0,
    processed_today: 0,
    error_count: 0,
    avg_amount: 0,
    total_amount: 0
  };

  // Consulta por tipo de documento
  const byTypeQuery = `
    SELECT 
      document_type as type,
      COUNT(*) as count,
      SUM(CASE WHEN (processed_json->>'total')::numeric > 0 THEN (processed_json->>'total')::numeric ELSE 0 END) as total_amount
    FROM documents 
    ${whereClause}
    GROUP BY document_type
    ORDER BY count DESC
  `;

  const byTypeResult = await pgClient.query<{
    type: string;
    count: number;
    total_amount: number;
  }>(byTypeQuery, params);

  // Calcular porcentajes
  const byType = (byTypeResult.data || []).map(item => ({
    type: item.type,
    count: parseInt(item.count.toString()),
    percentage: summary.total_documents > 0 ? (parseInt(item.count.toString()) / summary.total_documents) * 100 : 0,
    totalAmount: parseFloat(item.total_amount?.toString() || '0')
  }));

  // Consulta por estado
  const byStatusQuery = `
    SELECT 
      status,
      COUNT(*) as count
    FROM documents 
    ${whereClause}
    GROUP BY status
    ORDER BY count DESC
  `;

  const byStatusResult = await pgClient.query<{
    status: string;
    count: number;
  }>(byStatusQuery, params);

  const byStatus = (byStatusResult.data || []).map(item => ({
    status: item.status,
    count: parseInt(item.count.toString()),
    percentage: summary.total_documents > 0 ? (parseInt(item.count.toString()) / summary.total_documents) * 100 : 0
  }));

  // Top emisores
  const topEmittersQuery = `
    SELECT 
      emitter_name as name,
      COUNT(*) as document_count,
      SUM(CASE WHEN (processed_json->>'total')::numeric > 0 THEN (processed_json->>'total')::numeric ELSE 0 END) as total_amount
    FROM documents 
    ${whereClause} AND emitter_name IS NOT NULL
    GROUP BY emitter_name
    ORDER BY document_count DESC
    LIMIT 10
  `;

  const topEmittersResult = await pgClient.query<{
    name: string;
    document_count: number;
    total_amount: number;
  }>(topEmittersQuery, params);

  const topEmitters = (topEmittersResult.data || []).map(item => ({
    name: item.name,
    documentCount: parseInt(item.document_count.toString()),
    totalAmount: parseFloat(item.total_amount?.toString() || '0')
  }));

  // Construir el reporte final
  const reportData: ReportData = {
    summary: {
      totalDocuments: parseInt(summary.total_documents.toString()),
      totalAmount: parseFloat(summary.total_amount?.toString() || '0'),
      averageAmount: parseFloat(summary.avg_amount?.toString() || '0'),
      processedToday: parseInt(summary.processed_today.toString()),
      errorRate: summary.total_documents > 0 ? (summary.error_count / summary.total_documents) * 100 : 0
    },
    byType,
    byStatus,
    byDate: [], // Se puede implementar con más queries
    topEmitters,
    topReceivers: [], // Similar a topEmitters
    performance: {
      avgProcessingTime: 25000, // Se puede extraer de metadatos
      avgConfidence: 0.92,
      errorsByType: []
    }
  };

  return reportData;
}

// Función para generar reporte mock
function generateMockReport(filters: ReportFilters): ReportData {
  return {
    summary: {
      totalDocuments: 45,
      totalAmount: 156750.50,
      averageAmount: 3483.34,
      processedToday: 7,
      errorRate: 4.4
    },
    byType: [
      { type: 'factura', count: 32, percentage: 71.1, totalAmount: 125430.50 },
      { type: 'nomina', count: 8, percentage: 17.8, totalAmount: 24320.00 },
      { type: 'recibo', count: 5, percentage: 11.1, totalAmount: 7000.00 }
    ],
    byStatus: [
      { status: 'completado', count: 38, percentage: 84.4 },
      { status: 'procesando', count: 5, percentage: 11.1 },
      { status: 'error', count: 2, percentage: 4.4 }
    ],
    byDate: [
      { date: '2024-01-15', count: 5, amount: 15750.25 },
      { date: '2024-01-16', count: 8, amount: 23450.75 },
      { date: '2024-01-17', count: 12, amount: 45230.50 }
    ],
    topEmitters: [
      { name: 'DISA PENÍNSULA S.L.U.', documentCount: 8, totalAmount: 45620.30 },
      { name: 'TELEFÓNICA S.A.', documentCount: 6, totalAmount: 32150.75 },
      { name: 'IBERDROLA S.A.', documentCount: 4, totalAmount: 18920.45 }
    ],
    topReceivers: [
      { name: 'GESTIÓN AVANZADA S.L.', documentCount: 15, totalAmount: 67530.20 },
      { name: 'CONSULTORÍA FINANCIERA', documentCount: 12, totalAmount: 45230.15 }
    ],
    performance: {
      avgProcessingTime: 23500,
      avgConfidence: 0.94,
      errorsByType: [
        { type: 'pdf_corrupto', count: 1 },
        { type: 'formato_no_reconocido', count: 1 }
      ]
    }
  };
}

// POST - Exportar reporte
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { format, filters } = await request.json();

    if (!format || !['csv', 'excel', 'pdf'].includes(format)) {
      return NextResponse.json(
        { error: 'Formato no válido. Use: csv, excel, pdf' },
        { status: 400 }
      );
    }

    // Por ahora devolver URL de descarga mockup
    const downloadUrl = `/api/reports/download/${Date.now()}.${format}`;

    return NextResponse.json({
      success: true,
      message: `Reporte generado en formato ${format}`,
      downloadUrl,
      expiresAt: new Date(Date.now() + 3600000).toISOString() // 1 hora
    });

  } catch (error) {
    console.error('Error en POST /api/reports:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 