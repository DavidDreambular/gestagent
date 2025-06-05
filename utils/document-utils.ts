// Utilidades para extraer datos de documentos
// utils/document-utils.ts

export const getDocumentFieldValue = (doc: any, field: string): string => {
  // Usar columnas denormalizadas primero, luego fallback a JSON
  const data = doc.processed_json || doc.processedJson || {};
  
  switch (field) {
    case 'number':
      return doc.document_number || data.document_info?.number || data.numero || '-';
    case 'date':
      return doc.document_date || data.document_info?.date || data.fecha || '-';
    case 'emitter_name':
      return doc.emitter_name || data.emitter?.name || data.emisor?.nombre || data.emisor?.name || '-';
    case 'receiver_name':
      return doc.receiver_name || data.receiver?.name || data.receptor?.nombre || data.receptor?.name || '-';
    case 'emitter_tax_id':
      return doc.emitter_cif || data.emitter?.tax_id || data.emisor?.cif || data.emisor?.tax_id || '-';
    case 'receiver_tax_id':
      return doc.receiver_cif || data.receiver?.tax_id || data.receptor?.cif || data.receptor?.tax_id || '-';
    case 'emitter_city':
      return data.emitter?.city || data.emisor?.ciudad || data.emisor?.city || '-';
    case 'receiver_city':
      return data.receiver?.city || data.receptor?.ciudad || data.receptor?.city || '-';
    case 'payment_method':
      return data.payment?.method || data.forma_pago || data.payment_method || '-';
    case 'due_date':
      return doc.due_date || data.document_info?.due_date || data.fecha_vencimiento || '-';
    default:
      return '-';
  }
};

export const getDocumentAmountValue = (doc: any, field: string): number => {
  // Usar columnas denormalizadas primero, luego fallback a JSON
  const data = doc.processed_json || doc.processedJson || {};
  
  switch (field) {
    case 'total':
      return parseFloat(doc.total_amount || data.totals?.total || data.total || 0);
    case 'subtotal':
      return parseFloat(doc.subtotal || data.totals?.subtotal || data.base_imponible || data.subtotal || 0);
    case 'tax_total':
      return parseFloat(doc.tax_amount || data.totals?.tax_total || data.importe_iva || data.tax_total || 0);
    default:
      return 0;
  }
};

export const formatDocumentCurrency = (amount: number | undefined): string => {
  if (!amount || amount === 0) return '-';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
};

export const getDocumentStatusBadge = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'processed':
    case 'completed':
      return { variant: 'default' as const, text: 'Procesado' };
    case 'processing':
      return { variant: 'secondary' as const, text: 'Procesando' };
    case 'error':
      return { variant: 'destructive' as const, text: 'Error' };
    case 'uploaded':
      return { variant: 'outline' as const, text: 'Subido' };
    default:
      return { variant: 'outline' as const, text: 'Pendiente' };
  }
}; 