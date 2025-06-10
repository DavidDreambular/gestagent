-- Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de documentos
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    job_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    document_type VARCHAR(50) NOT NULL,
    raw_json JSONB,
    processed_json JSONB,
    upload_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id UUID REFERENCES users(user_id),
    status VARCHAR(20) DEFAULT 'pending',
    version INTEGER DEFAULT 1,
    supplier_id UUID,
    customer_id UUID,
    emitter_name VARCHAR(255),
    receiver_name VARCHAR(255),
    document_date DATE,
    total_amount DECIMAL(12, 2),
    tax_amount DECIMAL(12, 2),
    title VARCHAR(255),
    file_path TEXT,
    processing_metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de proveedores
CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nif_cif VARCHAR(20),
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
    company_size VARCHAR(50) DEFAULT 'mediana',
    status VARCHAR(20) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_invoices INTEGER DEFAULT 0,
    total_amount DECIMAL(12, 2) DEFAULT 0,
    last_invoice_date DATE,
    first_detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated_from_document UUID
);

-- Crear tabla de clientes
CREATE TABLE IF NOT EXISTS customers (
    customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nif_cif VARCHAR(20),
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
    customer_type VARCHAR(50) DEFAULT 'company',
    payment_terms VARCHAR(100),
    credit_limit DECIMAL(12, 2),
    status VARCHAR(20) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_invoices INTEGER DEFAULT 0,
    total_amount DECIMAL(12, 2) DEFAULT 0,
    last_invoice_date DATE,
    first_detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated_from_document UUID
);

-- Crear tabla de auditoría
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES users(user_id),
    document_id UUID,
    changes JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Crear tabla de notificaciones
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data JSONB
);

-- Crear tabla de plantillas de extracción
CREATE TABLE IF NOT EXISTS extraction_templates (
    template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    document_type VARCHAR(50) NOT NULL,
    supplier_id UUID REFERENCES suppliers(supplier_id),
    customer_id UUID REFERENCES customers(customer_id),
    extraction_rules JSONB NOT NULL,
    confidence_threshold DECIMAL(3, 2) DEFAULT 0.80,
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5, 2) DEFAULT 0,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(user_id)
);

-- Crear tabla de webhooks
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event VARCHAR(100) NOT NULL,
    source VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'received',
    payload JSONB NOT NULL,
    response JSONB,
    error TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

-- Crear tabla de configuración del sistema
CREATE TABLE IF NOT EXISTS system_configuration (
    id INTEGER PRIMARY KEY DEFAULT 1,
    config_data JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices
CREATE INDEX idx_documents_job_id ON documents(job_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_suppliers_nif ON suppliers(nif_cif);
CREATE INDEX idx_customers_nif ON customers(nif_cif);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, read);