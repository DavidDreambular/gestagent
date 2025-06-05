-- Migración segura para expandir campos de proveedores y clientes
-- Ejecutar en Supabase SQL Editor

BEGIN;

-- Paso 1: Eliminar vistas dependientes
DROP VIEW IF EXISTS suppliers_with_stats CASCADE;
DROP VIEW IF EXISTS customers_with_stats CASCADE;

-- Paso 2: Expandir campos en tabla suppliers
ALTER TABLE suppliers 
  ALTER COLUMN nif_cif TYPE VARCHAR(50),
  ALTER COLUMN name TYPE VARCHAR(200),
  ALTER COLUMN address TYPE TEXT;

-- Paso 3: Expandir campos en tabla customers
ALTER TABLE customers 
  ALTER COLUMN nif_cif TYPE VARCHAR(50),
  ALTER COLUMN name TYPE VARCHAR(200),
  ALTER COLUMN address TYPE TEXT;

-- Paso 4: Recrear vista suppliers_with_stats sin conflictos de columnas
CREATE OR REPLACE VIEW suppliers_with_stats AS
SELECT 
  s.supplier_id,
  s.name,
  s.nif_cif,
  s.address,
  s.phone,
  s.email,
  s.commercial_name,
  s.postal_code,
  s.city,
  s.province,
  s.country,
  s.website,
  s.contact_person,
  s.business_sector,
  s.company_size,
  s.status,
  s.notes,
  s.created_at,
  s.updated_at,
  s.total_invoices as supplier_total_invoices,
  s.total_amount as supplier_total_amount,
  s.last_invoice_date,
  s.first_detected_at,
  s.average_invoice_amount,
  s.invoice_frequency,
  COUNT(d.job_id) as document_count,
  COALESCE(SUM(d.total_amount), 0) as calculated_total_amount
FROM suppliers s
LEFT JOIN documents d ON d.supplier_id = s.supplier_id
GROUP BY s.supplier_id, s.name, s.nif_cif, s.address, s.phone, s.email, s.created_at, s.updated_at, s.commercial_name, s.postal_code, s.city, s.province, s.country, s.website, s.contact_person, s.business_sector, s.company_size, s.status, s.notes, s.total_invoices, s.total_amount, s.last_invoice_date, s.first_detected_at, s.average_invoice_amount, s.invoice_frequency;

-- Paso 5: Recrear vista customers_with_stats sin conflictos de columnas
CREATE OR REPLACE VIEW customers_with_stats AS
SELECT 
  c.customer_id,
  c.name,
  c.nif_cif,
  c.address,
  c.phone,
  c.email,
  c.commercial_name,
  c.postal_code,
  c.city,
  c.province,
  c.country,
  c.website,
  c.contact_person,
  c.customer_type,
  c.status,
  c.notes,
  c.created_at,
  c.updated_at,
  c.total_invoices as customer_total_invoices,
  c.total_amount as customer_total_amount,
  c.last_invoice_date,
  c.first_detected_at,
  c.average_invoice_amount,
  c.invoice_frequency,
  COUNT(d.job_id) as document_count,
  COALESCE(SUM(d.total_amount), 0) as calculated_total_amount
FROM customers c
LEFT JOIN documents d ON d.customer_id = c.customer_id
GROUP BY c.customer_id, c.name, c.nif_cif, c.address, c.phone, c.email, c.created_at, c.updated_at, c.commercial_name, c.postal_code, c.city, c.province, c.country, c.website, c.contact_person, c.customer_type, c.status, c.notes, c.total_invoices, c.total_amount, c.last_invoice_date, c.first_detected_at, c.average_invoice_amount, c.invoice_frequency;

-- Paso 6: Actualizar índices si es necesario
CREATE INDEX IF NOT EXISTS idx_suppliers_nif_cif ON suppliers(nif_cif);
CREATE INDEX IF NOT EXISTS idx_customers_nif_cif ON customers(nif_cif);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

COMMIT;

-- Verificación post-migración
SELECT 
  'suppliers' as table_name,
  column_name, 
  data_type, 
  character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'suppliers' 
  AND column_name IN ('nif_cif', 'name', 'address')
UNION ALL
SELECT 
  'customers' as table_name,
  column_name, 
  data_type, 
  character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'customers' 
  AND column_name IN ('nif_cif', 'name', 'address')
ORDER BY table_name, column_name; 