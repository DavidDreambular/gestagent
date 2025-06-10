-- Actualizar las contraseñas de todos los usuarios a 'password123'
-- Hash generado con bcryptjs: password123
UPDATE users SET password_hash = '$2b$10$hD9wqHlBeFu0Rp43r4yK2.z4uYhpnA.4nQyn9A2EjfR.AIyQxXU4S';

-- Verificar la actualización
SELECT email, role, substring(password_hash, 1, 30) as hash_preview FROM users;