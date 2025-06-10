#!/bin/bash

echo "🚀 Iniciando servicios de GestAgent..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir con colores
print_status() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')]${NC} $1"
}

print_error() {
    echo -e "${RED}[$(date '+%H:%M:%S')]${NC} $1"
}

# 1. Verificar y levantar PostgreSQL
print_status "🗄️ Verificando PostgreSQL..."

if ! docker ps | grep -q gestagent-postgres; then
    print_status "Iniciando contenedor PostgreSQL..."
    
    # Detener contenedor existente si está parado
    docker rm -f gestagent-postgres 2>/dev/null || true
    
    # Crear y ejecutar contenedor
    docker run --name gestagent-postgres \
        -e POSTGRES_DB=gestagent \
        -e POSTGRES_USER=gestagent_user \
        -e POSTGRES_PASSWORD=gestagent_pass_2024 \
        -p 5432:5432 \
        -d postgres:15
    
    print_status "Esperando a que PostgreSQL esté listo..."
    sleep 5
    
    # Verificar conexión
    for i in {1..10}; do
        if docker exec gestagent-postgres pg_isready -U gestagent_user -d gestagent; then
            print_status "✅ PostgreSQL está listo"
            break
        else
            print_warning "Esperando PostgreSQL... ($i/10)"
            sleep 2
        fi
    done
else
    print_status "✅ PostgreSQL ya está ejecutándose"
fi

# 2. Configurar variables de entorno
print_status "⚙️ Configurando variables de entorno..."

export DATABASE_URL="postgresql://gestagent_user:gestagent_pass_2024@localhost:5432/gestagent"
export NODE_ENV="development"

# Verificar archivo .env.local
if [ ! -f .env.local ]; then
    print_warning "Creando archivo .env.local..."
    cat > .env.local << EOF
DATABASE_URL=postgresql://gestagent_user:gestagent_pass_2024@localhost:5432/gestagent
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=gestagent
POSTGRES_USER=gestagent_user
POSTGRES_PASSWORD=gestagent_pass_2024
NODE_ENV=development
EOF
fi

# 3. Verificar dependencias
print_status "📦 Verificando dependencias de Node.js..."
if [ ! -d "node_modules" ]; then
    print_status "Instalando dependencias..."
    npm install
fi

# 4. Limpiar procesos anteriores
print_status "🧹 Limpiando procesos anteriores..."
pkill -f "next dev" 2>/dev/null || true

# 5. Encontrar puerto disponible
print_status "🔌 Buscando puerto disponible..."
PORT=3001
while lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null; do
    PORT=$((PORT + 1))
done

print_status "📍 Usando puerto: $PORT"

# 6. Iniciar aplicación
print_status "🚀 Iniciando GestAgent..."

export PORT=$PORT

# Crear archivo de PID para poder detener después
echo $$ > gestagent.pid

print_status "✅ Iniciando servidor en http://localhost:$PORT"
print_status "📋 Para detener: kill \$(cat gestagent.pid) && docker stop gestagent-postgres"
print_status "📝 Logs en tiempo real: tail -f server.log"

# Iniciar aplicación
npm run dev 2>&1 | tee server.log