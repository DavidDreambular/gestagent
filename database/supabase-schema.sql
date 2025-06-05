-- GESTAGENT - Esquema completo de Supabase
-- Base de datos para sistema de digitalización de documentos financieros

-- =====================================================
-- TABLA: users (ya existente, mantenemos estructura)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'user', 'contable', 'gestor', 'supervisor')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: suppliers (proveedores)
-- =====================================================
CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nif_cif VARCHAR(20) UNIQUE, -- Identificador fiscal único
    name VARCHAR(255) NOT NULL,
    commercial_name VARCHAR(255), -- Nombre comercial si difiere del legal
    address TEXT,
    postal_code VARCHAR(10),
    city VARCHAR(100),
    province VARCHAR(100),
    country VARCHAR(100) DEFAULT 'España',
    phone VARCHAR(20),
    email VARCHAR(100),
    website VARCHAR(255),
    contact_person VARCHAR(100),
    
    -- Campos de actividad empresarial
    business_sector VARCHAR(100),
    company_size VARCHAR(20) CHECK (company_size IN ('micro', 'pequeña', 'mediana', 'grande')),
    
    -- Campos de control
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Estadísticas (se actualizarán automáticamente)
    total_invoices INTEGER DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0.00,
    last_invoice_date DATE,
    
    -- Metadata de procesamiento
    first_detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated_from_document UUID -- referencia al último documento que actualizó estos datos
);

-- =====================================================
-- TABLA: customers (clientes)
-- =====================================================
CREATE TABLE IF NOT EXISTS customers (
    customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nif_cif VARCHAR(20) UNIQUE, -- Identificador fiscal único
    name VARCHAR(255) NOT NULL,
    commercial_name VARCHAR(255), -- Nombre comercial si difiere del legal
    address TEXT,
    postal_code VARCHAR(10),
    city VARCHAR(100),
    province VARCHAR(100),
    country VARCHAR(100) DEFAULT 'España',
    phone VARCHAR(20),
    email VARCHAR(100),
    website VARCHAR(255),
    contact_person VARCHAR(100),
    
    -- Campos de clasificación de cliente
    customer_type VARCHAR(20) DEFAULT 'company' CHECK (customer_type IN ('company', 'individual', 'freelancer', 'public')),
    payment_terms VARCHAR(50), -- términos de pago habituales
    credit_limit DECIMAL(12,2),
    
    -- Campos de control
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Estadísticas (se actualizarán automáticamente)
    total_invoices INTEGER DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0.00,
    last_invoice_date DATE,
    
    -- Metadata de procesamiento
    first_detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated_from_document UUID -- referencia al último documento que actualizó estos datos
);

-- =====================================================
-- TABLA: documents (modificada para referenciar suppliers/customers)
-- =====================================================
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    job_id UUID UNIQUE NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    raw_json JSONB,
    processed_json JSONB NOT NULL,
    upload_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'completed',
    version INTEGER DEFAULT 5,
    
    -- Referencias a suppliers y customers
    supplier_id UUID REFERENCES suppliers(supplier_id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(customer_id) ON DELETE SET NULL,
    
    -- Campos denormalizados (mantenemos para compatibilidad)
    emitter_name VARCHAR(255),
    receiver_name VARCHAR(255),
    document_date DATE,
    total_amount DECIMAL(12,2),
    tax_amount DECIMAL(12,2),
    
    -- Metadata
    title VARCHAR(255),
    file_path TEXT,
    processing_metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: audit_logs (para seguimiento de cambios)
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('supplier', 'customer', 'document')),
    entity_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'merged')),
    user_id UUID REFERENCES users(user_id),
    document_id UUID REFERENCES documents(job_id),
    changes JSONB, -- detalles de los cambios realizados
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

-- Índices para suppliers
CREATE INDEX IF NOT EXISTS idx_suppliers_nif_cif ON suppliers(nif_cif);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers USING gin(to_tsvector('spanish', name));
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_created_at ON suppliers(created_at);

-- Índices para customers
CREATE INDEX IF NOT EXISTS idx_customers_nif_cif ON customers(nif_cif);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers USING gin(to_tsvector('spanish', name));
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);

-- Índices para documents (nuevos)
CREATE INDEX IF NOT EXISTS idx_documents_supplier_id ON documents(supplier_id);
CREATE INDEX IF NOT EXISTS idx_documents_customer_id ON documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_documents_total_amount ON documents(total_amount);
CREATE INDEX IF NOT EXISTS idx_documents_document_date ON documents(document_date);

-- Índices para búsqueda full-text
CREATE INDEX IF NOT EXISTS idx_suppliers_search ON suppliers USING gin(
    to_tsvector('spanish', coalesce(name, '') || ' ' || coalesce(commercial_name, '') || ' ' || coalesce(nif_cif, ''))
);
CREATE INDEX IF NOT EXISTS idx_customers_search ON customers USING gin(
    to_tsvector('spanish', coalesce(name, '') || ' ' || coalesce(commercial_name, '') || ' ' || coalesce(nif_cif, ''))
);

-- =====================================================
-- FUNCIONES PARA ACTUALIZACIÓN AUTOMÁTICA DE ESTADÍSTICAS
-- =====================================================

-- Función para actualizar estadísticas de suppliers
CREATE OR REPLACE FUNCTION update_supplier_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE suppliers SET
            total_invoices = (
                SELECT COUNT(*) FROM documents WHERE supplier_id = NEW.supplier_id
            ),
            total_amount = (
                SELECT COALESCE(SUM(total_amount), 0) FROM documents WHERE supplier_id = NEW.supplier_id
            ),
            last_invoice_date = (
                SELECT MAX(document_date) FROM documents WHERE supplier_id = NEW.supplier_id
            ),
            updated_at = NOW()
        WHERE supplier_id = NEW.supplier_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE suppliers SET
            total_invoices = (
                SELECT COUNT(*) FROM documents WHERE supplier_id = OLD.supplier_id
            ),
            total_amount = (
                SELECT COALESCE(SUM(total_amount), 0) FROM documents WHERE supplier_id = OLD.supplier_id
            ),
            last_invoice_date = (
                SELECT MAX(document_date) FROM documents WHERE supplier_id = OLD.supplier_id
            ),
            updated_at = NOW()
        WHERE supplier_id = OLD.supplier_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar estadísticas de customers
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE customers SET
            total_invoices = (
                SELECT COUNT(*) FROM documents WHERE customer_id = NEW.customer_id
            ),
            total_amount = (
                SELECT COALESCE(SUM(total_amount), 0) FROM documents WHERE customer_id = NEW.customer_id
            ),
            last_invoice_date = (
                SELECT MAX(document_date) FROM documents WHERE customer_id = NEW.customer_id
            ),
            updated_at = NOW()
        WHERE customer_id = NEW.customer_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE customers SET
            total_invoices = (
                SELECT COUNT(*) FROM documents WHERE customer_id = OLD.customer_id
            ),
            total_amount = (
                SELECT COALESCE(SUM(total_amount), 0) FROM documents WHERE customer_id = OLD.customer_id
            ),
            last_invoice_date = (
                SELECT MAX(document_date) FROM documents WHERE customer_id = OLD.customer_id
            ),
            updated_at = NOW()
        WHERE customer_id = OLD.customer_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS PARA ACTUALIZACIÓN AUTOMÁTICA
-- =====================================================

DROP TRIGGER IF EXISTS trigger_update_supplier_stats ON documents;
CREATE TRIGGER trigger_update_supplier_stats
    AFTER INSERT OR UPDATE OR DELETE ON documents
    FOR EACH ROW
    WHEN (OLD.supplier_id IS DISTINCT FROM NEW.supplier_id OR OLD.total_amount IS DISTINCT FROM NEW.total_amount)
    EXECUTE FUNCTION update_supplier_stats();

DROP TRIGGER IF EXISTS trigger_update_customer_stats ON documents;
CREATE TRIGGER trigger_update_customer_stats
    AFTER INSERT OR UPDATE OR DELETE ON documents
    FOR EACH ROW
    WHEN (OLD.customer_id IS DISTINCT FROM NEW.customer_id OR OLD.total_amount IS DISTINCT FROM NEW.total_amount)
    EXECUTE FUNCTION update_customer_stats();

-- =====================================================
-- VISTAS ÚTILES PARA REPORTES
-- =====================================================

-- Vista de suppliers con estadísticas completas
CREATE OR REPLACE VIEW suppliers_with_stats AS
SELECT 
    s.*,
    CASE 
        WHEN s.total_amount > 100000 THEN 'alto'
        WHEN s.total_amount > 10000 THEN 'medio'
        ELSE 'bajo'
    END as volume_category,
    CASE 
        WHEN s.last_invoice_date >= CURRENT_DATE - INTERVAL '30 days' THEN 'reciente'
        WHEN s.last_invoice_date >= CURRENT_DATE - INTERVAL '90 days' THEN 'activo'
        ELSE 'inactivo'
    END as activity_status
FROM suppliers s;

-- Vista de customers con estadísticas completas
CREATE OR REPLACE VIEW customers_with_stats AS
SELECT 
    c.*,
    CASE 
        WHEN c.total_amount > 50000 THEN 'alto'
        WHEN c.total_amount > 5000 THEN 'medio'
        ELSE 'bajo'
    END as volume_category,
    CASE 
        WHEN c.last_invoice_date >= CURRENT_DATE - INTERVAL '30 days' THEN 'reciente'
        WHEN c.last_invoice_date >= CURRENT_DATE - INTERVAL '90 days' THEN 'activo'
        ELSE 'inactivo'
    END as activity_status
FROM customers c;

-- =====================================================
-- DATOS INICIALES (OPCIONAL)
-- =====================================================

-- Crear usuario por defecto si no existe
INSERT INTO users (user_id, username, email, role) 
VALUES ('00000000-0000-0000-0000-000000000000', 'dev_user', 'dev@gestagent.local', 'admin')
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- COMENTARIOS FINALES
-- =====================================================

COMMENT ON TABLE suppliers IS 'Tabla de proveedores extraídos automáticamente de facturas';
COMMENT ON TABLE customers IS 'Tabla de clientes extraídos automáticamente de facturas';
COMMENT ON COLUMN suppliers.total_invoices IS 'Número total de facturas procesadas (actualizado automáticamente)';
COMMENT ON COLUMN customers.total_invoices IS 'Número total de facturas procesadas (actualizado automáticamente)';
COMMENT ON COLUMN suppliers.total_amount IS 'Suma total de importes de facturas (actualizado automáticamente)';
COMMENT ON COLUMN customers.total_amount IS 'Suma total de importes de facturas (actualizado automáticamente)'; 