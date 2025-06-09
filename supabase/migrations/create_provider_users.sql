-- Crear tabla de usuarios proveedores
CREATE TABLE IF NOT EXISTS provider_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    provider_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ
);

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_provider_users_email ON provider_users(email);
CREATE INDEX IF NOT EXISTS idx_provider_users_provider_id ON provider_users(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_users_active ON provider_users(active);

-- Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_provider_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para updated_at
CREATE TRIGGER trigger_provider_users_updated_at
    BEFORE UPDATE ON provider_users
    FOR EACH ROW
    EXECUTE FUNCTION update_provider_users_updated_at();

-- Insertar usuarios de prueba para proveedores existentes
INSERT INTO provider_users (email, password_hash, provider_id, active) 
SELECT 
    LOWER(REPLACE(name, ' ', '.')) || '@proveedor.com' as email,
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3QJW.LBHxG' as password_hash, -- password123
    id as provider_id,
    true as active
FROM suppliers 
WHERE id IS NOT NULL
ON CONFLICT (email) DO NOTHING;

-- Comentarios
COMMENT ON TABLE provider_users IS 'Usuarios del portal de proveedores';
COMMENT ON COLUMN provider_users.email IS 'Email único del usuario proveedor';
COMMENT ON COLUMN provider_users.password_hash IS 'Hash bcrypt de la contraseña';
COMMENT ON COLUMN provider_users.provider_id IS 'Referencia al proveedor en la tabla suppliers';
COMMENT ON COLUMN provider_users.active IS 'Si el usuario está activo';
COMMENT ON COLUMN provider_users.login_attempts IS 'Intentos de login fallidos consecutivos';
COMMENT ON COLUMN provider_users.locked_until IS 'Hasta cuándo está bloqueado el usuario'; 