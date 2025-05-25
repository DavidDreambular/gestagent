// app/api/dashboard/summary/route.ts - API MOCK PARA DASHBOARD
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Datos mock para el dashboard - para testing
  const mockData = {
    stats: {
      totalDocuments: 247,
      pendingDocuments: 12,
      totalAmount: 156780.50,
      totalTaxes: 32923.51,
      documentsTrend: 18,
      pendingTrend: -7,
      amountTrend: 25,
      taxesTrend: 22
    },
    documentTypes: [
      { name: 'Facturas', value: 142 },
      { name: 'Nóminas', value: 67 },
      { name: 'Recibos', value: 28 },
      { name: 'Extractos', value: 10 }
    ],
    documentStatus: [
      { name: 'Validados', value: 228 },
      { name: 'Procesando', value: 7 },
      { name: 'Con errores', value: 5 },
      { name: 'Pendientes', value: 7 }
    ],
    recentDocuments: [
      {
        id: 'doc-001',
        title: 'Factura Energía Mayo 2025',
        type: 'factura',
        status: 'validated',
        date: '2025-05-20T14:30:00Z',
        emitter: 'Iberdrola España',
        receiver: 'Empresa Demo S.L.',
        amount: 345.67
      },
      {
        id: 'doc-002',
        title: 'Nómina Abril 2025 - Juan Pérez',
        type: 'nomina',
        status: 'validated',
        date: '2025-05-18T09:15:00Z',
        emitter: 'Empresa Demo S.L.',
        receiver: 'Juan Pérez García',
        amount: 2150.00
      },
      {
        id: 'doc-003',
        title: 'Factura Material Oficina',
        type: 'factura',
        status: 'processing',
        date: '2025-05-25T16:45:00Z',
        emitter: 'OfficeMax España',
        receiver: 'Empresa Demo S.L.',
        amount: 127.84
      },
      {
        id: 'doc-004',
        title: 'Recibo Seguridad Social',
        type: 'recibo',
        status: 'validated',
        date: '2025-05-22T11:20:00Z',
        emitter: 'Seguridad Social',
        receiver: 'Empresa Demo S.L.',
        amount: 890.33
      }
    ],
    recentActivity: [
      {
        id: 'act-001',
        action: 'document_upload',
        timestamp: '2025-05-25T16:45:00Z',
        username: 'admin',
        documentTitle: 'Factura Material Oficina',
        documentType: 'factura'
      },
      {
        id: 'act-002',
        action: 'document_processed',
        timestamp: '2025-05-22T11:30:00Z',
        username: 'Sistema IA',
        documentTitle: 'Recibo Seguridad Social',
        documentType: 'recibo'
      },
      {
        id: 'act-003',
        action: 'document_validated',
        timestamp: '2025-05-20T15:10:00Z',
        username: 'admin',
        documentTitle: 'Factura Energía Mayo 2025',
        documentType: 'factura'
      }
    ]
  };

  // Simular pequeño delay para realismo
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return NextResponse.json(mockData);
}