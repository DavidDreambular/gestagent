// API Route para estadísticas consolidadas del dashboard - MIGRADO A POSTGRESQL
// /app/api/dashboard/stats/route.ts

import { NextRequest, NextResponse } from 'next/server';
import pgClient from '@/lib/postgresql-client';

// Datos mock para fallback en caso de error
const mockStats = {
  totalDocuments: 156,
  processedToday: 23,
  activeSuppliers: 45,
  activeCustomers: 67,
  completedDocuments: 142,
  processingDocuments: 8,
  errorDocuments: 6,
  linkedToSuppliers: 120,
  linkedToCustomers: 98,
  totalAmount: "245678.90",
  successRate: "91.0"
};

export async function GET(request: NextRequest) {
  try {
    console.log('📊 [Dashboard Stats] Calculando estadísticas con PostgreSQL...');

    // Obtener todas las estadísticas en una sola transacción para mejor performance
    try {
      const statsData = await pgClient.getDashboardStats();
      
      if (statsData.error) {
        console.error('❌ [Dashboard Stats] Error obteniendo estadísticas:', statsData.error);
        throw new Error(statsData.error.message);
      }

      console.log('✅ [Dashboard Stats] Estadísticas calculadas desde PostgreSQL:', statsData.data);

      return NextResponse.json({
        success: true,
        data: statsData.data,
        source: 'postgresql_real_data',
        timestamp: new Date().toISOString()
      });

    } catch (dbError) {
      console.error('❌ [Dashboard Stats] Error de PostgreSQL:', dbError);
      
      // Intentar cálculo manual como fallback
      console.log('🔄 [Dashboard Stats] Intentando cálculo manual...');
      
      const manualStats = await calculateStatsManually();
      
      if (manualStats.success) {
        return NextResponse.json({
          success: true,
          data: manualStats.data,
          source: 'postgresql_manual_calculation'
        });
      }
      
      // Si todo falla, usar datos mock
      console.warn('⚠️ [Dashboard Stats] Usando datos mock como último recurso');
      return NextResponse.json({
        success: true,
        data: mockStats,
        source: 'mock_data_fallback',
        message: 'Datos de desarrollo (error de conexión a PostgreSQL)'
      });
    }

  } catch (error) {
    console.error('❌ [Dashboard Stats] Error general:', error);
    
    return NextResponse.json({
      success: true,
      data: mockStats,
      source: 'mock_data_error_fallback',
      message: 'Datos de desarrollo (error general)',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}

// Función para cálculo manual de estadísticas
async function calculateStatsManually() {
  try {
    console.log('🔢 [Dashboard Stats] Calculando estadísticas manualmente...');

    // Obtener conteos básicos
    const { data: documents, error: docsError } = await pgClient.getDocuments({ limit: 1000 });
    const { data: customers, error: custsError } = await pgClient.getCustomers({ status: 'active' });
    const { data: suppliers, error: suppsError } = await pgClient.getSuppliers({ status: 'active' });

    if (docsError || custsError || suppsError) {
      console.error('❌ Error en consultas manuales:', { docsError, custsError, suppsError });
      return { success: false };
    }

    // Calcular estadísticas
    const totalDocuments = documents?.length || 0;
    
    // Documentos procesados hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const processedToday = (documents || []).filter((doc: any) => {
      const docDate = new Date(doc.upload_timestamp);
      docDate.setHours(0, 0, 0, 0);
      return docDate.getTime() === today.getTime();
    }).length;

    // Estadísticas de clientes y proveedores
    const activeCustomers = customers?.length || 0;
    const activeSuppliers = suppliers?.length || 0;

    // Estadísticas de documentos por estado
    const completedDocuments = (documents || []).filter((d: any) => 
      d.status === 'completed' || d.status === 'processed'
    ).length;
    const processingDocuments = (documents || []).filter((d: any) => 
      d.status === 'processing'
    ).length;
    const errorDocuments = (documents || []).filter((d: any) => 
      d.status === 'error'
    ).length;

    // Documentos vinculados (usar campos existentes en el esquema)
    const linkedToSuppliers = (documents || []).filter((d: any) => d.emitter_name).length;
    const linkedToCustomers = (documents || []).filter((d: any) => d.receiver_name).length;

    // Calcular facturación total
    let totalAmount = 0;
    (documents || []).forEach((doc: any) => {
      try {
        if (doc.processed_json?.totals?.total) {
          const amount = parseFloat(doc.processed_json.totals.total.toString().replace(/[^0-9.-]/g, ''));
          if (!isNaN(amount)) {
            totalAmount += amount;
          }
        }
      } catch (amountError) {
        // Ignorar errores de parsing individual
      }
    });

    const stats = {
      totalDocuments,
      processedToday,
      activeSuppliers,
      activeCustomers,
      completedDocuments,
      processingDocuments,
      errorDocuments,
      linkedToSuppliers,
      linkedToCustomers,
      totalAmount: totalAmount.toFixed(2),
      successRate: totalDocuments > 0 ? ((completedDocuments / totalDocuments) * 100).toFixed(1) : '0'
    };

    console.log('✅ [Dashboard Stats] Estadísticas manuales calculadas:', stats);

    return { success: true, data: stats };

  } catch (error) {
    console.error('❌ [Dashboard Stats] Error en cálculo manual:', error);
    return { success: false };
  }
} 