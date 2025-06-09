-- Crear tabla para notificaciones de proveedores
-- Fecha: 2024-01-20
-- Descripción: Sistema de notificaciones para informar a proveedores sobre el estado de sus documentos

-- Crear tabla de notificaciones
CREATE TABLE IF NOT EXISTS provider_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(supplier_id) ON DELETE CASCADE,
    document_id VARCHAR(255), -- job_id del documento relacionado
    type VARCHAR(50) NOT NULL CHECK (type IN ('document_received', 'document_validated', 'document_error', 'information_required')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ NULL,
    
    -- Índices para optimizar consultas
    CONSTRAINT valid_notification_type CHECK (type IN ('document_received', 'document_validated', 'document_error', 'information_required'))
);

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_provider_notifications_supplier_id ON provider_notifications(supplier_id);
CREATE INDEX IF NOT EXISTS idx_provider_notifications_document_id ON provider_notifications(document_id);
CREATE INDEX IF NOT EXISTS idx_provider_notifications_type ON provider_notifications(type);
CREATE INDEX IF NOT EXISTS idx_provider_notifications_created_at ON provider_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_provider_notifications_read_at ON provider_notifications(read_at) WHERE read_at IS NULL;

-- Agregar comentarios a la tabla y columnas
COMMENT ON TABLE provider_notifications IS 'Notificaciones enviadas a proveedores sobre el estado de sus documentos';
COMMENT ON COLUMN provider_notifications.supplier_id IS 'ID del proveedor que recibe la notificación';
COMMENT ON COLUMN provider_notifications.document_id IS 'job_id del documento relacionado con la notificación';
COMMENT ON COLUMN provider_notifications.type IS 'Tipo de notificación: document_received, document_validated, document_error, information_required';
COMMENT ON COLUMN provider_notifications.title IS 'Título de la notificación';
COMMENT ON COLUMN provider_notifications.message IS 'Mensaje de la notificación';
COMMENT ON COLUMN provider_notifications.metadata IS 'Información adicional en formato JSON';
COMMENT ON COLUMN provider_notifications.created_at IS 'Fecha y hora de creación de la notificación';
COMMENT ON COLUMN provider_notifications.read_at IS 'Fecha y hora en que fue leída la notificación (NULL si no ha sido leída)';

-- Función para limpiar notificaciones antiguas (opcional, ejecutar manualmente)
CREATE OR REPLACE FUNCTION clean_old_provider_notifications(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM provider_notifications 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION clean_old_provider_notifications IS 'Elimina notificaciones más antiguas que el número de días especificado (por defecto 90 días)';

-- Insertar datos de ejemplo para testing
INSERT INTO provider_notifications (supplier_id, document_id, type, title, message, metadata) 
SELECT 
    s.supplier_id,
    'DOC-' || gen_random_uuid()::text,
    'document_received',
    'Documento recibido correctamente',
    'Su factura ha sido recibida y está siendo procesada.',
    jsonb_build_object(
        'documentName', 'Factura #' || (1000 + (random() * 1000)::int),
        'documentNumber', 'FAC-' || (random() * 10000)::int,
        'receivedDate', NOW()::date
    )
FROM suppliers s 
WHERE s.status = 'active'
LIMIT 3;

INSERT INTO provider_notifications (supplier_id, document_id, type, title, message, metadata) 
SELECT 
    s.supplier_id,
    'DOC-' || gen_random_uuid()::text,
    'document_validated',
    'Documento validado',
    'Su factura ha sido validada correctamente y procesada en el sistema.',
    jsonb_build_object(
        'documentName', 'Factura #' || (2000 + (random() * 1000)::int),
        'documentNumber', 'FAC-' || (random() * 10000)::int,
        'validatedDate', NOW()::date
    )
FROM suppliers s 
WHERE s.status = 'active'
LIMIT 2;

-- Log de migración
INSERT INTO migrations (name, applied_at) 
VALUES ('006_create_provider_notifications', NOW())
ON CONFLICT (name) DO NOTHING; 