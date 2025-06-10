#!/bin/bash
# Script de instalación completa para GestAgent
set -e

echo "🚀 INSTALACIÓN COMPLETA DE GESTAGENT"
echo "===================================="
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Actualizar repositorios
echo -e "${YELLOW}1. Actualizando repositorios...${NC}"
sudo apt update

# 2. Instalar PostgreSQL 15
echo -e "${YELLOW}2. Instalando PostgreSQL 15...${NC}"
sudo apt install -y postgresql-15 postgresql-contrib-15 postgresql-client-15

# 3. Instalar Node.js 20 vía NodeSource
echo -e "${YELLOW}3. Instalando Node.js 20...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 4. Verificar versiones
echo -e "${GREEN}Verificando versiones instaladas:${NC}"
node --version
npm --version
psql --version

# 5. Configurar PostgreSQL
echo -e "${YELLOW}4. Configurando PostgreSQL...${NC}"

# Iniciar servicio
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Cambiar puerto a 5433
sudo sed -i 's/port = 5432/port = 5433/g' /etc/postgresql/15/main/postgresql.conf 2>/dev/null || true

# Configurar autenticación
sudo sh -c "echo 'local   all             postgres                                peer' > /etc/postgresql/15/main/pg_hba.conf"
sudo sh -c "echo 'local   all             all                                     md5' >> /etc/postgresql/15/main/pg_hba.conf"
sudo sh -c "echo 'host    all             all             127.0.0.1/32            md5' >> /etc/postgresql/15/main/pg_hba.conf"
sudo sh -c "echo 'host    all             all             ::1/128                 md5' >> /etc/postgresql/15/main/pg_hba.conf"

# Reiniciar PostgreSQL
sudo systemctl restart postgresql

# 6. Crear usuario y base de datos
echo -e "${YELLOW}5. Creando usuario y base de datos...${NC}"
sudo -u postgres psql -p 5433 << EOF
CREATE USER gestagent_user WITH PASSWORD 'gestagent_pass_2024';
CREATE DATABASE gestagent OWNER gestagent_user;
GRANT ALL PRIVILEGES ON DATABASE gestagent TO gestagent_user;
\q
EOF

echo -e "${GREEN}✅ Instalación base completada${NC}"
echo ""
echo "Siguiente paso: ejecutar npm install en el proyecto"