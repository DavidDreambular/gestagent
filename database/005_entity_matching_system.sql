-- GESTAGENT - Migración 005: Sistema de Entity Matching
-- Tablas y campos adicionales para el sistema de vinculación automática
-- de facturas con proveedores y clientes registrados

-- =====================================================
-- AGREGAR CAMPOS A TABLA DOCUMENTS
-- =====================================================

-- Campos para tracking de matching automático
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS supplier_match_confidence INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS customer_match_confidence INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS auto_created_supplier BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS auto_created_customer BOOLEAN DEFAULT FALSE;

-- =====================================================
-- TABLA: entity_matching_logs
-- =====================================================
-- Log completo de todas las decisiones de matching automático

CREATE TABLE IF NOT EXISTS entity_matching_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES documents(job_id) ON DELETE CASCADE,
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('supplier', 'customer')),
    entity_id UUID, -- Puede ser NULL si no se encontró match
    match_method VARCHAR(50) NOT NULL CHECK (match_method IN ('nif_exact', 'name_fuzzy', 'auto_created', 'manual', 'none')),
    confidence INTEGER NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 100),
    created_new BOOLEAN DEFAULT FALSE,
    invoice_data JSONB DEFAULT '{}', -- Datos originales de la factura
    reasoning TEXT, -- Explicación del matching
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: entity_matching_conflicts
-- =====================================================
-- Para casos donde el matching automático no es claro

CREATE TABLE IF NOT EXISTS entity_matching_conflicts (
    conflict_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES documents(job_id) ON DELETE CASCADE,
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('supplier', 'customer')),
    invoice_data JSONB NOT NULL,
    candidate_entities JSONB DEFAULT '[]', -- Array de posibles matches con scores
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'ignored')),
    resolved_entity_id UUID,
    resolved_by_user UUID REFERENCES users(user_id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

-- =====================================================
-- ÍNDICES para optimización
-- =====================================================

-- Índices para entity_matching_logs
CREATE INDEX IF NOT EXISTS idx_entity_logs_job_id ON entity_matching_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_entity_logs_entity_type ON entity_matching_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_entity_logs_entity_id ON entity_matching_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_logs_method ON entity_matching_logs(match_method);
CREATE INDEX IF NOT EXISTS idx_entity_logs_confidence ON entity_matching_logs(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_entity_logs_created_at ON entity_matching_logs(created_at DESC);

-- Índices para entity_matching_conflicts
CREATE INDEX IF NOT EXISTS idx_entity_conflicts_job_id ON entity_matching_conflicts(job_id);
CREATE INDEX IF NOT EXISTS idx_entity_conflicts_status ON entity_matching_conflicts(status);
CREATE INDEX IF NOT EXISTS idx_entity_conflicts_created_at ON entity_matching_conflicts(created_at DESC);

-- Índices para documents (nuevos campos)
CREATE INDEX IF NOT EXISTS idx_documents_supplier_confidence ON documents(supplier_match_confidence DESC);
CREATE INDEX IF NOT EXISTS idx_documents_customer_confidence ON documents(customer_match_confidence DESC);
CREATE INDEX IF NOT EXISTS idx_documents_auto_created ON documents(auto_created_supplier, auto_created_customer);

-- =====================================================
-- VISTAS para análisis de matching
-- =====================================================

-- Vista de estadísticas de matching por método
CREATE OR REPLACE VIEW matching_statistics AS
SELECT 
    entity_type,
    match_method,
    COUNT(*) as total_matches,
    AVG(confidence) as avg_confidence,
    COUNT(CASE WHEN created_new THEN 1 END) as new_entities_created,
    COUNT(CASE WHEN confidence >= 95 THEN 1 END) as high_confidence,
    COUNT(CASE WHEN confidence BETWEEN 80 AND 94 THEN 1 END) as medium_confidence,
    COUNT(CASE WHEN confidence < 80 THEN 1 END) as low_confidence
FROM entity_matching_logs
WHERE match_method != 'none'
GROUP BY entity_type, match_method
ORDER BY entity_type, total_matches DESC;

-- Vista de documentos con información de matching
CREATE OR REPLACE VIEW documents_matching_info AS
SELECT 
    d.job_id,
    d.document_type,
    d.status,
    d.upload_timestamp,
    d.emitter_name,
    d.receiver_name,
    d.supplier_id,
    d.customer_id,
    d.supplier_match_confidence,
    d.customer_match_confidence,
    d.auto_created_supplier,
    d.auto_created_customer,
    
    -- Información del proveedor vinculado
    s.name as supplier_name,
    s.nif_cif as supplier_nif,
    s.status as supplier_status,
    
    -- Información del cliente vinculado
    c.name as customer_name,
    c.nif_cif as customer_nif,
    c.status as customer_status,
    
    -- Estadísticas de matching
    CASE 
        WHEN d.supplier_id IS NOT NULL AND d.customer_id IS NOT NULL THEN 'both_linked'
        WHEN d.supplier_id IS NOT NULL THEN 'supplier_only'
        WHEN d.customer_id IS NOT NULL THEN 'customer_only'
        ELSE 'unlinked'
    END as linking_status,
    
    CASE 
        WHEN d.supplier_match_confidence >= 95 OR d.customer_match_confidence >= 95 THEN 'high'
        WHEN d.supplier_match_confidence >= 80 OR d.customer_match_confidence >= 80 THEN 'medium'
        WHEN d.supplier_match_confidence > 0 OR d.customer_match_confidence > 0 THEN 'low'
        ELSE 'none'
    END as confidence_level

FROM documents d
LEFT JOIN suppliers s ON d.supplier_id = s.supplier_id
LEFT JOIN customers c ON d.customer_id = c.customer_id;

-- =====================================================
-- FUNCIONES para análisis de calidad del matching
-- =====================================================

-- Función para obtener estadísticas globales de matching
CREATE OR REPLACE FUNCTION get_matching_quality_stats()
RETURNS TABLE (
    metric_name VARCHAR,
    metric_value NUMERIC,
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT 
            COUNT(*) as total_docs,
            COUNT(CASE WHEN supplier_id IS NOT NULL OR customer_id IS NOT NULL THEN 1 END) as linked_docs,
            COUNT(CASE WHEN supplier_id IS NOT NULL AND customer_id IS NOT NULL THEN 1 END) as fully_linked,
            COUNT(CASE WHEN auto_created_supplier OR auto_created_customer THEN 1 END) as auto_created,
            AVG(COALESCE(supplier_match_confidence, 0)) as avg_supplier_conf,
            AVG(COALESCE(customer_match_confidence, 0)) as avg_customer_conf
        FROM documents 
        WHERE status = 'completed'
    )
    SELECT 
        'total_documents'::VARCHAR, 
        total_docs::NUMERIC, 
        'Total de documentos procesados'::TEXT
    FROM stats
    
    UNION ALL
    
    SELECT 
        'linking_rate'::VARCHAR, 
        ROUND((linked_docs::NUMERIC / NULLIF(total_docs, 0)) * 100, 2), 
        'Porcentaje de documentos vinculados'::TEXT
    FROM stats
    
    UNION ALL
    
    SELECT 
        'full_linking_rate'::VARCHAR, 
        ROUND((fully_linked::NUMERIC / NULLIF(total_docs, 0)) * 100, 2), 
        'Porcentaje con proveedor Y cliente vinculados'::TEXT
    FROM stats
    
    UNION ALL
    
    SELECT 
        'auto_creation_rate'::VARCHAR, 
        ROUND((auto_created::NUMERIC / NULLIF(total_docs, 0)) * 100, 2), 
        'Porcentaje con entidades auto-creadas'::TEXT
    FROM stats
    
    UNION ALL
    
    SELECT 
        'avg_supplier_confidence'::VARCHAR, 
        ROUND(avg_supplier_conf, 1), 
        'Confianza promedio matching proveedores'::TEXT
    FROM stats
    
    UNION ALL
    
    SELECT 
        'avg_customer_confidence'::VARCHAR, 
        ROUND(avg_customer_conf, 1), 
        'Confianza promedio matching clientes'::TEXT
    FROM stats;
    
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCIÓN para re-procesar documentos sin vínculos
-- =====================================================

-- Función para identificar documentos que necesitan re-procesamiento
CREATE OR REPLACE FUNCTION get_documents_needing_reprocessing(limit_count INTEGER DEFAULT 100)
RETURNS TABLE (
    job_id UUID,
    document_type VARCHAR,
    upload_timestamp TIMESTAMP WITH TIME ZONE,
    emitter_name VARCHAR,
    receiver_name VARCHAR,
    has_processed_json BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.job_id,
        d.document_type,
        d.upload_timestamp,
        d.emitter_name,
        d.receiver_name,
        (d.processed_json IS NOT NULL AND d.processed_json != '{}') as has_processed_json
    FROM documents d
    WHERE d.status = 'completed'
      AND d.supplier_id IS NULL 
      AND d.customer_id IS NULL
      AND (d.processed_json IS NOT NULL AND d.processed_json != '{}')
    ORDER BY d.upload_timestamp DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS actualizados para el nuevo sistema
-- =====================================================

-- Función para logging automático cuando se actualizan vínculos
CREATE OR REPLACE FUNCTION log_entity_linking_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo logear cuando hay cambios en los vínculos de entidades
    IF (OLD.supplier_id IS DISTINCT FROM NEW.supplier_id) OR 
       (OLD.customer_id IS DISTINCT FROM NEW.customer_id) THEN
        
        INSERT INTO entity_matching_logs (
            job_id, entity_type, entity_id, match_method, confidence, 
            created_new, reasoning, created_at
        ) VALUES (
            NEW.job_id, 
            'system_update', 
            COALESCE(NEW.supplier_id, NEW.customer_id), 
            'manual', 
            GREATEST(COALESCE(NEW.supplier_match_confidence, 0), COALESCE(NEW.customer_match_confidence, 0)),
            false,
            'Actualización manual de vínculos de entidades',
            NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para logging de cambios
DROP TRIGGER IF EXISTS trg_log_entity_linking_changes ON documents;
CREATE TRIGGER trg_log_entity_linking_changes
    AFTER UPDATE ON documents
    FOR EACH ROW
    WHEN (OLD.supplier_id IS DISTINCT FROM NEW.supplier_id OR OLD.customer_id IS DISTINCT FROM NEW.customer_id)
    EXECUTE FUNCTION log_entity_linking_changes();

-- =====================================================
-- DATOS DE PRUEBA Y CONFIGURACIÓN
-- =====================================================

-- Configurar valores por defecto para matching
INSERT INTO public.system_config (key, value, description) VALUES 
    ('entity_matching_nif_threshold', '100', 'Umbral de confianza para matching por NIF (siempre 100%)'),
    ('entity_matching_name_threshold', '85', 'Umbral mínimo de similitud para matching por nombre'),
    ('entity_matching_auto_create', 'true', 'Permitir auto-creación de entidades nuevas'),
    ('entity_matching_max_candidates', '10', 'Máximo número de candidatos a evaluar por nombre')
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = NOW();

-- =====================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

COMMENT ON TABLE entity_matching_logs IS 'Log completo de todas las decisiones de matching automático entre facturas y entidades';
COMMENT ON TABLE entity_matching_conflicts IS 'Casos donde el matching automático requiere intervención manual';

COMMENT ON COLUMN documents.supplier_match_confidence IS 'Confianza del matching automático con proveedor (0-100)';
COMMENT ON COLUMN documents.customer_match_confidence IS 'Confianza del matching automático con cliente (0-100)';
COMMENT ON COLUMN documents.auto_created_supplier IS 'Indica si el proveedor fue creado automáticamente';
COMMENT ON COLUMN documents.auto_created_customer IS 'Indica si el cliente fue creado automáticamente';

COMMENT ON FUNCTION get_matching_quality_stats() IS 'Obtiene métricas de calidad del sistema de matching automático';
COMMENT ON FUNCTION get_documents_needing_reprocessing(INTEGER) IS 'Identifica documentos que necesitan re-procesamiento de matching';