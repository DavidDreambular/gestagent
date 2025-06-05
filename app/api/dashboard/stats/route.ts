// API Route para estadísticas consolidadas del dashboard
// /app/api/dashboard/stats/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configurar Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    console.log('📊 [Dashboard Stats] Calculando estadísticas...');

    // Obtener documentos
    const { data: documents, error: documentsError } = await supabase
      .from('documents')
      .select('*');

    if (documentsError) {
      console.error('❌ Error obteniendo documentos:', documentsError);
    }

    // Obtener clientes
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('*');

    if (customersError) {
      console.error('❌ Error obteniendo clientes:', customersError);
    }

    // Obtener proveedores
    const { data: suppliers, error: suppliersError } = await supabase
      .from('suppliers')
      .select('*');

    if (suppliersError) {
      console.error('❌ Error obteniendo proveedores:', suppliersError);
    }

    // Calcular estadísticas de documentos
    const totalDocuments = documents?.length || 0;
    
    // Documentos procesados hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const processedToday = documents?.filter(doc => {
      const docDate = new Date(doc.upload_timestamp);
      docDate.setHours(0, 0, 0, 0);
      return docDate.getTime() === today.getTime();
    }).length || 0;

    // Estadísticas de clientes y proveedores
    const activeCustomers = customers?.filter(c => c.status === 'active').length || 0;
    const activeSuppliers = suppliers?.filter(s => s.status === 'active').length || 0;

    // Estadísticas adicionales
    const completedDocuments = documents?.filter(d => d.status === 'completed').length || 0;
    const processingDocuments = documents?.filter(d => d.status === 'processing').length || 0;
    const errorDocuments = documents?.filter(d => d.status === 'error').length || 0;

    // Documentos vinculados
    const linkedToSuppliers = documents?.filter(d => d.supplier_id).length || 0;
    const linkedToCustomers = documents?.filter(d => d.customer_id).length || 0;

    // Calcular facturación total (de documentos con datos procesados)
    let totalAmount = 0;
    documents?.forEach(doc => {
      if (doc.processed_json?.totals?.total) {
        totalAmount += parseFloat(doc.processed_json.totals.total) || 0;
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

    console.log('✅ [Dashboard Stats] Estadísticas calculadas:', stats);

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ [Dashboard Stats] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    }, { status: 500 });
  }
} 