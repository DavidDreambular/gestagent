-- GESTAGENT - Migración 001: Crear tablas de Proveedores y Clientes
-- Migración para crear todas las tablas necesarias para el sistema de gestión de proveedores y clientes

-- =====================================================
-- TABLA: suppliers (proveedores)
-- =====================================================
CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nif_cif VARCHAR(50) UNIQUE, -- Aumentado de 20 a 50 para nombres largos como NIFs
    name VARCHAR(255) NOT NULL,
    commercial_name VARCHAR(255), -- Nombre comercial diferente al legal
    address TEXT,
    postal_code VARCHAR(10),
    city VARCHAR(100),
    province VARCHAR(100),
    country VARCHAR(100) DEFAULT 'España',
    phone VARCHAR(20),
    email VARCHAR(100),
    website VARCHAR(255),
    contact_person VARCHAR(100),
    business_sector VARCHAR(100), -- Sector empresarial
    company_size VARCHAR(20) CHECK (company_size IN ('micro', 'pequeña', 'mediana', 'grande')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Campos calculados automáticamente
    total_invoices INTEGER DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0.00,
    last_invoice_date DATE,
    first_detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Metadatos de análisis automático
    average_invoice_amount DECIMAL(12,2) DEFAULT 0.00,
    invoice_frequency VARCHAR(20) -- 'alta', 'media', 'baja'
);

-- =====================================================
-- TABLA: customers (clientes)
-- =====================================================
CREATE TABLE IF NOT EXISTS customers (
    customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nif_cif VARCHAR(50) UNIQUE, -- Aumentado de 20 a 50 para nombres largos como NIFs
    name VARCHAR(255) NOT NULL,
    commercial_name VARCHAR(255), -- Nombre comercial diferente al legal
    address TEXT,
    postal_code VARCHAR(10),
    city VARCHAR(100),
    province VARCHAR(100),
    country VARCHAR(100) DEFAULT 'España',
    phone VARCHAR(20),
    email VARCHAR(100),
    website VARCHAR(255),
    contact_person VARCHAR(100),
    customer_type VARCHAR(20) DEFAULT 'company' CHECK (customer_type IN ('company', 'individual', 'freelancer', 'public')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Campos calculados automáticamente
    total_invoices INTEGER DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0.00,
    last_invoice_date DATE,
    first_detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Metadatos de análisis automático
    average_invoice_amount DECIMAL(12,2) DEFAULT 0.00,
    invoice_frequency VARCHAR(20) -- 'alta', 'media', 'baja'
);

-- =====================================================
-- MODIFICAR TABLA: documents (para agregar referencias)
-- =====================================================
-- Agregar columnas de referencia a proveedores y clientes
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(supplier_id),
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(customer_id);

-- =====================================================
-- ÍNDICES para optimización
-- =====================================================

-- Índices para suppliers
CREATE INDEX IF NOT EXISTS idx_suppliers_nif_cif ON suppliers(nif_cif);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers USING GIN (to_tsvector('spanish', name));
CREATE INDEX IF NOT EXISTS idx_suppliers_city ON suppliers(city);
CREATE INDEX IF NOT EXISTS idx_suppliers_province ON suppliers(province);
CREATE INDEX IF NOT EXISTS idx_suppliers_sector ON suppliers(business_sector);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_total_amount ON suppliers(total_amount DESC);
CREATE INDEX IF NOT EXISTS idx_suppliers_last_invoice ON suppliers(last_invoice_date DESC);

-- Índices para customers  
CREATE INDEX IF NOT EXISTS idx_customers_nif_cif ON customers(nif_cif);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers USING GIN (to_tsvector('spanish', name));
CREATE INDEX IF NOT EXISTS idx_customers_city ON customers(city);
CREATE INDEX IF NOT EXISTS idx_customers_province ON customers(province);
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_total_amount ON customers(total_amount DESC);
CREATE INDEX IF NOT EXISTS idx_customers_last_invoice ON customers(last_invoice_date DESC);

-- Índices para documents (relaciones)
CREATE INDEX IF NOT EXISTS idx_documents_supplier_id ON documents(supplier_id);
CREATE INDEX IF NOT EXISTS idx_documents_customer_id ON documents(customer_id);

-- =====================================================
-- VISTAS para estadísticas calculadas
-- =====================================================

-- Vista para suppliers con estadísticas calculadas
CREATE OR REPLACE VIEW suppliers_with_stats AS
SELECT 
    s.*,
    -- Categorías calculadas
    CASE 
        WHEN s.total_amount > 50000 THEN 'alto'
        WHEN s.total_amount > 10000 THEN 'medio'
        ELSE 'bajo'
    END as volume_category,
    
    CASE 
        WHEN s.last_invoice_date >= CURRENT_DATE - INTERVAL '30 days' THEN 'reciente'
        WHEN s.last_invoice_date >= CURRENT_DATE - INTERVAL '90 days' THEN 'activo'
        ELSE 'inactivo'
    END as activity_status,
    
    -- Estadísticas adicionales desde documents
    COALESCE(doc_stats.recent_invoices, 0) as recent_invoices_count,
    COALESCE(doc_stats.avg_processing_time, 0) as avg_processing_time
    
FROM suppliers s
LEFT JOIN (
    SELECT 
        supplier_id,
        COUNT(*) FILTER (WHERE upload_timestamp >= CURRENT_DATE - INTERVAL '30 days') as recent_invoices,
        AVG(EXTRACT(EPOCH FROM (upload_timestamp - upload_timestamp))) as avg_processing_time
    FROM documents 
    WHERE supplier_id IS NOT NULL
    GROUP BY supplier_id
) doc_stats ON s.supplier_id = doc_stats.supplier_id;

-- Vista para customers con estadísticas calculadas  
CREATE OR REPLACE VIEW customers_with_stats AS
SELECT 
    c.*,
    -- Categorías calculadas
    CASE 
        WHEN c.total_amount > 50000 THEN 'alto'
        WHEN c.total_amount > 10000 THEN 'medio'
        ELSE 'bajo'
    END as volume_category,
    
    CASE 
        WHEN c.last_invoice_date >= CURRENT_DATE - INTERVAL '30 days' THEN 'reciente'
        WHEN c.last_invoice_date >= CURRENT_DATE - INTERVAL '90 days' THEN 'activo'
        ELSE 'inactivo'
    END as activity_status,
    
    -- Estadísticas adicionales desde documents
    COALESCE(doc_stats.recent_invoices, 0) as recent_invoices_count,
    COALESCE(doc_stats.avg_processing_time, 0) as avg_processing_time
    
FROM customers c
LEFT JOIN (
    SELECT 
        customer_id,
        COUNT(*) FILTER (WHERE upload_timestamp >= CURRENT_DATE - INTERVAL '30 days') as recent_invoices,
        AVG(EXTRACT(EPOCH FROM (upload_timestamp - upload_timestamp))) as avg_processing_time
    FROM documents 
    WHERE customer_id IS NOT NULL
    GROUP BY customer_id
) doc_stats ON c.customer_id = doc_stats.customer_id;

-- =====================================================
-- FUNCIONES para actualización automática de estadísticas
-- =====================================================

-- Función para actualizar estadísticas de suppliers
CREATE OR REPLACE FUNCTION update_supplier_stats(p_supplier_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE suppliers 
    SET 
        total_invoices = (
            SELECT COUNT(*) 
            FROM documents 
            WHERE supplier_id = p_supplier_id
        ),
        total_amount = (
            SELECT COALESCE(SUM(
                CASE 
                    WHEN processed_json ? 'total_amount' THEN 
                        (processed_json->>'total_amount')::DECIMAL
                    ELSE 0
                END
            ), 0)
            FROM documents 
            WHERE supplier_id = p_supplier_id
        ),
        last_invoice_date = (
            SELECT MAX(document_date) 
            FROM documents 
            WHERE supplier_id = p_supplier_id AND document_date IS NOT NULL
        ),
        average_invoice_amount = (
            SELECT COALESCE(AVG(
                CASE 
                    WHEN processed_json ? 'total_amount' THEN 
                        (processed_json->>'total_amount')::DECIMAL
                    ELSE 0
                END
            ), 0)
            FROM documents 
            WHERE supplier_id = p_supplier_id
        ),
        updated_at = NOW()
    WHERE supplier_id = p_supplier_id;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar estadísticas de customers
CREATE OR REPLACE FUNCTION update_customer_stats(p_customer_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE customers 
    SET 
        total_invoices = (
            SELECT COUNT(*) 
            FROM documents 
            WHERE customer_id = p_customer_id
        ),
        total_amount = (
            SELECT COALESCE(SUM(
                CASE 
                    WHEN processed_json ? 'total_amount' THEN 
                        (processed_json->>'total_amount')::DECIMAL
                    ELSE 0
                END
            ), 0)
            FROM documents 
            WHERE customer_id = p_customer_id
        ),
        last_invoice_date = (
            SELECT MAX(document_date) 
            FROM documents 
            WHERE customer_id = p_customer_id AND document_date IS NOT NULL
        ),
        average_invoice_amount = (
            SELECT COALESCE(AVG(
                CASE 
                    WHEN processed_json ? 'total_amount' THEN 
                        (processed_json->>'total_amount')::DECIMAL
                    ELSE 0
                END
            ), 0)
            FROM documents 
            WHERE customer_id = p_customer_id
        ),
        updated_at = NOW()
    WHERE customer_id = p_customer_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS para actualización automática
-- =====================================================

-- Trigger para actualizar estadísticas cuando se insertan/actualizan documentos
CREATE OR REPLACE FUNCTION update_supplier_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar estadísticas del supplier si está definido
    IF NEW.supplier_id IS NOT NULL THEN
        PERFORM update_supplier_stats(NEW.supplier_id);
    END IF;
    
    -- Actualizar estadísticas del customer si está definido
    IF NEW.customer_id IS NOT NULL THEN
        PERFORM update_customer_stats(NEW.customer_id);
    END IF;
    
    -- Si es un UPDATE y cambió el supplier_id, actualizar el anterior también
    IF TG_OP = 'UPDATE' AND OLD.supplier_id IS DISTINCT FROM NEW.supplier_id THEN
        IF OLD.supplier_id IS NOT NULL THEN
            PERFORM update_supplier_stats(OLD.supplier_id);
        END IF;
    END IF;
    
    -- Si es un UPDATE y cambió el customer_id, actualizar el anterior también
    IF TG_OP = 'UPDATE' AND OLD.customer_id IS DISTINCT FROM NEW.customer_id THEN
        IF OLD.customer_id IS NOT NULL THEN
            PERFORM update_customer_stats(OLD.customer_id);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear triggers
DROP TRIGGER IF EXISTS trg_update_supplier_customer_stats ON documents;
CREATE TRIGGER trg_update_supplier_customer_stats
    AFTER INSERT OR UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_supplier_customer_stats();

-- =====================================================
-- DATOS DE PRUEBA (opcional, solo para desarrollo)
-- =====================================================

-- Insertar algunos proveedores de ejemplo para testing
INSERT INTO suppliers (name, nif_cif, address, city, province, business_sector, company_size) VALUES
    ('Proveedor Ejemplo 1', 'A12345678', 'Calle Falsa 123', 'Madrid', 'Madrid', 'Tecnología', 'mediana'),
    ('Proveedor Ejemplo 2', 'B87654321', 'Avenida Principal 456', 'Barcelona', 'Barcelona', 'Consultoría', 'pequeña')
ON CONFLICT (nif_cif) DO NOTHING;

-- Insertar algunos clientes de ejemplo para testing  
INSERT INTO customers (name, nif_cif, address, city, province, customer_type) VALUES
    ('Cliente Ejemplo 1', 'C11111111', 'Plaza Mayor 1', 'Sevilla', 'Sevilla', 'company'),
    ('Cliente Ejemplo 2', 'D22222222', 'Gran Vía 100', 'Valencia', 'Valencia', 'individual')
ON CONFLICT (nif_cif) DO NOTHING; 