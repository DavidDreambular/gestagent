-- Migración 004: Crear tabla invoice_entities (versión simplificada)
-- Esta tabla normaliza la información de facturas extraídas de los documentos

-- Eliminar tabla si existe para recrear
DROP TABLE IF EXISTS invoice_entities CASCADE;

CREATE TABLE invoice_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL,
    supplier_id UUID,
    customer_id UUID,
    
    -- Información básica de la factura
    invoice_number VARCHAR(100),
    invoice_date DATE,
    due_date DATE,
    
    -- Importes
    subtotal_amount DECIMAL(12,2) DEFAULT 0.00,
    tax_amount DECIMAL(12,2) DEFAULT 0.00,
    total_amount DECIMAL(12,2) DEFAULT 0.00,
    
    -- Información adicional
    currency VARCHAR(3) DEFAULT 'EUR',
    payment_method VARCHAR(50),
    payment_terms INTEGER, -- días
    
    -- Estado de la factura
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'paid', 'overdue')),
    
    -- Metadatos
    extracted_confidence DECIMAL(3,2) DEFAULT 0.00, -- confianza de la extracción
    manual_review BOOLEAN DEFAULT FALSE,
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Añadir foreign keys después de crear la tabla
ALTER TABLE invoice_entities 
ADD CONSTRAINT fk_invoice_entities_document_id 
FOREIGN KEY (document_id) REFERENCES documents(job_id) ON DELETE CASCADE;

ALTER TABLE invoice_entities 
ADD CONSTRAINT fk_invoice_entities_supplier_id 
FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id) ON DELETE SET NULL;

ALTER TABLE invoice_entities 
ADD CONSTRAINT fk_invoice_entities_customer_id 
FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE SET NULL;

-- Índices para optimizar consultas
CREATE INDEX idx_invoice_entities_document_id ON invoice_entities(document_id);
CREATE INDEX idx_invoice_entities_supplier_id ON invoice_entities(supplier_id);
CREATE INDEX idx_invoice_entities_customer_id ON invoice_entities(customer_id);
CREATE INDEX idx_invoice_entities_invoice_number ON invoice_entities(invoice_number);
CREATE INDEX idx_invoice_entities_invoice_date ON invoice_entities(invoice_date DESC);
CREATE INDEX idx_invoice_entities_total_amount ON invoice_entities(total_amount DESC);
CREATE INDEX idx_invoice_entities_status ON invoice_entities(status);

-- Añadir restricción UNIQUE para evitar duplicados
ALTER TABLE invoice_entities 
ADD CONSTRAINT unique_document_invoice 
UNIQUE (document_id);

-- Insertar datos básicos de documentos existentes
INSERT INTO invoice_entities (
    document_id,
    supplier_id,
    customer_id,
    invoice_number,
    invoice_date,
    total_amount,
    tax_amount,
    status,
    created_at,
    updated_at
)
SELECT 
    d.job_id,
    d.supplier_id,
    d.customer_id,
    COALESCE(
        d.processed_json->>'invoice_number',
        d.processed_json->>'numero_factura',
        'INV-' || SUBSTRING(d.job_id::text, 1, 8)
    ) as invoice_number,
    COALESCE(
        (d.processed_json->>'invoice_date')::DATE,
        d.document_date,
        d.upload_timestamp::DATE
    ) as invoice_date,
    COALESCE(
        (d.processed_json->>'total_amount')::DECIMAL(12,2),
        d.total_amount,
        0.00
    ) as total_amount,
    COALESCE(d.tax_amount, 0.00) as tax_amount,
    'active' as status,
    d.created_at,
    d.updated_at
FROM documents d
WHERE d.status = 'completed'
AND d.processed_json IS NOT NULL
ON CONFLICT (document_id) DO NOTHING;

-- Comentarios para documentación
COMMENT ON TABLE invoice_entities IS 'Tabla para normalizar y gestionar facturas extraídas de documentos';
COMMENT ON COLUMN invoice_entities.document_id IS 'Referencia al documento original del cual se extrajo la factura';
COMMENT ON COLUMN invoice_entities.extracted_confidence IS 'Nivel de confianza de la extracción automática (0.00-1.00)';
COMMENT ON COLUMN invoice_entities.manual_review IS 'Indica si la factura ha sido revisada manualmente';

-- Output de información
DO $$
DECLARE
    invoice_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invoice_count FROM invoice_entities;
    RAISE NOTICE 'Migración 004 completada: Tabla invoice_entities creada';
    RAISE NOTICE 'Se procesaron % facturas desde documentos existentes', invoice_count;
END $$;