// API Route para obtener resumen del dashboard
// /app/api/dashboard/summary/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || request.headers.get('user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Crear cliente de Supabase
    const supabase = createServerComponentClient({ cookies });

    // Obtener todos los documentos del usuario
    const { data: documents, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    // Calcular estadísticas
    const stats = {
      totalDocuments: documents?.length || 0,
      pendingDocuments: documents?.filter(d => 
        d.status === 'UPLOADED' || d.status === 'PROCESSING'
      ).length || 0,
      totalAmount: 0,
      totalTaxes: 0,
      documentsTrend: calculateTrend(documents || [], 'count'),
      pendingTrend: calculateTrend(documents || [], 'pending'),
      amountTrend: calculateTrend(documents || [], 'amount'),
      taxesTrend: calculateTrend(documents || [], 'taxes')
    };

    // Calcular montos totales
    documents?.forEach(doc => {
      if (doc.processed_json?.totals) {
        stats.totalAmount += doc.processed_json.totals.total || 0;
        stats.totalTaxes += doc.processed_json.totals.total_taxes || 0;
      }
    });

    // Agrupar por tipo de documento
    const typeMap = new Map<string, number>();
    documents?.forEach(doc => {
      const type = doc.document_type || 'otros';
      typeMap.set(type, (typeMap.get(type) || 0) + 1);
    });

    const documentTypes = Array.from(typeMap.entries()).map(([name, value]) => ({
      name: formatTypeName(name),
      value
    }));

    // Agrupar por estado
    const statusCounts = {
      PROCESSED: 0,
      PROCESSING: 0,
      ERROR: 0,
      UPLOADED: 0
    };

    documents?.forEach(doc => {
      if (statusCounts.hasOwnProperty(doc.status)) {
        statusCounts[doc.status as keyof typeof statusCounts]++;
      }
    });

    const documentStatus = [
      { name: 'Validados', value: statusCounts.PROCESSED },
      { name: 'Procesando', value: statusCounts.PROCESSING },
      { name: 'Con errores', value: statusCounts.ERROR },
      { name: 'Pendientes', value: statusCounts.UPLOADED }
    ];

    // Obtener documentos recientes
    const recentDocuments = (documents || [])
      .sort((a, b) => new Date(b.upload_timestamp).getTime() - new Date(a.upload_timestamp).getTime())
      .slice(0, 5)
      .map(doc => ({
        id: doc.job_id,
        title: doc.title || doc.file_name || `${doc.document_type} - ${doc.job_id.slice(0, 8)}`,
        type: doc.document_type,
        status: mapStatus(doc.status),
        date: doc.upload_timestamp,
        emitter: doc.emitter_name || doc.processed_json?.emitter?.name || 'Sin emisor',
        receiver: doc.receiver_name || doc.processed_json?.receiver?.name || 'Sin receptor',
        amount: doc.processed_json?.totals?.total || 0
      }));

    return NextResponse.json({
      stats,
      documentTypes,
      documentStatus,
      recentDocuments
    });

  } catch (error: any) {
    console.error('[Dashboard Summary] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener resumen del dashboard' },
      { status: 500 }
    );
  }
}

// Función auxiliar para calcular tendencias (simplificada)
function calculateTrend(documents: any[], metric: string): number {
  // Por ahora devolvemos valores aleatorios
  // En producción, esto debería comparar con el período anterior
  const trends = {
    count: 15,
    pending: -12,
    amount: 22,
    taxes: 18
  };
  return trends[metric as keyof typeof trends] || 0;
}

// Función para formatear nombres de tipos
function formatTypeName(type: string): string {
  const typeNames: Record<string, string> = {
    factura: 'Facturas',
    nomina: 'Nóminas',
    recibo: 'Recibos',
    extracto: 'Extractos',
    balance: 'Balances'
  };
  return typeNames[type] || 'Otros';
}

// Función para mapear estados
function mapStatus(status: string): string {
  const statusMap: Record<string, string> = {
    PROCESSED: 'validated',
    PROCESSING: 'processing',
    ERROR: 'error',
    UPLOADED: 'pending'
  };
  return statusMap[status] || status.toLowerCase();
}
