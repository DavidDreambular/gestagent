-- Migración: Crear tabla provider_users para el portal de proveedores

-- Crear tabla provider_users
CREATE TABLE IF NOT EXISTS provider_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    provider_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    name VARCHAR(255),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_provider_users_email ON provider_users(email);
CREATE INDEX IF NOT EXISTS idx_provider_users_provider_id ON provider_users(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_users_active ON provider_users(active);

-- Habilitar RLS
ALTER TABLE provider_users ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios solo vean sus propios datos
CREATE POLICY "Users can view own data" ON provider_users
    FOR SELECT USING (auth.uid()::text = id::text);

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_provider_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE TRIGGER trigger_update_provider_users_updated_at
    BEFORE UPDATE ON provider_users
    FOR EACH ROW
    EXECUTE FUNCTION update_provider_users_updated_at();

-- Insertar usuarios de prueba
INSERT INTO provider_users (email, password_hash, name, provider_id) VALUES
('proveedor1@test.com', '$2b$10$rQZ9QmjqjKjKjKjKjKjKjOeH8H8H8H8H8H8H8H8H8H8H8H8H8H8H8', 'Proveedor Test 1', (SELECT id FROM suppliers LIMIT 1)),
('proveedor2@test.com', '$2b$10$rQZ9QmjqjKjKjKjKjKjKjOeH8H8H8H8H8H8H8H8H8H8H8H8H8H8H8', 'Proveedor Test 2', (SELECT id FROM suppliers OFFSET 1 LIMIT 1))
ON CONFLICT (email) DO NOTHING;
