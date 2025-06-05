-- GESTAGENT - Migración 002: Agregar columnas faltantes
-- Agregar columnas que faltan en el esquema para evitar errores

-- =====================================================
-- COLUMNAS FALTANTES EN TABLA: suppliers
-- =====================================================
ALTER TABLE suppliers 
ADD COLUMN IF NOT EXISTS last_updated_from_document UUID;

-- =====================================================
-- COLUMNAS FALTANTES EN TABLA: customers  
-- =====================================================
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS last_updated_from_document UUID;

-- =====================================================
-- COLUMNAS FALTANTES EN TABLA: documents
-- =====================================================
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS processing_metadata JSONB DEFAULT '{}';

-- =====================================================
-- ÍNDICES para las nuevas columnas
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_suppliers_last_updated_doc ON suppliers(last_updated_from_document);
CREATE INDEX IF NOT EXISTS idx_customers_last_updated_doc ON customers(last_updated_from_document);
CREATE INDEX IF NOT EXISTS idx_documents_processing_metadata ON documents USING GIN(processing_metadata);

-- =====================================================
-- COMENTARIOS para documentar las columnas
-- =====================================================
COMMENT ON COLUMN suppliers.last_updated_from_document IS 'UUID del último documento que actualizó este proveedor';
COMMENT ON COLUMN customers.last_updated_from_document IS 'UUID del último documento que actualizó este cliente';
COMMENT ON COLUMN documents.processing_metadata IS 'Metadatos del procesamiento incluyendo tiempos, confianza, etc.'; 