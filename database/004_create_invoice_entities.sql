-- Migración 004: Crear tabla invoice_entities
-- Esta tabla normaliza la información de facturas extraídas de los documentos
-- para facilitar consultas y reportes

CREATE TABLE IF NOT EXISTS invoice_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(job_id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(supplier_id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(customer_id) ON DELETE SET NULL,
    
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

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_invoice_entities_document_id ON invoice_entities(document_id);
CREATE INDEX IF NOT EXISTS idx_invoice_entities_supplier_id ON invoice_entities(supplier_id);
CREATE INDEX IF NOT EXISTS idx_invoice_entities_customer_id ON invoice_entities(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoice_entities_invoice_number ON invoice_entities(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoice_entities_invoice_date ON invoice_entities(invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_entities_total_amount ON invoice_entities(total_amount DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_entities_status ON invoice_entities(status);

-- Función para poblar invoice_entities desde documents existentes
CREATE OR REPLACE FUNCTION populate_invoice_entities()
RETURNS INTEGER AS $$
DECLARE
    doc_record RECORD;
    processed_count INTEGER := 0;
    supplier_uuid UUID;
    customer_uuid UUID;
    invoice_date_value DATE;
    total_amount_value DECIMAL(12,2);
    invoice_number_value VARCHAR(100);
BEGIN
    -- Procesar todos los documentos que no tengan entrada en invoice_entities
    FOR doc_record IN 
        SELECT d.* FROM documents d 
        LEFT JOIN invoice_entities ie ON d.job_id = ie.document_id 
        WHERE ie.id IS NULL 
        AND d.status = 'completed'
        AND d.processed_json IS NOT NULL
    LOOP
        -- Intentar extraer datos del JSON procesado
        BEGIN
            -- Extraer invoice_number
            invoice_number_value := COALESCE(
                doc_record.processed_json->>'invoice_number',
                doc_record.processed_json->>'numero_factura',
                doc_record.processed_json->>'number',
                'INV-' || SUBSTRING(doc_record.job_id::text, 1, 8)
            );
            
            -- Extraer fecha
            invoice_date_value := COALESCE(
                (doc_record.processed_json->>'invoice_date')::DATE,
                (doc_record.processed_json->>'fecha_factura')::DATE,
                (doc_record.processed_json->>'document_date')::DATE,
                doc_record.document_date,
                doc_record.upload_timestamp::DATE
            );
            
            -- Extraer total_amount
            total_amount_value := COALESCE(
                (doc_record.processed_json->>'total_amount')::DECIMAL(12,2),
                (doc_record.processed_json->>'importe_total')::DECIMAL(12,2),
                (doc_record.processed_json->>'total')::DECIMAL(12,2),
                doc_record.total_amount,
                0.00
            );
            
            -- Obtener supplier_id y customer_id del documento
            supplier_uuid := doc_record.supplier_id;
            customer_uuid := doc_record.customer_id;
            
            -- Si no están definidos, intentar encontrarlos por nombres
            IF supplier_uuid IS NULL AND doc_record.emitter_name IS NOT NULL THEN
                SELECT supplier_id INTO supplier_uuid 
                FROM suppliers 
                WHERE name ILIKE '%' || doc_record.emitter_name || '%' 
                OR commercial_name ILIKE '%' || doc_record.emitter_name || '%'
                LIMIT 1;
            END IF;
            
            IF customer_uuid IS NULL AND doc_record.receiver_name IS NOT NULL THEN
                SELECT customer_id INTO customer_uuid 
                FROM customers 
                WHERE name ILIKE '%' || doc_record.receiver_name || '%' 
                OR commercial_name ILIKE '%' || doc_record.receiver_name || '%'
                LIMIT 1;
            END IF;
            
            -- Insertar en invoice_entities
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
            ) VALUES (
                doc_record.job_id,
                supplier_uuid,
                customer_uuid,
                invoice_number_value,
                invoice_date_value,
                total_amount_value,
                COALESCE(doc_record.tax_amount, 0.00),
                'active',
                doc_record.created_at,
                doc_record.updated_at
            );
            
            processed_count := processed_count + 1;
            
        EXCEPTION WHEN OTHERS THEN
            -- Log error but continue processing
            RAISE WARNING 'Error processing document %: %', doc_record.job_id, SQLERRM;
            CONTINUE;
        END;
    END LOOP;
    
    RETURN processed_count;
END;
$$ LANGUAGE plpgsql;

-- Función para mantener sincronizados invoice_entities con documents
CREATE OR REPLACE FUNCTION sync_invoice_entities()
RETURNS TRIGGER AS $$
BEGIN
    -- Si es INSERT o UPDATE en documents
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Solo procesar documentos completados con JSON procesado
        IF NEW.status = 'completed' AND NEW.processed_json IS NOT NULL THEN
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
            ) VALUES (
                NEW.job_id,
                NEW.supplier_id,
                NEW.customer_id,
                COALESCE(
                    NEW.processed_json->>'invoice_number',
                    NEW.processed_json->>'numero_factura',
                    'INV-' || SUBSTRING(NEW.job_id::text, 1, 8)
                ),
                COALESCE(
                    (NEW.processed_json->>'invoice_date')::DATE,
                    NEW.document_date,
                    NEW.upload_timestamp::DATE
                ),
                COALESCE(
                    (NEW.processed_json->>'total_amount')::DECIMAL(12,2),
                    NEW.total_amount,
                    0.00
                ),
                COALESCE(NEW.tax_amount, 0.00),
                'active',
                NEW.created_at,
                NEW.updated_at
            )
            ON CONFLICT (document_id) DO UPDATE SET
                supplier_id = EXCLUDED.supplier_id,
                customer_id = EXCLUDED.customer_id,
                invoice_number = EXCLUDED.invoice_number,
                invoice_date = EXCLUDED.invoice_date,
                total_amount = EXCLUDED.total_amount,
                tax_amount = EXCLUDED.tax_amount,
                updated_at = NOW();
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- Si es DELETE en documents
    IF TG_OP = 'DELETE' THEN
        DELETE FROM invoice_entities WHERE document_id = OLD.job_id;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para mantener sincronización
DROP TRIGGER IF EXISTS trg_sync_invoice_entities ON documents;
CREATE TRIGGER trg_sync_invoice_entities
    AFTER INSERT OR UPDATE OR DELETE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION sync_invoice_entities();

-- Función para actualizar estadísticas de entidades cuando cambian las facturas
CREATE OR REPLACE FUNCTION update_entity_stats_from_invoices()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar estadísticas del supplier
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF NEW.supplier_id IS NOT NULL THEN
            UPDATE suppliers 
            SET 
                total_invoices = (
                    SELECT COUNT(*) 
                    FROM invoice_entities 
                    WHERE supplier_id = NEW.supplier_id
                ),
                total_amount = (
                    SELECT COALESCE(SUM(total_amount), 0) 
                    FROM invoice_entities 
                    WHERE supplier_id = NEW.supplier_id
                ),
                last_invoice_date = (
                    SELECT MAX(invoice_date) 
                    FROM invoice_entities 
                    WHERE supplier_id = NEW.supplier_id
                ),
                updated_at = NOW()
            WHERE supplier_id = NEW.supplier_id;
        END IF;
        
        IF NEW.customer_id IS NOT NULL THEN
            UPDATE customers 
            SET 
                total_invoices = (
                    SELECT COUNT(*) 
                    FROM invoice_entities 
                    WHERE customer_id = NEW.customer_id
                ),
                total_amount = (
                    SELECT COALESCE(SUM(total_amount), 0) 
                    FROM invoice_entities 
                    WHERE customer_id = NEW.customer_id
                ),
                last_invoice_date = (
                    SELECT MAX(invoice_date) 
                    FROM invoice_entities 
                    WHERE customer_id = NEW.customer_id
                ),
                updated_at = NOW()
            WHERE customer_id = NEW.customer_id;
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- Para DELETE, actualizar las estadísticas de la entidad anterior
    IF TG_OP = 'DELETE' THEN
        IF OLD.supplier_id IS NOT NULL THEN
            UPDATE suppliers 
            SET 
                total_invoices = (
                    SELECT COUNT(*) 
                    FROM invoice_entities 
                    WHERE supplier_id = OLD.supplier_id
                ),
                total_amount = (
                    SELECT COALESCE(SUM(total_amount), 0) 
                    FROM invoice_entities 
                    WHERE supplier_id = OLD.supplier_id
                ),
                last_invoice_date = (
                    SELECT MAX(invoice_date) 
                    FROM invoice_entities 
                    WHERE supplier_id = OLD.supplier_id
                ),
                updated_at = NOW()
            WHERE supplier_id = OLD.supplier_id;
        END IF;
        
        IF OLD.customer_id IS NOT NULL THEN
            UPDATE customers 
            SET 
                total_invoices = (
                    SELECT COUNT(*) 
                    FROM invoice_entities 
                    WHERE customer_id = OLD.customer_id
                ),
                total_amount = (
                    SELECT COALESCE(SUM(total_amount), 0) 
                    FROM invoice_entities 
                    WHERE customer_id = OLD.customer_id
                ),
                last_invoice_date = (
                    SELECT MAX(invoice_date) 
                    FROM invoice_entities 
                    WHERE customer_id = OLD.customer_id
                ),
                updated_at = NOW()
            WHERE customer_id = OLD.customer_id;
        END IF;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para actualizar estadísticas automáticamente
DROP TRIGGER IF EXISTS trg_update_entity_stats_from_invoices ON invoice_entities;
CREATE TRIGGER trg_update_entity_stats_from_invoices
    AFTER INSERT OR UPDATE OR DELETE ON invoice_entities
    FOR EACH ROW
    EXECUTE FUNCTION update_entity_stats_from_invoices();

-- Añadir restricción UNIQUE para evitar duplicados
ALTER TABLE invoice_entities 
ADD CONSTRAINT unique_document_invoice 
UNIQUE (document_id);

-- Comentarios para documentación
COMMENT ON TABLE invoice_entities IS 'Tabla para normalizar y gestionar facturas extraídas de documentos';
COMMENT ON COLUMN invoice_entities.document_id IS 'Referencia al documento original del cual se extrajo la factura';
COMMENT ON COLUMN invoice_entities.extracted_confidence IS 'Nivel de confianza de la extracción automática (0.00-1.00)';
COMMENT ON COLUMN invoice_entities.manual_review IS 'Indica si la factura ha sido revisada manualmente';

-- Output de información sobre la migración
DO $$
BEGIN
    RAISE NOTICE 'Migración 004 completada: Tabla invoice_entities creada';
    RAISE NOTICE 'Se han creado los siguientes elementos:';
    RAISE NOTICE '- Tabla invoice_entities con campos normalizados';
    RAISE NOTICE '- Índices para optimizar consultas';
    RAISE NOTICE '- Función populate_invoice_entities() para migrar datos existentes';
    RAISE NOTICE '- Triggers para mantener sincronización automática';
    RAISE NOTICE '';
    RAISE NOTICE 'Para poblar la tabla con documentos existentes, ejecutar:';
    RAISE NOTICE 'SELECT populate_invoice_entities();';
END $$;