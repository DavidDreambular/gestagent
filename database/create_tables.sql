-- Crear tablas para GestAgent
-- Este script debe ejecutarse en el editor SQL de Supabase

-- 1. Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT,
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('admin', 'contable', 'gestor', 'operador', 'supervisor')) NOT NULL DEFAULT 'operador',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Tabla de documentos
CREATE TABLE IF NOT EXISTS documents (
  job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT CHECK (document_type IN ('factura', 'nomina', 'recibo', 'extracto', 'balance')) NOT NULL,
  raw_text TEXT,
  raw_json JSONB,
  processed_json JSONB,
  upload_timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('processing', 'validated', 'error', 'pending_review')) NOT NULL DEFAULT 'processing',
  version TEXT NOT NULL DEFAULT '1.0',
  emitter_name TEXT,
  receiver_name TEXT,
  document_date DATE,
  title TEXT,
  file_path TEXT
);

-- 3. Tabla de logs de auditoría
CREATE TABLE IF NOT EXISTS audit_logs (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(job_id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  details JSONB
);

-- 4. Tabla de migraciones
CREATE TABLE IF NOT EXISTS migrations (
  migration_id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_upload_timestamp ON documents(upload_timestamp);
CREATE INDEX IF NOT EXISTS idx_documents_processed_json ON documents USING GIN (processed_json);
CREATE INDEX IF NOT EXISTS idx_audit_logs_document_id ON audit_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Crear funciones para actualizar timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.upload_timestamp = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Insertar datos de prueba para desarrollo
INSERT INTO users (id, username, email, role) VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', 'admin', 'admin@gestagent.com', 'admin'),
  ('550e8400-e29b-41d4-a716-446655440001', 'contable1', 'contable@gestagent.com', 'contable'),
  ('550e8400-e29b-41d4-a716-446655440002', 'gestor1', 'gestor@gestagent.com', 'gestor')
ON CONFLICT (email) DO NOTHING;

-- Insertar migración inicial
INSERT INTO migrations (name) VALUES ('initial_schema_creation')
ON CONFLICT DO NOTHING;

-- Habilitar Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad básicas (para desarrollo)
-- En producción, estas políticas deberían ser más restrictivas

-- Política para usuarios: solo pueden ver/editar su propia información
CREATE POLICY users_own_data ON users
  FOR ALL USING (auth.uid()::text = id::text);

-- Política para documentos: los usuarios pueden ver sus propios documentos
CREATE POLICY documents_own_data ON documents
  FOR ALL USING (auth.uid()::text = user_id::text);

-- Política para audit_logs: solo lectura para los propietarios
CREATE POLICY audit_logs_read_own ON audit_logs
  FOR SELECT USING (auth.uid()::text = user_id::text);

-- Para desarrollo, permitir acceso público (temporal)
CREATE POLICY documents_public_access ON documents
  FOR ALL USING (true);

CREATE POLICY users_public_access ON users
  FOR ALL USING (true);

CREATE POLICY audit_logs_public_access ON audit_logs
  FOR ALL USING (true); 