-- GESTAGENT - Schema SQL para Supabase
-- =====================================
-- Fecha: Diciembre 2024
-- Descripción: Schema completo para el sistema de digitalización de documentos financieros

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Crear enum para roles de usuario
CREATE TYPE user_role AS ENUM ('admin', 'contable', 'gestor', 'operador', 'supervisor');

-- Crear enum para estados de documento
CREATE TYPE document_status AS ENUM ('UPLOADED', 'PROCESSING', 'PROCESSED', 'ERROR');

-- Crear enum para acciones de auditoría
CREATE TYPE audit_action AS ENUM (
  'DOCUMENT_UPLOADED',
  'DOCUMENT_PROCESSED',
  'DOCUMENT_UPDATED',
  'DOCUMENT_DELETED',
  'PROCESSING_STARTED',
  'PROCESSING_COMPLETED',
  'PROCESSING_ERROR',
  'USER_LOGIN',
  'USER_LOGOUT'
);

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role user_role DEFAULT 'operador',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de documentos
CREATE TABLE IF NOT EXISTS documents (
  job_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  document_type VARCHAR(50) NOT NULL,
  raw_text TEXT,
  raw_json JSONB DEFAULT '{}',
  processed_json JSONB DEFAULT '{}',
  upload_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  status document_status DEFAULT 'UPLOADED',
  version INTEGER DEFAULT 1,
  emitter_name VARCHAR(255),
  receiver_name VARCHAR(255),
  document_date DATE,
  title VARCHAR(500),
  file_path VARCHAR(1000),
  confidence_score DECIMAL(3,2),
  processing_strategy VARCHAR(50), -- 'llama-only' o 'mistral-llama'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de logs de auditoría
CREATE TABLE IF NOT EXISTS audit_logs (
  log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(job_id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  action audit_action NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT
);

-- Tabla de migraciones
CREATE TABLE IF NOT EXISTS migrations (
  migration_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) UNIQUE NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  checksum VARCHAR(64)
);

-- Tabla de métricas de procesamiento (para el sistema híbrido)
CREATE TABLE IF NOT EXISTS processing_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES documents(job_id) ON DELETE CASCADE,
  strategy VARCHAR(50) NOT NULL, -- 'llama-only' o 'mistral-llama'
  processing_time_ms INTEGER,
  confidence_score DECIMAL(3,2),
  success BOOLEAN DEFAULT true,
  fallback_used BOOLEAN DEFAULT false,
  document_type VARCHAR(50),
  cost_estimate DECIMAL(10,4),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de notificaciones
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  read BOOLEAN DEFAULT false,
  related_document_id UUID REFERENCES documents(job_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para optimización
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_document_type ON documents(document_type);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX idx_documents_emitter_name ON documents(emitter_name);
CREATE INDEX idx_documents_receiver_name ON documents(receiver_name);

-- Índices GIN para búsquedas en JSONB
CREATE INDEX idx_documents_processed_json ON documents USING GIN (processed_json);
CREATE INDEX idx_documents_raw_json ON documents USING GIN (raw_json);
CREATE INDEX idx_audit_logs_details ON audit_logs USING GIN (details);

-- Índices para auditoría
CREATE INDEX idx_audit_logs_document_id ON audit_logs(document_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- Índices para métricas
CREATE INDEX idx_metrics_job_id ON processing_metrics(job_id);
CREATE INDEX idx_metrics_strategy ON processing_metrics(strategy);
CREATE INDEX idx_metrics_created_at ON processing_metrics(created_at DESC);

-- Índices para notificaciones
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Políticas RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Política para usuarios: pueden ver su propio perfil
CREATE POLICY users_select_own ON users
    FOR SELECT USING (auth.uid() = user_id);

-- Política para documentos: usuarios pueden ver sus propios documentos
CREATE POLICY documents_select_own ON documents
    FOR SELECT USING (auth.uid() = user_id);

-- Política para documentos: usuarios pueden insertar sus propios documentos
CREATE POLICY documents_insert_own ON documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política para documentos: usuarios pueden actualizar sus propios documentos
CREATE POLICY documents_update_own ON documents
    FOR UPDATE USING (auth.uid() = user_id);

-- Política para audit logs: usuarios pueden ver logs de sus documentos
CREATE POLICY audit_logs_select_own ON audit_logs
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM documents WHERE job_id = audit_logs.document_id
        )
    );

-- Política para notificaciones: usuarios solo ven sus notificaciones
CREATE POLICY notifications_select_own ON notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Política para notificaciones: usuarios pueden marcar como leídas sus notificaciones
CREATE POLICY notifications_update_own ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Insertar migración inicial
INSERT INTO migrations (name, checksum) 
VALUES ('001_initial_schema', MD5(pg_get_functiondef('update_updated_at_column'::regproc)));

-- Comentarios en las tablas
COMMENT ON TABLE users IS 'Tabla de usuarios del sistema';
COMMENT ON TABLE documents IS 'Tabla principal de documentos procesados';
COMMENT ON TABLE audit_logs IS 'Registro de todas las acciones del sistema';
COMMENT ON TABLE processing_metrics IS 'Métricas del sistema híbrido de procesamiento';
COMMENT ON TABLE notifications IS 'Notificaciones en tiempo real para usuarios';

-- Vista útil para dashboard
CREATE OR REPLACE VIEW document_summary AS
SELECT 
    d.job_id,
    d.document_type,
    d.title,
    d.status,
    d.emitter_name,
    d.receiver_name,
    d.document_date,
    d.confidence_score,
    d.processing_strategy,
    d.created_at,
    u.username,
    u.email,
    pm.processing_time_ms,
    pm.fallback_used
FROM documents d
LEFT JOIN users u ON d.user_id = u.user_id
LEFT JOIN processing_metrics pm ON d.job_id = pm.job_id
ORDER BY d.created_at DESC;

-- Función para estadísticas del dashboard
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_user_id UUID)
RETURNS TABLE (
    total_documents BIGINT,
    processed_documents BIGINT,
    pending_documents BIGINT,
    error_documents BIGINT,
    avg_processing_time_ms NUMERIC,
    llama_only_usage NUMERIC,
    hybrid_usage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_documents,
        COUNT(*) FILTER (WHERE status = 'PROCESSED')::BIGINT as processed_documents,
        COUNT(*) FILTER (WHERE status IN ('UPLOADED', 'PROCESSING'))::BIGINT as pending_documents,
        COUNT(*) FILTER (WHERE status = 'ERROR')::BIGINT as error_documents,
        AVG(pm.processing_time_ms)::NUMERIC as avg_processing_time_ms,
        (COUNT(*) FILTER (WHERE d.processing_strategy = 'llama-only')::NUMERIC / NULLIF(COUNT(*), 0) * 100)::NUMERIC as llama_only_usage,
        (COUNT(*) FILTER (WHERE d.processing_strategy = 'mistral-llama')::NUMERIC / NULLIF(COUNT(*), 0) * 100)::NUMERIC as hybrid_usage
    FROM documents d
    LEFT JOIN processing_metrics pm ON d.job_id = pm.job_id
    WHERE d.user_id = p_user_id OR p_user_id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Datos de prueba (comentar en producción)
-- INSERT INTO users (username, email, role) VALUES 
-- ('admin', 'admin@gestagent.com', 'admin'),
-- ('demo', 'demo@gestagent.com', 'operador');
