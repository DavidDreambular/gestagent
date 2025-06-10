#!/bin/bash

echo "🔧 Actualizando contraseñas de usuarios..."
echo "Contraseña sudo requerida: 010122"

# Actualizar contraseñas con el hash correcto para 'password123'
sudo -u postgres psql -p 5432 -d gestagent << EOF
UPDATE users SET password_hash = '\$2b\$10\$hD9wqHlBeFu0Rp43r4yK2.z4uYhpnA.4nQyn9A2EjfR.AIyQxXU4S';

-- Verificar la actualización
SELECT email, role, substring(password_hash, 1, 30) as hash_preview FROM users;
EOF

echo "✅ Contraseñas actualizadas correctamente"
echo ""
echo "Usuarios disponibles:"
echo "• admin@gestagent.com / password123"
echo "• demo@gestagent.com / password123" 
echo "• contable@gestagent.com / password123"
echo "• gestor@gestagent.com / password123"