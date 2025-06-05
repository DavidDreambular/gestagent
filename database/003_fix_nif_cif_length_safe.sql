-- GESTAGENT - Migración 003: Corregir longitud del campo nif_cif (SEGURA)
-- Corrección para evitar el error "value too long for type character varying(20)"
-- Maneja vistas dependientes correctamente

BEGIN;

-- =====================================================
-- PASO 1: Guardar definiciones de vistas existentes
-- =====================================================

-- Guardar definición de suppliers_with_stats
CREATE TEMP TABLE temp_view_suppliers_with_stats AS
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
FROM suppliers s
LIMIT 0; -- Solo estructura, no datos

-- Guardar definición de customers_with_stats si existe
CREATE TEMP TABLE temp_view_customers_with_stats AS
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
FROM customers c
LIMIT 0; -- Solo estructura, no datos

-- =====================================================
-- PASO 2: Eliminar vistas dependientes
-- =====================================================

DROP VIEW IF EXISTS suppliers_with_stats CASCADE;
DROP VIEW IF EXISTS customers_with_stats CASCADE;

-- =====================================================
-- PASO 3: Cambiar tipo de columnas
-- =====================================================

-- Aumentar longitud del campo nif_cif en suppliers
ALTER TABLE suppliers 
ALTER COLUMN nif_cif TYPE VARCHAR(50);

-- Aumentar longitud del campo nif_cif en customers
ALTER TABLE customers 
ALTER COLUMN nif_cif TYPE VARCHAR(50);

-- =====================================================
-- PASO 4: Recrear vistas con nuevas definiciones
-- =====================================================

-- Recrear vista suppliers_with_stats
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

-- Recrear vista customers_with_stats
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
-- PASO 5: Actualizar índices si es necesario
-- =====================================================

-- Recrear índices en caso de que hayan sido afectados
CREATE INDEX IF NOT EXISTS idx_suppliers_nif_cif ON suppliers(nif_cif);
CREATE INDEX IF NOT EXISTS idx_customers_nif_cif ON customers(nif_cif);

-- =====================================================
-- PASO 6: Comentarios y documentación
-- =====================================================

COMMENT ON COLUMN suppliers.nif_cif IS 'Identificador fiscal único - ampliado a 50 caracteres para NIFs complejos';
COMMENT ON COLUMN customers.nif_cif IS 'Identificador fiscal único - ampliado a 50 caracteres para NIFs complejos';

-- =====================================================
-- PASO 7: Registrar migración
-- =====================================================

INSERT INTO migrations (name) 
VALUES ('003_fix_nif_cif_length_safe')
ON CONFLICT (name) DO NOTHING;

COMMIT;

-- =====================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- =====================================================

-- Verificar que las columnas tienen el nuevo tipo
SELECT 
    table_name, 
    column_name, 
    data_type, 
    character_maximum_length 
FROM information_schema.columns 
WHERE table_name IN ('suppliers', 'customers') 
  AND column_name = 'nif_cif';

-- Verificar que las vistas existen
SELECT viewname FROM pg_views WHERE viewname LIKE '%_with_stats';

-- Mensaje de confirmación
SELECT 'Migración 003 completada exitosamente. Columnas nif_cif ampliadas a VARCHAR(50)' as status; 