#!/bin/bash

echo "==================================="
echo "🔍 VERIFICACIÓN COMPLETA DEL SISTEMA"
echo "==================================="
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para verificar servicios
check_service() {
    local service_name=$1
    local check_command=$2
    
    echo -n "Verificando $service_name... "
    
    if eval $check_command > /dev/null 2>&1; then
        echo -e "${GREEN}✓ OK${NC}"
        return 0
    else
        echo -e "${RED}✗ FALLO${NC}"
        return 1
    fi
}

echo "1. SERVICIOS DEL SISTEMA"
echo "------------------------"
check_service "PostgreSQL" "sudo systemctl is-active postgresql"
check_service "PostgreSQL Puerto 5432" "sudo lsof -i :5432 | grep LISTEN"
check_service "Next.js Puerto 3001" "lsof -i :3001 | grep LISTEN"

echo ""
echo "2. BASE DE DATOS"
echo "----------------"
check_service "Conexión a BD" "sudo -u postgres psql -p 5432 -d gestagent -c 'SELECT 1'"
check_service "Tabla usuarios" "sudo -u postgres psql -p 5432 -d gestagent -c 'SELECT COUNT(*) FROM users'"
check_service "Tabla documentos" "sudo -u postgres psql -p 5432 -d gestagent -c 'SELECT COUNT(*) FROM documents'"
check_service "Tabla proveedores" "sudo -u postgres psql -p 5432 -d gestagent -c 'SELECT COUNT(*) FROM suppliers'"
check_service "Tabla clientes" "sudo -u postgres psql -p 5432 -d gestagent -c 'SELECT COUNT(*) FROM customers'"

echo ""
echo "3. API ENDPOINTS"
echo "----------------"
check_service "API Health" "curl -sf http://localhost:3001/api/health"
check_service "API Dashboard Stats" "curl -sf http://localhost:3001/api/dashboard/stats"
check_service "API Suppliers" "curl -sf http://localhost:3001/api/suppliers"
check_service "API Customers" "curl -sf http://localhost:3001/api/customers"

echo ""
echo "4. DATOS EN EL SISTEMA"
echo "----------------------"
USERS=$(sudo -u postgres psql -p 5432 -d gestagent -t -c "SELECT COUNT(*) FROM users" 2>/dev/null | tr -d ' ')
SUPPLIERS=$(sudo -u postgres psql -p 5432 -d gestagent -t -c "SELECT COUNT(*) FROM suppliers" 2>/dev/null | tr -d ' ')
CUSTOMERS=$(sudo -u postgres psql -p 5432 -d gestagent -t -c "SELECT COUNT(*) FROM customers" 2>/dev/null | tr -d ' ')
DOCUMENTS=$(sudo -u postgres psql -p 5432 -d gestagent -t -c "SELECT COUNT(*) FROM documents" 2>/dev/null | tr -d ' ')

echo "📊 Usuarios: $USERS"
echo "📊 Proveedores: $SUPPLIERS"
echo "📊 Clientes: $CUSTOMERS"
echo "📊 Documentos: $DOCUMENTS"

echo ""
echo "==================================="
echo "📌 ACCESO AL SISTEMA"
echo "==================================="
echo ""
echo "🌐 URL: http://localhost:3001"
echo ""
echo "👤 USUARIOS DE PRUEBA:"
echo "   • admin@gestagent.com / password123"
echo "   • demo@gestagent.com / password123"
echo "   • contable@gestagent.com / password123"
echo "   • gestor@gestagent.com / password123"
echo ""
echo "==================================="