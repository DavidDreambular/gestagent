-- Schema completo para Customers y Suppliers
-- Ejecutar en Supabase SQL Editor

-- =======================
-- TABLA: CUSTOMERS
-- =======================
CREATE TABLE IF NOT EXISTS customers (
    customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    commercial_name VARCHAR(255),
    nif_cif VARCHAR(20) UNIQUE NOT NULL,
    address TEXT,
    postal_code VARCHAR(10),
    city VARCHAR(100),
    province VARCHAR(100),
    country VARCHAR(100) DEFAULT 'España',
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    customer_type VARCHAR(50) DEFAULT 'company' CHECK (customer_type IN ('company', 'individual', 'freelancer', 'public')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    payment_terms INTEGER DEFAULT 30, -- días
    preferred_language VARCHAR(10) DEFAULT 'es',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =======================
-- TABLA: SUPPLIERS
-- =======================
CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    commercial_name VARCHAR(255),
    nif_cif VARCHAR(20) UNIQUE NOT NULL,
    address TEXT,
    postal_code VARCHAR(10),
    city VARCHAR(100),
    province VARCHAR(100),
    country VARCHAR(100) DEFAULT 'España',
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    business_sector VARCHAR(100),
    company_size VARCHAR(20) DEFAULT 'pequeña' CHECK (company_size IN ('pequeña', 'mediana', 'grande')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    payment_terms INTEGER DEFAULT 30, -- días
    preferred_language VARCHAR(10) DEFAULT 'es',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =======================
-- ACTUALIZAR TABLA DOCUMENTS PARA FOREIGN KEYS
-- =======================
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(customer_id),
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(supplier_id);

-- =======================
-- VISTA: CUSTOMERS_WITH_STATS
-- =======================
CREATE OR REPLACE VIEW customers_with_stats AS
SELECT 
    c.*,
    COALESCE(stats.total_invoices, 0) as total_invoices,
    COALESCE(stats.total_amount, 0) as total_amount,
    stats.last_invoice_date,
    CASE 
        WHEN stats.last_invoice_date > NOW() - INTERVAL '30 days' THEN 'reciente'
        WHEN stats.last_invoice_date > NOW() - INTERVAL '90 days' THEN 'activo'
        ELSE 'inactivo'
    END as activity_status,
    CASE 
        WHEN COALESCE(stats.total_amount, 0) > 50000 THEN 'alto'
        WHEN COALESCE(stats.total_amount, 0) > 10000 THEN 'medio'
        ELSE 'bajo'
    END as volume_category
FROM customers c
LEFT JOIN (
    SELECT 
        customer_id,
        COUNT(*) as total_invoices,
        SUM(total_amount) as total_amount,
        MAX(document_date) as last_invoice_date
    FROM documents 
    WHERE customer_id IS NOT NULL 
    AND status = 'completed'
    GROUP BY customer_id
) stats ON c.customer_id = stats.customer_id;

-- =======================
-- VISTA: SUPPLIERS_WITH_STATS
-- =======================
CREATE OR REPLACE VIEW suppliers_with_stats AS
SELECT 
    s.*,
    COALESCE(stats.total_invoices, 0) as total_invoices,
    COALESCE(stats.total_amount, 0) as total_amount,
    stats.last_invoice_date,
    CASE 
        WHEN stats.last_invoice_date > NOW() - INTERVAL '30 days' THEN 'reciente'
        WHEN stats.last_invoice_date > NOW() - INTERVAL '90 days' THEN 'activo'
        ELSE 'inactivo'
    END as activity_status,
    CASE 
        WHEN COALESCE(stats.total_amount, 0) > 50000 THEN 'alto'
        WHEN COALESCE(stats.total_amount, 0) > 10000 THEN 'medio'
        ELSE 'bajo'
    END as volume_category
FROM suppliers s
LEFT JOIN (
    SELECT 
        supplier_id,
        COUNT(*) as total_invoices,
        SUM(total_amount) as total_amount,
        MAX(document_date) as last_invoice_date
    FROM documents 
    WHERE supplier_id IS NOT NULL 
    AND status = 'completed'
    GROUP BY supplier_id
) stats ON s.supplier_id = stats.supplier_id;

-- =======================
-- DATOS DE EJEMPLO PARA TESTING
-- =======================

-- Insertar customers de ejemplo
INSERT INTO customers (name, nif_cif, address, city, province, customer_type, status, phone, email) VALUES
('Empresa Cliente Principal S.A.', 'A98765432', 'Gran Vía 123', 'Madrid', 'Madrid', 'company', 'active', '+34 91 123 4567', 'contacto@clienteprincipal.es'),
('Juan Pérez García', '12345678Z', 'Calle Valencia 45', 'Barcelona', 'Barcelona', 'individual', 'active', '+34 93 234 5678', 'juan.perez@email.com'),
('Freelancer Digital María L.', '87654321X', 'Avenida Libertad 78', 'Valencia', 'Valencia', 'freelancer', 'active', '+34 96 345 6789', 'maria.freelancer@email.com'),
('Ayuntamiento de Sevilla', 'P4100000A', 'Plaza Nueva 1', 'Sevilla', 'Sevilla', 'public', 'active', '+34 95 456 7890', 'contacto@sevilla.es'),
('Startup Innovadora Tech SL', 'B12345678', 'Calle Tecnología 200', 'Bilbao', 'Vizcaya', 'company', 'active', '+34 94 567 8901', 'info@startuptech.es'),
('Consultora de Gestión S.L.', 'A87654321', 'Paseo de la Reforma 156', 'Málaga', 'Málaga', 'company', 'active', '+34 95 678 9012', 'contacto@consultorags.es')
ON CONFLICT (nif_cif) DO NOTHING;

-- Insertar suppliers de ejemplo
INSERT INTO suppliers (name, nif_cif, address, city, province, business_sector, company_size, status, phone, email) VALUES
('SERVICIOS Y APLICACIONES TÉCNICAS PARA ELIMINACIÓN DE RESIDUOS, S.L.', 'A12345678', 'Calle Innovación 123', 'Madrid', 'Madrid', 'Servicios Medioambientales', 'mediana', 'active', '+34 91 789 0123', 'info@satres.es'),
('ENERGY DIAGONAL S.L.', 'B87654321', 'Avenida Desarrollo 456', 'Barcelona', 'Barcelona', 'Energía', 'pequeña', 'active', '+34 93 890 1234', 'contacto@energydiagonal.es'),
('TECHNO SOLUTIONS MADRID S.A.', 'A11111111', 'Plaza Tecnología 789', 'Madrid', 'Madrid', 'Tecnología', 'grande', 'active', '+34 91 901 2345', 'ventas@technosolutions.es'),
('DISTRIBUIDORA VALENCIA S.L.', 'B22222222', 'Calle Comercio 321', 'Valencia', 'Valencia', 'Distribución', 'mediana', 'active', '+34 96 012 3456', 'pedidos@distribuidoravlc.es'),
('CONSULTORÍA INTEGRAL SEVILLA', 'A33333333', 'Avenida Consultoría 654', 'Sevilla', 'Sevilla', 'Consultoría', 'pequeña', 'active', '+34 95 123 4567', 'info@consultoriasevilla.es'),
('DISA PENINSULA S.L.U.', 'B98765432', 'Calle Industrial 987', 'Bilbao', 'Vizcaya', 'Industrial', 'grande', 'active', '+34 94 234 5678', 'contacto@disapeninsula.es')
ON CONFLICT (nif_cif) DO NOTHING;

-- =======================
-- FUNCIÓN PARA ACTUALIZAR updated_at AUTOMÁTICAMENTE
-- =======================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =======================
-- ÍNDICES PARA PERFORMANCE
-- =======================
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers (name);
CREATE INDEX IF NOT EXISTS idx_customers_nif_cif ON customers (nif_cif);
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers (customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers (status);
CREATE INDEX IF NOT EXISTS idx_customers_city ON customers (city);

CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers (name);
CREATE INDEX IF NOT EXISTS idx_suppliers_nif_cif ON suppliers (nif_cif);
CREATE INDEX IF NOT EXISTS idx_suppliers_business_sector ON suppliers (business_sector);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers (status);
CREATE INDEX IF NOT EXISTS idx_suppliers_city ON suppliers (city);

-- Índices para foreign keys en documents
CREATE INDEX IF NOT EXISTS idx_documents_customer_id ON documents (customer_id);
CREATE INDEX IF NOT EXISTS idx_documents_supplier_id ON documents (supplier_id);

-- =======================
-- ROW LEVEL SECURITY (RLS)
-- =======================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Políticas para customers
CREATE POLICY "Users can view all customers" ON customers
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert customers" ON customers
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update customers" ON customers
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Políticas para suppliers
CREATE POLICY "Users can view all suppliers" ON suppliers
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert suppliers" ON suppliers
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update suppliers" ON suppliers
    FOR UPDATE USING (auth.role() = 'authenticated');

-- =======================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- =======================
COMMENT ON TABLE customers IS 'Tabla principal de clientes de la gestoría';
COMMENT ON TABLE suppliers IS 'Tabla principal de proveedores de la gestoría';
COMMENT ON VIEW customers_with_stats IS 'Vista de clientes con estadísticas de facturación';
COMMENT ON VIEW suppliers_with_stats IS 'Vista de proveedores con estadísticas de facturación';

COMMENT ON COLUMN customers.customer_type IS 'Tipo de cliente: company, individual, freelancer, public';
COMMENT ON COLUMN suppliers.business_sector IS 'Sector empresarial del proveedor';
COMMENT ON COLUMN suppliers.company_size IS 'Tamaño de empresa: pequeña, mediana, grande'; 