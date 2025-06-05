// Tipos compartidos para documentos financieros
export interface FinancialDocument {
  document_type: 'factura' | 'nomina' | 'recibo' | 'extracto' | 'balance';
  document_number?: string;
  document_date?: string;
  emitter?: {
    name: string;
    tax_id?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  receiver?: {
    name: string;
    tax_id?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  items?: Array<{
    description: string;
    quantity?: number;
    unit_price?: number;
    amount?: number;
    tax_rate?: number;
    tax_amount?: number;
  }>;
  totals?: {
    subtotal?: number;
    total_taxes?: number;
    total?: number;
  };
  payment_info?: {
    method?: string;
    due_date?: string;
    account_number?: string;
    reference?: string;
  };
  metadata?: Record<string, any>;
}

// Respuesta de validación
export interface ValidationResponse {
  result: FinancialDocument;
  dialog: string;
  confidence?: number;
  processingTime?: number;
}

// Tipos de errores específicos
export enum DocumentProcessingError {
  INVALID_FORMAT = 'INVALID_FORMAT',
  PARSING_ERROR = 'PARSING_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  API_ERROR = 'API_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR'
}
