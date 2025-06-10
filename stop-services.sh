#!/bin/bash

echo "🛑 Deteniendo servicios de GestAgent..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')]${NC} $1"
}

# 1. Detener aplicación Next.js
print_status "🛑 Deteniendo aplicación Next.js..."

if [ -f gestagent.pid ]; then
    PID=$(cat gestagent.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        print_status "✅ Aplicación detenida (PID: $PID)"
    else
        print_warning "El proceso PID $PID ya no existe"
    fi
    rm -f gestagent.pid
else
    # Buscar y matar procesos next
    PIDS=$(pgrep -f "next dev")
    if [ ! -z "$PIDS" ]; then
        echo $PIDS | xargs kill
        print_status "✅ Procesos Next.js detenidos"
    else
        print_warning "No se encontraron procesos Next.js ejecutándose"
    fi
fi

# 2. Detener PostgreSQL Docker
print_status "🗄️ Deteniendo PostgreSQL..."

if docker ps | grep -q gestagent-postgres; then
    docker stop gestagent-postgres
    print_status "✅ PostgreSQL detenido"
else
    print_warning "PostgreSQL no está ejecutándose"
fi

# 3. Opcional: Eliminar contenedor PostgreSQL
read -p "¿Eliminar contenedor PostgreSQL? (esto borrará los datos) [y/N]: " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker rm gestagent-postgres
    print_status "🗑️ Contenedor PostgreSQL eliminado"
fi

# 4. Limpiar archivos temporales
print_status "🧹 Limpiando archivos temporales..."
rm -f server.log
rm -f gestagent.pid

print_status "✅ Todos los servicios han sido detenidos"