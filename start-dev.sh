#!/bin/bash
# Script para iniciar el servidor de desarrollo

echo "🚀 Iniciando GestAgent..."
echo "========================"
echo ""

# Configurar NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Usar Node.js 20
nvm use 20

echo ""
echo "📋 Estado del sistema:"
echo "- Node.js: $(node --version)"
echo "- npm: $(npm --version)"
echo "- Base de datos: En memoria (PostgreSQL no disponible)"
echo ""

# Iniciar servidor
npm run dev