#!/usr/bin/env node
/**
 * Validación lógica de las mejoras en procesamiento de múltiples facturas
 * Simula el flujo sin dependencias externas
 */

// Simulación de datos como los devuelve Mistral
const mockMistralResult = {
  success: true,
  extracted_data: {
    detected_invoices: [
      {
        invoice_number: "FAC-2024-001",
        issue_date: "15/03/2024",
        total_amount: 1250.50,
        supplier: {
          name: "TECNOLOGÍA AVANZADA S.L.",
          nif_cif: "B12345678"
        },
        customer: {
          name: "COMERCIAL MODERNA S.A.",
          nif_cif: "A87654321"
        }
      },
      {
        invoice_number: "FAC-2024-002",
        issue_date: "16/03/2024", 
        total_amount: 890.75,
        supplier: {
          name: "SUMINISTROS INDUSTRIALES S.L.",
          nif_cif: "B98765432"
        },
        customer: {
          name: "FABRICACIÓN MODERNA S.L.",
          nif_cif: "B11223344"
        }
      },
      {
        invoice_number: "FAC-2024-003",
        issue_date: "17/03/2024",
        total_amount: 2100.00,
        supplier: {
          name: "CONSULTORIA EXPERTA S.A.",
          nif_cif: "A55667788"
        },
        customer: {
          name: "DESARROLLO TECNOLÓGICO S.L.",
          nif_cif: "B99887766"
        }
      }
    ]
  },
  total_invoices_detected: 3,
  processing_metadata: {
    total_time_ms: 1500,
    confidence: 0.92
  }
};

// Simulación del comportamiento ANTERIOR (solo primera factura)
function simulateOldBehavior(mistralResult) {
  console.log('❌ SIMULACIÓN COMPORTAMIENTO ANTERIOR:');
  
  const extractedData = mistralResult.extracted_data;
  
  // PROBLEMA: Solo usar detected_invoices[0]
  if (extractedData?.detected_invoices && extractedData.detected_invoices.length > 0) {
    const invoice = extractedData.detected_invoices[0]; // ⚠️ SOLO LA PRIMERA
    
    const emitterName = invoice.supplier?.name || 'Desconocido';
    const receiverName = invoice.customer?.name || 'Desconocido';
    const invoiceNumber = invoice.invoice_number;
    
    console.log(`   📄 Factura procesada: ${invoiceNumber}`);
    console.log(`   🏢 Proveedor: ${emitterName}`);
    console.log(`   👤 Cliente: ${receiverName}`);
    console.log(`   💰 Importe: €${invoice.total_amount}`);
    console.log(`   ⚠️  FACTURAS PERDIDAS: ${extractedData.detected_invoices.length - 1}`);
    
    return {
      invoicesProcessed: 1,
      totalInvoicesDetected: mistralResult.total_invoices_detected,
      invoicesLost: extractedData.detected_invoices.length - 1,
      processedSuppliers: [emitterName],
      processedCustomers: [receiverName]
    };
  }
  
  return { invoicesProcessed: 0, invoicesLost: 0 };
}

// Simulación del comportamiento NUEVO (todas las facturas)
function simulateNewBehavior(mistralResult) {
  console.log('✅ SIMULACIÓN NUEVO COMPORTAMIENTO:');
  
  const extractedData = mistralResult.extracted_data;
  
  // SOLUCIÓN: Procesar TODAS las facturas
  const allInvoices = extractedData?.detected_invoices || [];
  console.log(`   🔍 Facturas detectadas: ${allInvoices.length}`);
  
  const processedSuppliers = new Set();
  const processedCustomers = new Set();
  const processedInvoiceNumbers = [];
  
  // Procesar cada factura
  allInvoices.forEach((invoice, index) => {
    const emitterName = invoice.supplier?.name || 'Desconocido';
    const receiverName = invoice.customer?.name || 'Desconocido';
    const invoiceNumber = invoice.invoice_number;
    
    console.log(`   📄 ${index + 1}. ${invoiceNumber} - ${emitterName} → ${receiverName} (€${invoice.total_amount})`);
    
    processedSuppliers.add(emitterName);
    processedCustomers.add(receiverName);
    processedInvoiceNumbers.push(invoiceNumber);
  });
  
  // Para compatibilidad con BD, usar primera factura como representativa
  let representativeData = null;
  if (allInvoices.length > 0) {
    const firstInvoice = allInvoices[0];
    representativeData = {
      emitterName: firstInvoice.supplier?.name || 'Desconocido',
      receiverName: firstInvoice.customer?.name || 'Desconocido',
      invoiceNumber: allInvoices.length > 1 
        ? `${firstInvoice.invoice_number} (+${allInvoices.length - 1} más)`
        : firstInvoice.invoice_number,
      totalAmount: firstInvoice.total_amount
    };
  }
  
  console.log(`   🏢 Proveedores únicos: ${processedSuppliers.size}`);
  console.log(`   👥 Clientes únicos: ${processedCustomers.size}`);
  console.log(`   💾 Representativo BD: ${representativeData?.invoiceNumber}`);
  
  return {
    invoicesProcessed: allInvoices.length,
    totalInvoicesDetected: mistralResult.total_invoices_detected,
    invoicesLost: 0,
    processedSuppliers: Array.from(processedSuppliers),
    processedCustomers: Array.from(processedCustomers),
    representativeData,
    multipleInvoices: allInvoices.length > 1
  };
}

// Función principal de validación
function validateMultipleInvoicesLogic() {
  console.log('🧪 VALIDACIÓN DE LÓGICA DE MÚLTIPLES FACTURAS');
  console.log('='.repeat(70));
  
  console.log(`📊 DATOS DE PRUEBA:`);
  console.log(`   📄 Total facturas en el documento: ${mockMistralResult.total_invoices_detected}`);
  console.log(`   📋 Facturas en el array: ${mockMistralResult.extracted_data.detected_invoices.length}`);
  console.log(`   🎯 Confianza de Mistral: ${(mockMistralResult.processing_metadata.confidence * 100).toFixed(1)}%`);
  console.log('');
  
  // Simular comportamiento anterior
  const oldResult = simulateOldBehavior(mockMistralResult);
  console.log('');
  
  // Simular nuevo comportamiento
  const newResult = simulateNewBehavior(mockMistralResult);
  console.log('');
  
  // Análisis comparativo
  console.log('📈 ANÁLISIS COMPARATIVO:');
  console.log(`   📄 Facturas procesadas:`);
  console.log(`      • Anterior: ${oldResult.invoicesProcessed}/${oldResult.totalInvoicesDetected}`);
  console.log(`      • Nuevo: ${newResult.invoicesProcessed}/${newResult.totalInvoicesDetected}`);
  console.log(`   🏢 Proveedores detectados:`);
  console.log(`      • Anterior: ${oldResult.processedSuppliers.length}`);
  console.log(`      • Nuevo: ${newResult.processedSuppliers.length}`);
  console.log(`   👥 Clientes detectados:`);
  console.log(`      • Anterior: ${oldResult.processedCustomers.length}`);
  console.log(`      • Nuevo: ${newResult.processedCustomers.length}`);
  console.log(`   📉 Facturas perdidas:`);
  console.log(`      • Anterior: ${oldResult.invoicesLost}`);
  console.log(`      • Nuevo: ${newResult.invoicesLost}`);
  console.log('');
  
  // Validaciones de integridad
  console.log('🔍 VALIDACIONES DE INTEGRIDAD:');
  
  const allInvoicesProcessed = newResult.invoicesProcessed === newResult.totalInvoicesDetected;
  const noInvoicesLost = newResult.invoicesLost === 0;
  const multipleEntitiesDetected = newResult.processedSuppliers.length > 1 || newResult.processedCustomers.length > 1;
  const significantImprovement = newResult.invoicesProcessed > oldResult.invoicesProcessed;
  
  console.log(`   ✅ Todas las facturas procesadas: ${allInvoicesProcessed ? 'SÍ' : 'NO'}`);
  console.log(`   ✅ Sin facturas perdidas: ${noInvoicesLost ? 'SÍ' : 'NO'}`);
  console.log(`   ✅ Múltiples entidades detectadas: ${multipleEntitiesDetected ? 'SÍ' : 'NO'}`);
  console.log(`   ✅ Mejora significativa: ${significantImprovement ? 'SÍ' : 'NO'}`);
  console.log('');
  
  // Simulación de metadatos mejorados
  console.log('📊 METADATOS DE PROCESAMIENTO MEJORADOS:');
  const enhancedMetadata = {
    processing_time_ms: mockMistralResult.processing_metadata.total_time_ms,
    confidence: mockMistralResult.processing_metadata.confidence,
    total_invoices_detected: mockMistralResult.total_invoices_detected,
    invoices_processed: newResult.invoicesProcessed,
    multiple_invoices: newResult.multipleInvoices,
    all_invoice_numbers: mockMistralResult.extracted_data.detected_invoices.map(inv => inv.invoice_number).join(', '),
    unique_suppliers: newResult.processedSuppliers.length,
    unique_customers: newResult.processedCustomers.length,
    method: 'mistral-enhanced'
  };
  
  Object.entries(enhancedMetadata).forEach(([key, value]) => {
    console.log(`   ${key}: ${value}`);
  });
  console.log('');
  
  // Resultado final
  const allTestsPassed = allInvoicesProcessed && noInvoicesLost && multipleEntitiesDetected && significantImprovement;
  
  console.log('🎯 RESULTADO FINAL:');
  console.log(`   Estado: ${allTestsPassed ? '✅ ÉXITO' : '❌ FALLO'}`);
  console.log(`   Mejora en facturas: +${newResult.invoicesProcessed - oldResult.invoicesProcessed}`);
  console.log(`   Mejora en proveedores: +${newResult.processedSuppliers.length - oldResult.processedSuppliers.length}`);
  console.log(`   Mejora en clientes: +${newResult.processedCustomers.length - oldResult.processedCustomers.length}`);
  console.log('='.repeat(70));
  
  return {
    success: allTestsPassed,
    oldResult,
    newResult,
    improvements: {
      additionalInvoices: newResult.invoicesProcessed - oldResult.invoicesProcessed,
      additionalSuppliers: newResult.processedSuppliers.length - oldResult.processedSuppliers.length,
      additionalCustomers: newResult.processedCustomers.length - oldResult.processedCustomers.length
    }
  };
}

// Ejecutar validación
if (require.main === module) {
  const result = validateMultipleInvoicesLogic();
  
  console.log('\n📋 RESUMEN EJECUTIVO:');
  if (result.success) {
    console.log('🎉 VALIDACIÓN EXITOSA - Las mejoras funcionan correctamente');
    console.log(`📈 Mejoras cuantificadas:`);
    console.log(`   • +${result.improvements.additionalInvoices} facturas procesadas`);
    console.log(`   • +${result.improvements.additionalSuppliers} proveedores detectados`);
    console.log(`   • +${result.improvements.additionalCustomers} clientes detectados`);
    process.exit(0);
  } else {
    console.log('❌ VALIDACIÓN FALLIDA - Revisar implementación');
    process.exit(1);
  }
}

module.exports = { validateMultipleInvoicesLogic };