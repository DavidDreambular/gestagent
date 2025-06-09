-- =====================================================================================
-- MIGRACIÓN: Sistema de Auditoría para PostgreSQL
-- Descripción: Crear tabla audit_logs para registrar todas las acciones del sistema
-- Fecha: 2024
-- =====================================================================================

-- Crear tabla audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Campos adicionales para contexto
    session_id VARCHAR(255),
    request_id VARCHAR(255),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type_id ON audit_logs(entity_type, entity_id);

-- Índices compuestos para consultas comunes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON audit_logs(user_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_created ON audit_logs(entity_type, created_at DESC);

-- Función para automatizar la inserción de audit logs
CREATE OR REPLACE FUNCTION log_audit_action(
    p_user_id UUID,
    p_action VARCHAR(50),
    p_entity_type VARCHAR(50),
    p_entity_id VARCHAR(255) DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_session_id VARCHAR(255) DEFAULT NULL,
    p_request_id VARCHAR(255) DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
    audit_id UUID;
BEGIN
    INSERT INTO audit_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        old_values,
        new_values,
        ip_address,
        user_agent,
        session_id,
        request_id,
        metadata,
        created_at
    ) VALUES (
        p_user_id,
        p_action,
        p_entity_type,
        p_entity_id,
        p_old_values,
        p_new_values,
        p_ip_address,
        p_user_agent,
        p_session_id,
        p_request_id,
        p_metadata,
        NOW()
    ) RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger function para auditar cambios automáticamente
CREATE OR REPLACE FUNCTION trigger_audit_log() RETURNS TRIGGER AS $$
DECLARE
    audit_action VARCHAR(50);
    old_record JSONB;
    new_record JSONB;
    current_user_id UUID;
BEGIN
    -- Determinar la acción
    IF TG_OP = 'INSERT' THEN
        audit_action := 'CREATE';
        old_record := NULL;
        new_record := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        audit_action := 'UPDATE';
        old_record := to_jsonb(OLD);
        new_record := to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        audit_action := 'DELETE';
        old_record := to_jsonb(OLD);
        new_record := NULL;
    END IF;
    
    -- Usar un ID de usuario de contexto o NULL
    -- En PostgreSQL no tenemos auth.uid(), así que usaremos el contexto de la aplicación
    current_user_id := current_setting('audit.user_id', true)::UUID;
    
    -- Solo registrar si tenemos un user_id válido
    IF current_user_id IS NOT NULL THEN
        PERFORM log_audit_action(
            current_user_id,
            audit_action,
            TG_TABLE_NAME,
            COALESCE(NEW.id::text, OLD.id::text),
            old_record,
            new_record
        );
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- No fallar si hay error en auditoría
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        ELSE
            RETURN NEW;
        END IF;
END;
$$ LANGUAGE plpgsql;

-- Comentarios para documentación
COMMENT ON TABLE audit_logs IS 'Registro de auditoría de todas las acciones del sistema';
COMMENT ON COLUMN audit_logs.user_id IS 'ID del usuario que realizó la acción';
COMMENT ON COLUMN audit_logs.action IS 'Tipo de acción: CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, etc.';
COMMENT ON COLUMN audit_logs.entity_type IS 'Tipo de entidad afectada: documents, users, suppliers, etc.';
COMMENT ON COLUMN audit_logs.entity_id IS 'ID de la entidad específica afectada';
COMMENT ON COLUMN audit_logs.old_values IS 'Valores anteriores (para UPDATE y DELETE)';
COMMENT ON COLUMN audit_logs.new_values IS 'Valores nuevos (para CREATE y UPDATE)';
COMMENT ON COLUMN audit_logs.ip_address IS 'Dirección IP del cliente';
COMMENT ON COLUMN audit_logs.user_agent IS 'User Agent del navegador';
COMMENT ON COLUMN audit_logs.session_id IS 'ID de sesión para agrupar acciones relacionadas';
COMMENT ON COLUMN audit_logs.request_id IS 'ID único de la request HTTP';
COMMENT ON COLUMN audit_logs.metadata IS 'Información adicional en formato JSON';

-- Vista para consultas comunes de auditoría
CREATE OR REPLACE VIEW audit_logs_view AS
SELECT 
    al.id,
    al.user_id,
    u.username,
    u.email,
    al.action,
    al.entity_type,
    al.entity_id,
    al.old_values,
    al.new_values,
    al.ip_address,
    al.user_agent,
    al.session_id,
    al.request_id,
    al.metadata,
    al.created_at,
    -- Campos calculados
    CASE 
        WHEN al.action = 'CREATE' THEN 'Creación'
        WHEN al.action = 'UPDATE' THEN 'Actualización'
        WHEN al.action = 'DELETE' THEN 'Eliminación'
        WHEN al.action = 'LOGIN' THEN 'Inicio de sesión'
        WHEN al.action = 'LOGOUT' THEN 'Cierre de sesión'
        ELSE al.action
    END as action_display,
    CASE 
        WHEN al.entity_type = 'documents' THEN 'Documentos'
        WHEN al.entity_type = 'users' THEN 'Usuarios'
        WHEN al.entity_type = 'suppliers' THEN 'Proveedores'
        WHEN al.entity_type = 'customers' THEN 'Clientes'
        ELSE al.entity_type
    END as entity_type_display
FROM audit_logs al
LEFT JOIN users u ON al.user_id = u.user_id
ORDER BY al.created_at DESC;

-- Función para limpiar logs antiguos (ejecutar periódicamente)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(retention_days INTEGER DEFAULT 365) RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM audit_logs 
    WHERE created_at < NOW() - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- INSTRUCCIONES DE USO:
-- =====================================================================================
-- 
-- 1. Para registrar manualmente una acción desde la aplicación:
--    SELECT log_audit_action(
--        'user-uuid-here'::UUID,      -- user_id
--        'CREATE',                    -- action
--        'documents',                 -- entity_type
--        'doc_12345',                -- entity_id
--        NULL,                        -- old_values
--        '{"name": "test.pdf"}'::jsonb, -- new_values
--        '192.168.1.1'::inet,        -- ip_address
--        'Mozilla/5.0...',           -- user_agent
--        'sess_123',                 -- session_id
--        'req_456',                  -- request_id
--        '{"source": "api"}'::jsonb  -- metadata
--    );
--
-- 2. Para activar auditoría automática en una tabla:
--    CREATE TRIGGER audit_trigger_[table_name]
--    AFTER INSERT OR UPDATE OR DELETE ON [table_name]
--    FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();
--
-- 3. Para consultar logs:
--    SELECT * FROM audit_logs_view WHERE user_id = 'user-uuid';
--
-- 4. Para limpiar logs antiguos (ejecutar como cron job):
--    SELECT cleanup_old_audit_logs(365); -- mantener 1 año
-- =====================================================================================

-- Mensaje de éxito
DO $$
BEGIN
    RAISE NOTICE 'Tabla audit_logs creada exitosamente con índices y funciones';
END $$; 