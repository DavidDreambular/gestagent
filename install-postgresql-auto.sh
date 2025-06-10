#!/bin/bash
# Script automatizado para instalar PostgreSQL con desktop-commander
# Este script puede ser ejecutado con comandos automatizados

set -e

echo "🐘 INSTALACIÓN AUTOMATIZADA DE POSTGRESQL"
echo "========================================"
echo ""

# Función para verificar si un comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Verificar si PostgreSQL ya está instalado
if command_exists psql; then
    echo "✅ PostgreSQL ya está instalado"
    psql --version
else
    echo "📦 Instalando PostgreSQL..."
    
    # Actualizar repositorios
    echo "Actualizando repositorios..."
    sudo apt update
    
    # Instalar PostgreSQL
    echo "Instalando PostgreSQL y herramientas..."
    sudo apt install -y postgresql postgresql-contrib postgresql-client
    
    echo "✅ PostgreSQL instalado exitosamente"
fi

# Verificar estado del servicio
echo ""
echo "🔍 Verificando servicio PostgreSQL..."
sudo systemctl status postgresql --no-pager || true

# Iniciar servicio si no está activo
if ! sudo systemctl is-active --quiet postgresql; then
    echo "Iniciando servicio PostgreSQL..."
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
fi

# Configurar PostgreSQL para GestAgent
echo ""
echo "⚙️ Configurando PostgreSQL para GestAgent..."

# Ejecutar comandos SQL como usuario postgres
sudo -u postgres psql << EOF
-- Verificar si el usuario existe
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'gestagent_user') THEN
        CREATE USER gestagent_user WITH PASSWORD 'gestagent_pass_2024';
    END IF;
END\$\$;

-- Verificar si la base de datos existe
SELECT 'CREATE DATABASE gestagent OWNER gestagent_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'gestagent');

-- Otorgar privilegios
GRANT ALL PRIVILEGES ON DATABASE gestagent TO gestagent_user;
EOF

# Configurar puerto 5433 (opcional)
echo ""
echo "📝 Configurando puerto 5433..."
PGVERSION=$(sudo -u postgres psql -t -c "SELECT version();" | grep -oP '\d+\.\d+' | head -1 | cut -d. -f1)
PGCONFIG="/etc/postgresql/$PGVERSION/main/postgresql.conf"

if [ -f "$PGCONFIG" ]; then
    # Hacer backup del archivo de configuración
    sudo cp "$PGCONFIG" "$PGCONFIG.backup"
    
    # Cambiar puerto si no está ya configurado
    if ! grep -q "port = 5433" "$PGCONFIG"; then
        sudo sed -i 's/^port = 5432/port = 5433/' "$PGCONFIG"
        echo "✅ Puerto cambiado a 5433"
        
        # Reiniciar PostgreSQL
        echo "Reiniciando PostgreSQL..."
        sudo systemctl restart postgresql
    else
        echo "✅ Puerto ya configurado en 5433"
    fi
fi

# Ejecutar script de inicialización de GestAgent
echo ""
echo "🗄️ Inicializando base de datos GestAgent..."

# Cambiar al directorio del proyecto
cd /home/dreambular/Documentos/Proyectos/gestagent

# Verificar conexión y crear tablas
PGPASSWORD=gestagent_pass_2024 psql -U gestagent_user -h localhost -p 5433 -d gestagent -f scripts/init-postgresql.sql 2>/dev/null || {
    # Si falla con puerto 5433, intentar con 5432
    echo "Intentando con puerto 5432..."
    PGPASSWORD=gestagent_pass_2024 psql -U gestagent_user -h localhost -p 5432 -d gestagent -f scripts/init-postgresql.sql
}

# Crear usuarios de prueba
echo ""
echo "👥 Creando usuarios de prueba..."
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 20
node scripts/create-test-users.js

echo ""
echo "✅ INSTALACIÓN COMPLETADA"
echo "========================"
echo ""
echo "PostgreSQL está listo para GestAgent:"
echo "- Usuario: gestagent_user"
echo "- Contraseña: gestagent_pass_2024"
echo "- Base de datos: gestagent"
echo "- Puerto: 5433 (o 5432 si falló el cambio)"
echo ""
echo "Próximo paso: npm run dev"