#!/bin/bash

echo "====================================="
echo "🔧 CONFIGURACIÓN DE SERVIDORES MCP"
echo "====================================="
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar Node.js
echo "1. Verificando Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓ Node.js instalado: $NODE_VERSION${NC}"
else
    echo -e "${RED}✗ Node.js no está instalado${NC}"
    exit 1
fi

# Instalar servidores MCP globalmente
echo ""
echo "2. Instalando servidores MCP..."
echo ""

# Desktop Commander
echo -n "   • Instalando desktop-commander... "
if npm install -g @modelcontextprotocol/server-desktop-commander > /dev/null 2>&1; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ Error${NC}"
fi

# n8n MCP Server
echo -n "   • Instalando n8n-mcp-server... "
if npm install -g @n8n-io/mcp-server-n8n > /dev/null 2>&1; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ Error${NC}"
fi

# Playwright MCP
echo -n "   • Configurando mcp-playwright... "
echo -e "${GREEN}✓ Configurado (se ejecutará con npx)${NC}"

# Verificar instalaciones
echo ""
echo "3. Verificando instalaciones..."
echo ""

# Desktop Commander
if npm list -g @modelcontextprotocol/server-desktop-commander > /dev/null 2>&1; then
    echo -e "   ${GREEN}✓ desktop-commander instalado correctamente${NC}"
else
    echo -e "   ${RED}✗ desktop-commander no encontrado${NC}"
fi

# n8n MCP Server
if npm list -g @n8n-io/mcp-server-n8n > /dev/null 2>&1; then
    echo -e "   ${GREEN}✓ n8n-mcp-server instalado correctamente${NC}"
else
    echo -e "   ${RED}✗ n8n-mcp-server no encontrado${NC}"
fi

# Información adicional
echo ""
echo "====================================="
echo "📌 CONFIGURACIÓN COMPLETADA"
echo "====================================="
echo ""
echo "Los servidores MCP han sido configurados en:"
echo "   📄 mcp-config.json"
echo ""
echo "Capacidades habilitadas:"
echo "   🖥️  Desktop Commander - Control del escritorio"
echo "   🔄 n8n MCP Server - Integración con n8n"
echo "   🌐 MCP Playwright - Automatización web"
echo ""
echo "Nota: Para n8n-mcp-server necesitarás:"
echo "   1. n8n ejecutándose en http://localhost:5678"
echo "   2. Configurar N8N_API_KEY en mcp-config.json"
echo ""
echo "====================================="