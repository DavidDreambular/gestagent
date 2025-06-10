# 🚀 GUÍA DE TESTEO MANUAL - GESTAGENT

## 📋 PRERREQUISITOS

### 1. **Verificar Node.js y dependencias**
```bash
# Verificar versión de Node.js (debe ser >= 18)
node --version

# Verificar que estamos en el directorio correcto
pwd
# Debe mostrar: /home/dreambular/Documentos/Proyectos/gestagent

# Verificar que las dependencias estén instaladas
ls node_modules/.bin/next
```

### 2. **Variables de entorno**
```bash
# Verificar archivo .env.local existe
ls -la .env.local

# Ver variables de entorno importantes (sin mostrar secrets)
echo "DATABASE_URL configurado: $([ -n "$DATABASE_URL" ] && echo "✅ SÍ" || echo "❌ NO")"
echo "MISTRAL_API_KEY configurado: $([ -n "$MISTRAL_API_KEY" ] && echo "✅ SÍ" || echo "❌ NO")"
```

## 🏁 COMANDOS DE INICIO

### **OPCIÓN 1: Inicio Normal (Puerto 3000)**
```bash
cd /home/dreambular/Documentos/Proyectos/gestagent
npm run dev
```

### **OPCIÓN 2: Puerto Específico (3001)**
```bash
cd /home/dreambular/Documentos/Proyectos/gestagent
PORT=3001 npm run dev
```

### **OPCIÓN 3: Con logs detallados**
```bash
cd /home/dreambular/Documentos/Proyectos/gestagent
DEBUG=* npm run dev 2>&1 | tee server-manual.log
```

### **OPCIÓN 4: En segundo plano**
```bash
cd /home/dreambular/Documentos/Proyectos/gestagent
nohup npm run dev > server-manual.log 2>&1 &
echo $! > server.pid
echo "Servidor iniciado en PID: $(cat server.pid)"
```

## 🔍 VERIFICACIÓN DE SERVICIOS

### **Verificar que el servidor está corriendo**
```bash
# Ver procesos de Next.js
ps aux | grep next

# Verificar puertos ocupados
netstat -tlnp | grep :300

# Test de conectividad básica
curl -s http://localhost:3001/api/health || echo "❌ Health endpoint no responde"
```

### **Verificar endpoints principales**
```bash
# Health check
curl -s http://localhost:3001/api/health | jq .

# Dashboard stats
curl -s http://localhost:3001/api/dashboard/stats | jq .

# Documentos list
curl -s http://localhost:3001/api/documents/list | jq .

# MCP status
curl -s http://localhost:3001/api/mcp/execute | jq .
```

## 📊 MONITOREO EN TIEMPO REAL

### **Ver logs del servidor en tiempo real**
```bash
# Si usaste la opción con logs
tail -f server-manual.log

# Si está corriendo en primer plano, en otra terminal:
tail -f server.log
```

### **Monitorear recursos del sistema**
```bash
# Uso de CPU y memoria
top -p $(pgrep -f next)

# Espacio en disco
df -h

# Procesos de GestAgent
ps aux | grep -E "(next|gestagent)" | grep -v grep
```

## 🧪 TESTS MANUALES

### **1. Test de Upload de Documentos**
```bash
# Crear archivo de prueba
echo "Test PDF content" > /tmp/test-invoice.txt

# Upload usando curl
curl -X POST http://localhost:3001/api/documents/upload \
  -F "file=@/tmp/test-invoice.txt" \
  -F "documentType=factura"
```

### **2. Test con PDF real**
```bash
# Si tienes un PDF real
curl -X POST http://localhost:3001/api/documents/upload \
  -F "file=@/ruta/a/tu/factura.pdf" \
  -F "documentType=factura"
```

### **3. Verificar documentos subidos**
```bash
# Listar documentos
curl -s http://localhost:3001/api/documents/list | jq '.documents[]'

# Ver stats actualizadas
curl -s http://localhost:3001/api/dashboard/stats | jq '.data'
```

### **4. Test de exportación SAGE**
```bash
# Exportar documentos a formato SAGE
curl -s http://localhost:3001/api/documents/export/sage | jq .
```

## 🌐 ACCESO WEB

### **URLs importantes para testeo manual**
```bash
# Aplicación principal
echo "Dashboard: http://localhost:3001"
echo "Login: http://localhost:3001/auth/login"
echo "Documentos: http://localhost:3001/dashboard/documents"
echo "Proveedores: http://localhost:3001/dashboard/suppliers"
echo "Clientes: http://localhost:3001/dashboard/customers"
echo "Automatización: http://localhost:3001/dashboard/automation"
```

### **Abrir en navegador (si tienes GUI)**
```bash
# Ubuntu/Linux con GUI
xdg-open http://localhost:3001

# O especificar navegador
firefox http://localhost:3001 &
```

## 🛠️ COMANDOS DE GESTIÓN

### **Detener el servidor**
```bash
# Si está en primer plano: Ctrl+C

# Si está en segundo plano:
kill $(cat server.pid)
rm server.pid

# Forzar cierre si es necesario:
pkill -f "next dev"
```

### **Reiniciar el servidor**
```bash
# Detener
pkill -f "next dev"

# Esperar un momento
sleep 2

# Reiniciar
cd /home/dreambular/Documentos/Proyectos/gestagent
npm run dev
```

### **Limpiar y reiniciar**
```bash
# Limpiar cache de Next.js
rm -rf .next

# Reinstalar dependencias si es necesario
rm -rf node_modules package-lock.json
npm install

# Reiniciar
npm run dev
```

## 🔧 TROUBLESHOOTING

### **Si el puerto está ocupado**
```bash
# Ver qué proceso usa el puerto 3000/3001
lsof -ti:3001 | xargs kill -9

# O usar otro puerto
PORT=3002 npm run dev
```

### **Si hay errores de dependencias**
```bash
# Limpiar cache npm
npm cache clean --force

# Reinstalar
rm -rf node_modules
npm install
```

### **Ver logs de error específicos**
```bash
# Filtrar solo errores
tail -f server.log | grep -E "(ERROR|❌|Error)"

# Ver warnings
tail -f server.log | grep -E "(WARN|⚠️|Warning)"
```

## 📱 CREDENCIALES DE PRUEBA

### **Usuarios de testing (si la autenticación está habilitada)**
```
Admin:     admin@gestagent.com / password123
Demo:      demo@gestagent.com / password123
Contable:  contable@gestagent.com / password123
Gestor:    gestor@gestagent.com / password123
```

## 🎯 ESCENARIOS DE TESTING RECOMENDADOS

### **Flujo completo básico:**
1. Iniciar servidor
2. Verificar health endpoints
3. Subir un documento PDF
4. Verificar que aparece en la lista
5. Verificar datos extraídos por Mistral AI
6. Exportar a formato SAGE
7. Verificar logs sin errores críticos

### **Testing de carga básica:**
```bash
# Subir múltiples documentos
for i in {1..5}; do
  curl -X POST http://localhost:3001/api/documents/upload \
    -F "file=@/tmp/test-invoice.txt" \
    -F "documentType=factura"
  sleep 1
done
```

## ⚡ COMANDO RÁPIDO DE INICIO

```bash
# Todo en uno - copia y pega esto:
cd /home/dreambular/Documentos/Proyectos/gestagent && \
echo "🚀 Iniciando GestAgent..." && \
npm run dev 2>&1 | tee server-manual.log
```

---

**¡Listo para testing manual! El servidor estará disponible en http://localhost:3001 (o 3000)**