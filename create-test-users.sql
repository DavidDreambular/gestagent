-- Insertar usuarios de prueba con contraseña hasheada 'password123'
-- El hash es: $2a$10$8Yw8KJmGfUlMGhBFJGHJDOvNqgXKLoxzfM6k5FLSjZhBMfJlz9hGm

INSERT INTO users (username, email, password_hash, role) VALUES 
('admin', 'admin@gestagent.com', '$2a$10$8Yw8KJmGfUlMGhBFJGHJDOvNqgXKLoxzfM6k5FLSjZhBMfJlz9hGm', 'admin'),
('demo', 'demo@gestagent.com', '$2a$10$8Yw8KJmGfUlMGhBFJGHJDOvNqgXKLoxzfM6k5FLSjZhBMfJlz9hGm', 'user'),
('contable', 'contable@gestagent.com', '$2a$10$8Yw8KJmGfUlMGhBFJGHJDOvNqgXKLoxzfM6k5FLSjZhBMfJlz9hGm', 'contable'),
('gestor', 'gestor@gestagent.com', '$2a$10$8Yw8KJmGfUlMGhBFJGHJDOvNqgXKLoxzfM6k5FLSjZhBMfJlz9hGm', 'gestor')
ON CONFLICT (email) DO NOTHING;