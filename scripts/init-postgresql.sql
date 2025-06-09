-- ========================================
-- GESTAGENT - SCHEMA POSTGRESQL LOCAL
-- Script de inicialización completa
-- ========================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- Para búsquedas de texto

-- TABLA: users
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user' 
        CHECK (role IN ('admin', 'user', 'contable', 'gestor', 'supervisor', 'operador')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLA: suppliers (proveedores)
CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nif_cif VARCHAR(20) UNIQUE,
    name VARCHAR(255) NOT NULL,
    commercial_name VARCHAR(255),
    address TEXT,
    postal_code VARCHAR(10),
    city VARCHAR(100),
    province VARCHAR(100),
    country VARCHAR(100) DEFAULT 'España',
    phone VARCHAR(20),
    email VARCHAR(100),
    website VARCHAR(255),
    contact_person VARCHAR(100),
    business_sector VARCHAR(100),
    company_size VARCHAR(20) DEFAULT 'mediana'
        CHECK (company_size IN ('micro', 'pequeña', 'mediana', 'grande')),
    status VARCHAR(20) DEFAULT 'active' 
        CHECK (status IN ('active', 'inactive', 'blocked')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_invoices INTEGER DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0.00,
    last_invoice_date DATE,
    first_detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated_from_document UUID
);

-- TABLA: customers (clientes)
CREATE TABLE IF NOT EXISTS customers (
    customer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nif_cif VARCHAR(20) UNIQUE,
    name VARCHAR(255) NOT NULL,
    commercial_name VARCHAR(255),
    address TEXT,
    postal_code VARCHAR(10),
    city VARCHAR(100),
    province VARCHAR(100),
    country VARCHAR(100) DEFAULT 'España',
    phone VARCHAR(20),
    email VARCHAR(100),
    website VARCHAR(255),
    contact_person VARCHAR(100),
    customer_type VARCHAR(20) DEFAULT 'company' 
        CHECK (customer_type IN ('company', 'individual', 'freelancer', 'public')),
    payment_terms VARCHAR(50),
    credit_limit DECIMAL(12,2),
    status VARCHAR(20) DEFAULT 'active' 
        CHECK (status IN ('active', 'inactive', 'blocked')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_invoices INTEGER DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0.00,
    last_invoice_date DATE,
    first_detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated_from_document UUID
);

-- TABLA: documents (documentos)
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    job_id UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    document_type VARCHAR(50) NOT NULL,
    raw_json JSONB,
    processed_json JSONB NOT NULL,
    upload_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'completed'
        CHECK (status IN ('pending', 'processing', 'completed', 'error', 'cancelled')),
    version INTEGER DEFAULT 1,
    supplier_id UUID REFERENCES suppliers(supplier_id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(customer_id) ON DELETE SET NULL,
    emitter_name VARCHAR(255),
    receiver_name VARCHAR(255),
    document_date DATE,
    total_amount DECIMAL(12,2),
    tax_amount DECIMAL(12,2),
    title VARCHAR(255),
    file_path TEXT,
    processing_metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLA: audit_logs (auditoría)
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(20) NOT NULL 
        CHECK (entity_type IN ('supplier', 'customer', 'document', 'user')),
    entity_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL 
        CHECK (action IN ('created', 'updated', 'deleted', 'merged', 'processed')),
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    document_id UUID, -- No FK constraint para flexibilidad
    changes JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

-- ÍNDICES PARA RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_documents_job_id ON documents(job_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_date ON documents(document_date);
CREATE INDEX IF NOT EXISTS idx_documents_supplier ON documents(supplier_id);
CREATE INDEX IF NOT EXISTS idx_documents_customer ON documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_documents_processed_json ON documents USING GIN(processed_json);

CREATE INDEX IF NOT EXISTS idx_suppliers_nif ON suppliers(nif_cif);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers USING GIN(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);

CREATE INDEX IF NOT EXISTS idx_customers_nif ON customers(nif_cif);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers USING GIN(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);

-- FUNCIÓN PARA ACTUALIZAR updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- TRIGGERS PARA AUTO-UPDATE
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
CREATE TRIGGER update_suppliers_updated_at 
    BEFORE UPDATE ON suppliers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON customers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at 
    BEFORE UPDATE ON documents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- DATOS INICIALES
INSERT INTO users (username, email, role) VALUES 
('admin', 'admin@gestagent.com', 'admin'),
('demo', 'demo@gestagent.com', 'user'),
('contable', 'contable@gestagent.com', 'contable'),
('gestor', 'gestor@gestagent.com', 'gestor')
ON CONFLICT (email) DO NOTHING;

-- PROVEEDORES DE EJEMPLO
INSERT INTO suppliers (nif_cif, name, commercial_name, city, province, status, business_sector) VALUES 
('A12345678', 'Tecnología Avanzada S.A.', 'TechnoAdvance', 'Madrid', 'Madrid', 'active', 'Tecnología'),
('B87654321', 'Suministros Oficina Express', 'OfficeExpress', 'Barcelona', 'Barcelona', 'active', 'Papelería'),
('C11223344', 'Servicios Contables López', 'ContaLópez', 'Valencia', 'Valencia', 'active', 'Servicios Profesionales'),
('D99887766', 'Materiales Construcción Norte', 'ConNorte', 'Bilbao', 'Vizcaya', 'active', 'Construcción')
ON CONFLICT (nif_cif) DO NOTHING;

-- CLIENTES DE EJEMPLO  
INSERT INTO customers (nif_cif, name, commercial_name, city, province, status, customer_type) VALUES 
('E55667788', 'Retail Solutions S.L.', 'RetailSol', 'Sevilla', 'Sevilla', 'active', 'company'),
('F44556677', 'Restaurante El Buen Sabor', 'El Buen Sabor', 'Granada', 'Granada', 'active', 'company'),
('G33445566', 'Juan Pérez García', NULL, 'Málaga', 'Málaga', 'active', 'individual'),
('H22334455', 'Consultora Digital Innovación', 'DigiInnovación', 'Zaragoza', 'Zaragoza', 'active', 'company')
ON CONFLICT (nif_cif) DO NOTHING;

-- DOCUMENTOS DE EJEMPLO
INSERT INTO documents (
    job_id, 
    document_type, 
    processed_json, 
    emitter_name, 
    receiver_name, 
    document_date, 
    total_amount,
    status,
    supplier_id,
    customer_id
) VALUES 
(
    uuid_generate_v4(),
    'invoice',
    '{"invoice_number": "FAC-2024-001", "total": 1250.50, "currency": "EUR", "items": [{"description": "Servicios IT", "amount": 1250.50}]}',
    'Tecnología Avanzada S.A.',
    'Retail Solutions S.L.',
    '2024-01-15',
    1250.50,
    'completed',
    (SELECT supplier_id FROM suppliers WHERE nif_cif = 'A12345678'),
    (SELECT customer_id FROM customers WHERE nif_cif = 'E55667788')
),
(
    uuid_generate_v4(),
    'invoice', 
    '{"invoice_number": "FAC-2024-002", "total": 890.25, "currency": "EUR", "items": [{"description": "Material oficina", "amount": 890.25}]}',
    'Suministros Oficina Express',
    'Consultora Digital Innovación', 
    '2024-01-20',
    890.25,
    'completed',
    (SELECT supplier_id FROM suppliers WHERE nif_cif = 'B87654321'),
    (SELECT customer_id FROM customers WHERE nif_cif = 'H22334455')
),
(
    uuid_generate_v4(),
    'payroll',
    '{"employee_name": "María González", "gross_salary": 2800.00, "net_salary": 2100.00, "period": "2024-01"}',
    'Servicios Contables López',
    'Restaurante El Buen Sabor',
    '2024-01-31',
    2800.00,
    'completed',
    (SELECT supplier_id FROM suppliers WHERE nif_cif = 'C11223344'),
    (SELECT customer_id FROM customers WHERE nif_cif = 'F44556677')
);

-- LOG DE AUDITORÍA DE EJEMPLO
INSERT INTO audit_logs (entity_type, entity_id, action, user_id, notes) VALUES 
('document', (SELECT job_id FROM documents LIMIT 1), 'created', (SELECT user_id FROM users WHERE email = 'admin@gestagent.com'), 'Documento procesado automáticamente'),
('supplier', (SELECT supplier_id FROM suppliers LIMIT 1), 'created', (SELECT user_id FROM users WHERE email = 'admin@gestagent.com'), 'Proveedor detectado desde factura'),
('customer', (SELECT customer_id FROM customers LIMIT 1), 'created', (SELECT user_id FROM users WHERE email = 'admin@gestagent.com'), 'Cliente detectado desde factura');

-- Mensaje final
SELECT 'Base de datos inicializada correctamente' AS status; 