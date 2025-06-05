-- Script para insertar datos de prueba en GestAgent
-- Ejecutar en el editor SQL de Supabase

-- Deshabilitar temporalmente RLS para insertar datos de prueba
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

-- Insertar usuarios de prueba
INSERT INTO users (id, username, email, role) VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', 'admin', 'admin@gestagent.com', 'admin'),
  ('550e8400-e29b-41d4-a716-446655440001', 'contable1', 'contable@gestagent.com', 'contable'),
  ('550e8400-e29b-41d4-a716-446655440002', 'gestor1', 'gestor@gestagent.com', 'gestor'),
  ('550e8400-e29b-41d4-a716-446655440003', 'operador1', 'operador@gestagent.com', 'operador'),
  ('550e8400-e29b-41d4-a716-446655440004', 'supervisor1', 'supervisor@gestagent.com', 'supervisor')
ON CONFLICT (email) DO NOTHING;

-- Insertar documentos de prueba
INSERT INTO documents (job_id, document_type, user_id, status, version, emitter_name, receiver_name, title) VALUES 
  ('660e8400-e29b-41d4-a716-446655440000', 'factura', '550e8400-e29b-41d4-a716-446655440000', 'processing', '1.0', 'Empresa XYZ', 'Cliente ABC', 'Factura #001'),
  ('660e8400-e29b-41d4-a716-446655440001', 'nomina', '550e8400-e29b-41d4-a716-446655440001', 'validated', '1.0', 'Mi Empresa', 'Empleado Juan', 'Nómina Enero 2024'),
  ('660e8400-e29b-41d4-a716-446655440002', 'factura', '550e8400-e29b-41d4-a716-446655440002', 'error', '1.0', 'Proveedor 123', 'Mi Empresa', 'Factura #002')
ON CONFLICT (job_id) DO NOTHING;

-- Insertar logs de auditoría de prueba
INSERT INTO audit_logs (document_id, user_id, action, details) VALUES 
  ('660e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', 'document_uploaded', '{"file_name": "factura_001.pdf", "size": "2.5MB"}'),
  ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'document_processed', '{"ocr_provider": "mistral", "llm_provider": "openrouter"}'),
  ('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'document_error', '{"error": "OCR failed", "retry_count": 3}')
ON CONFLICT (log_id) DO NOTHING;

-- Insertar migración
INSERT INTO migrations (name) VALUES ('seed_data_initial')
ON CONFLICT DO NOTHING;

-- Volver a habilitar RLS (comentar estas líneas para desarrollo)
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE documents ENABLE ROW LEVEL SECURITY;  
-- ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Para desarrollo, mantener RLS deshabilitado temporalmente
-- Esto permite que la aplicación funcione sin problemas de autenticación
-- En producción, habilitar RLS y configurar políticas adecuadas

SELECT 'Datos de prueba insertados correctamente' as result; 