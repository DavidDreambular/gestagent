-- GESTAGENT - Migración 003: Corregir longitud del campo nif_cif
-- Corrección para evitar el error "value too long for type character varying(20)"

-- =====================================================
-- AUMENTAR LONGITUD DEL CAMPO nif_cif EN SUPPLIERS
-- =====================================================
ALTER TABLE suppliers 
ALTER COLUMN nif_cif TYPE VARCHAR(50);

-- =====================================================
-- AUMENTAR LONGITUD DEL CAMPO nif_cif EN CUSTOMERS
-- =====================================================
ALTER TABLE customers 
ALTER COLUMN nif_cif TYPE VARCHAR(50);

-- =====================================================
-- COMENTARIOS para documentar el cambio
-- =====================================================
COMMENT ON COLUMN suppliers.nif_cif IS 'Identificador fiscal único - aumentado a 50 caracteres para NIFs complejos';
COMMENT ON COLUMN customers.nif_cif IS 'Identificador fiscal único - aumentado a 50 caracteres para NIFs complejos';

-- =====================================================
-- APLICAR MIGRACIÓN
-- =====================================================
INSERT INTO migrations (name) 
VALUES ('003_fix_nif_cif_length')
ON CONFLICT (name) DO NOTHING; 