// API Route para exportar documentos a formato Sage Excel
// /app/api/documents/export/sage/route.ts
// Versión 3.0.0 - Exportación Excel SAGE

import { NextRequest, NextResponse } from 'next/server';
import * as xlsx from 'xlsx';

interface SageExportRow {
  'Reg': number;
  'Serie': string;
  'Número factura': string;
  'Fecha factura': string;
  'NIF proveedor': string;
  'Nombre proveedor': string;
  'Concepto': string;
  'Total factura': string;
  'Base imponible': string;
  '%Iva1': string;
  'Importe impuesto': string;
  '%RecEq1': string;
  'Cuota Rec1': string;
  'Base Retención': string;
  '%Retención': string;
  'Cuota Retenc.': string;
  'Base Imponible2': string;
  '%Iva2': string;
  'Cuota Iva2': string;
  '%RecEq2': string;
  'Cuota Rec2': string;
  'Codigo Postal': string;
  'Cod. Provincia': string;
  'Provincia': string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 [SAGE EXPORT] Iniciando exportación Excel...');
    
    const body = await request.json();
    const { jobId, invoices } = body;

    if (!jobId || !invoices || !Array.isArray(invoices)) {
      return NextResponse.json(
        { error: 'JobId e invoices son requeridos' },
        { status: 400 }
      );
    }

    console.log(`📊 [SAGE EXPORT] Procesando ${invoices.length} facturas para jobId: ${jobId}`);

    // Mapear datos a formato SAGE
    const sageData: SageExportRow[] = [];
    let regCounter = 2400000 + Math.floor(Math.random() * 100000);

    for (const invoice of invoices) {
      const supplier = invoice.supplier || {};
      const totals = invoice.totals || {};
      const items = invoice.items || [];
      
      // Valores básicos con fallback
      const baseImponible = parseFloat(totals.subtotal || invoice.base_amount || '0');
      const totalFactura = parseFloat(totals.total || invoice.total_amount || '0');
      const totalTax = parseFloat(totals.total_tax_amount || invoice.tax_amount || '0');
      
      // Calcular IVA si es necesario
      let ivaPercentage = '21'; // Por defecto
      if (totalTax > 0 && baseImponible > 0) {
        ivaPercentage = Math.round((totalTax / baseImponible) * 100).toString();
      }
      
      // Crear fila SAGE
      const sageRow: SageExportRow = {
        'Reg': regCounter++,
        'Serie': '0',
        'Número factura': invoice.invoice_number || '',
        'Fecha factura': formatDateForSage(invoice.issue_date),
        'NIF proveedor': supplier.nif || supplier.nif_cif || '',
        'Nombre proveedor': (supplier.name || supplier.commercial_name || '').toUpperCase(),
        'Concepto': generateConcept(invoice, items),
        'Total factura': formatAmount(totalFactura),
        'Base imponible': formatAmount(baseImponible),
        '%Iva1': ivaPercentage,
        'Importe impuesto': formatAmount(totalTax),
        '%RecEq1': '',
        'Cuota Rec1': '',
        'Base Retención': '',
        '%Retención': '',
        'Cuota Retenc.': '',
        'Base Imponible2': '',
        '%Iva2': '',
        'Cuota Iva2': '',
        '%RecEq2': '',
        'Cuota Rec2': '',
        'Codigo Postal': extractPostalCode(supplier.address || ''),
        'Cod. Provincia': getProvinceCode(supplier.address || ''),
        'Provincia': extractProvince(supplier.address || '')
      };

      sageData.push(sageRow);
    }

    console.log(`✅ [SAGE EXPORT] Generados ${sageData.length} registros SAGE`);

    // Crear workbook de Excel
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(sageData);

    // Configurar anchos de columna
    worksheet['!cols'] = [
      { wch: 8 }, { wch: 6 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
      { wch: 25 }, { wch: 35 }, { wch: 12 }, { wch: 12 }, { wch: 8 },
      { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 10 },
      { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 8 },
      { wch: 10 }, { wch: 8 }, { wch: 5 }, { wch: 15 }
    ];

    xlsx.utils.book_append_sheet(workbook, worksheet, 'SAGE_Import');

    // Generar archivo Excel
    const excelBuffer = xlsx.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx' 
    });

    // Crear nombre de archivo
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const filename = `SAGE_Export_${jobId.slice(0, 8)}_${timestamp}.xlsx`;

    console.log(`📁 [SAGE EXPORT] Archivo generado: ${filename}`);

    // Devolver archivo
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': excelBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('❌ [SAGE EXPORT] Error:', error);
    return NextResponse.json(
      { error: 'Error generando exportación SAGE', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}

// Funciones auxiliares
function formatDateForSage(dateString: string): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  } catch {
    return dateString;
  }
}

function formatAmount(amount: number): string {
  return amount.toFixed(2).replace('.', ',');
}

function generateConcept(invoice: any, items: any[]): string {
  if (items.length > 0 && items[0].description) {
    return items[0].description.toUpperCase().substring(0, 100);
  }
  return `FACTURA ${invoice.invoice_number || ''}`.substring(0, 100);
}

function extractPostalCode(address: string): string {
  if (!address) return '';
  const match = address.match(/\b(\d{5})\b/);
  return match ? match[1] : '';
}

function extractProvince(address: string): string {
  if (!address) return '';
  
  const provinces = [
    'Barcelona', 'Madrid', 'Valencia', 'Sevilla', 'Zaragoza',
    'Málaga', 'Murcia', 'Palma', 'Bilbao', 'Alicante'
  ];
  
  const addressLower = address.toLowerCase();
  for (const province of provinces) {
    if (addressLower.includes(province.toLowerCase())) {
      return province;
    }
  }
  
  return '';
}

function getProvinceCode(address: string): string {
  const province = extractProvince(address);
  const codes: { [key: string]: string } = {
    'Barcelona': '08',
    'Madrid': '28',
    'Valencia': '46',
    'Sevilla': '41',
    'Zaragoza': '50',
    'Málaga': '29',
    'Murcia': '30',
    'Palma': '07',
    'Bilbao': '48',
    'Alicante': '03'
  };
  
  return codes[province] || '';
}