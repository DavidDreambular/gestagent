# Integración de Servidores MCP en GestAgent

## Descripción General

Los servidores MCP (Model Context Protocol) permiten extender las capacidades de Claude con herramientas adicionales. Hemos configurado tres servidores MCP para mejorar la funcionalidad de GestAgent:

### 1. Desktop Commander
Control y automatización del escritorio para procesamiento de documentos y capturas de pantalla.

### 2. n8n MCP Server
Integración con flujos de trabajo n8n para automatización avanzada de procesos contables.

### 3. MCP Playwright
Automatización web para extracción de datos de portales fiscales y bancarios.

## Configuración

La configuración de los servidores MCP se encuentra en `mcp-config.json`:

```json
{
  "mcpServers": {
    "desktop-commander": {
      "command": "node",
      "args": ["path/to/desktop-commander"]
    },
    "n8n-mcp-server": {
      "command": "node",
      "args": ["path/to/n8n-server"],
      "env": {
        "N8N_API_KEY": "",
        "N8N_HOST": "http://localhost:5678"
      }
    },
    "mcp-playwright": {
      "command": "npx",
      "args": ["-y", "@executeautomation/mcp-playwright"]
    }
  }
}
```

## Casos de Uso en GestAgent

### 1. Procesamiento Automático de Facturas
- **Desktop Commander**: Captura automática de facturas desde correos o aplicaciones
- **Playwright**: Descarga de facturas desde portales de proveedores
- **n8n**: Orquestación del flujo completo de procesamiento

### 2. Integración Bancaria
- **Playwright**: Acceso automatizado a portales bancarios
- **n8n**: Procesamiento y categorización de movimientos
- **Desktop Commander**: Captura de extractos en aplicaciones desktop

### 3. Cumplimiento Fiscal
- **Playwright**: Acceso a portales de Hacienda
- **n8n**: Generación automática de declaraciones
- **Desktop Commander**: Captura de certificados y documentos oficiales

## Implementación en el Código

### API Endpoint para MCP
```typescript
// app/api/mcp/execute/route.ts
export async function POST(request: Request) {
  const { server, action, params } = await request.json();
  
  // Ejecutar acción en servidor MCP
  const result = await executeMCPAction(server, action, params);
  
  return NextResponse.json(result);
}
```

### Integración con Flujos de Documentos
```typescript
// lib/mcp-integration.ts
export async function processDocumentWithMCP(document: Document) {
  // 1. Usar Desktop Commander para captura
  if (document.source === 'desktop') {
    await executeDesktopCapture(document.path);
  }
  
  // 2. Usar Playwright para descarga web
  if (document.source === 'web') {
    await downloadWithPlaywright(document.url);
  }
  
  // 3. Orquestar con n8n
  await triggerN8nWorkflow('process-document', {
    documentId: document.id,
    type: document.type
  });
}
```

## Instalación Manual

Si necesitas instalar los servidores MCP manualmente:

```bash
# Desktop Commander (cuando esté disponible)
npm install -g @modelcontextprotocol/server-desktop-commander

# n8n MCP Server
npm install -g @n8n-io/mcp-server-n8n

# Playwright MCP se ejecuta con npx, no requiere instalación
```

## Configuración de n8n

1. Instalar n8n:
```bash
npm install -g n8n
```

2. Iniciar n8n:
```bash
n8n start
```

3. Configurar API Key en n8n y actualizar `mcp-config.json`

## Próximos Pasos

1. Implementar endpoints API para ejecutar acciones MCP
2. Crear flujos n8n específicos para GestAgent
3. Integrar Desktop Commander en el flujo de captura
4. Configurar Playwright para portales españoles
5. Crear documentación de flujos automatizados