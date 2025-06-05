# GESTAGENT - Deploy Railway Production Guide

## 🚀 DEPLOYMENT RAILWAY - PRODUCCIÓN

**Ejecutar después de completar GES-003 y GES-004 (auth + PDF testing locales exitosos)**

---

## PRE-REQUISITOS ✅

### 1. Verificar Estado Local
```bash
cd F:\claude-projects\gestagent

# Verificar que build funciona localmente
npm run build
# Debe completar sin errores

# Test build local
npm run start
# Debe funcionar en modo producción
```

### 2. Commit Cambios Finales
```bash
# Añadir todos los cambios
git add .

# Commit final
git commit -m "feat: Complete auth migration + PDF processing - PRODUCTION READY"

# Verificar remote branch
git push origin main
```

---

## CONFIGURACIÓN RAILWAY ✅

### 1. Variables de Entorno en Railway Dashboard

**Navegar a**: Railway Project → Environment Variables

**⚠️ CONFIGURAR TODAS ESTAS VARIABLES**:

```env
# === APLICACIÓN ===
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1

# === URLs PRODUCCIÓN ===
NEXTAUTH_URL=https://gestagent-app-production.up.railway.app
NEXT_PUBLIC_API_URL=https://gestagent-app-production.up.railway.app
RAILWAY_PUBLIC_DOMAIN=gestagent-app-production.up.railway.app

# === SEGURIDAD ===
NEXTAUTH_SECRET=gestagent-prod-secret-2024-secure-key

# === SUPABASE (usar claves REALES del dashboard) ===
NEXT_PUBLIC_SUPABASE_URL=https://vyqnurwqcrpfoyhwndmz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# === AI SERVICES ===
# Mistral OCR
MISTRAL_API_KEY=JITyrx8a7QaG8Wxj0XOqDRtgqmKUeOzr
MISTRAL_API_URL=https://api.mistral.ai/v1/ocr

# OpenRouter Llama Vision
OPENROUTER_API_KEY=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
OPENROUTER_MODEL=meta-llama/llama-3.2-90b-vision-instruct
OPENROUTER_API_URL=https://openrouter.ai/api/v1
OPENROUTER_SITE_URL=https://gestagent-app-production.up.railway.app
OPENROUTER_SITE_NAME=GESTAGENT
```

**⚠️ IMPORTANTE**: 
- Para SUPABASE keys, usar las claves REALES obtenidas en GES-001
- Si usaste claves simuladas, obtener las reales del dashboard de Supabase

---

## PROCESO DE DEPLOYMENT ✅

### 1. Trigger Deployment
```bash
# Push activará auto-deploy en Railway
git push origin main
```

### 2. Monitorear Build en Railway

**En Railway Dashboard**:
- [ ] **Deployment Status**: "Building" → "Success"
- [ ] **Build Time**: < 10 minutos
- [ ] **Build Logs**: Sin errores críticos
- [ ] **Service Status**: "Running"

### ✅ Logs Esperados (Sin Errores):
```
✓ Creating optimized production build
✓ Compiled successfully
✓ Checking validity of types
✓ Generating static pages
✓ Finalizing page optimization
✓ Build completed successfully
```

### 3. Verificar Deployment Exitoso

#### A) Verificar Sitio Responde
```bash
# Verificar HTTP response
curl -I https://gestagent-app-production.up.railway.app
# Esperado: HTTP/2 200 OK

# Verificar SSL
curl -I https://gestagent-app-production.up.railway.app | grep -i "strict-transport-security"
# Debe tener headers HTTPS
```

#### B) Verificar en Navegador
- [ ] **URL**: `https://gestagent-app-production.up.railway.app`
- [ ] **SSL Certificate**: 🔒 Candado verde visible
- [ ] **Page Load**: < 5 segundos
- [ ] **No Errors**: Consola del navegador sin errores críticos

---

## TESTING EN PRODUCCIÓN ✅

### TEST 1: Autenticación Producción
```
1. Navegar a: https://gestagent-app-production.up.railway.app
2. Ir a /auth/register
3. Crear nuevo usuario:
   Email: prod-test@gestagent.app
   Password: ProductionTest123!
   Username: produser
   Role: operador
```

**✅ Resultados Esperados**:
- [ ] Registro completa sin errores
- [ ] Usuario se crea en Supabase (verificar en dashboard)
- [ ] Login funciona correctamente
- [ ] Dashboard carga con usuario real

### TEST 2: Verificar Supabase Connection
**En Supabase SQL Editor**:
```sql
SELECT user_id, username, email, role, created_at 
FROM users 
WHERE email = 'prod-test@gestagent.app';
```

**✅ Resultado Esperado**: Usuario aparece en base de datos

### TEST 3: Test PDF Processing en Producción
```
1. Login con usuario de prueba
2. Ir a Dashboard → Nuevo Documento
3. Subir PDF de prueba simple
4. Verificar procesamiento completa
```

**✅ Resultados Esperados**:
- [ ] Upload funciona sin errores
- [ ] Procesamiento AI completa exitosamente
- [ ] Documento aparece en dashboard
- [ ] Datos extraídos correctamente

---

## VERIFICACIONES FINALES ✅

### 1. Performance Check
- [ ] **Tiempo de carga inicial**: < 5 segundos
- [ ] **Tiempo de autenticación**: < 3 segundos
- [ ] **Tiempo procesamiento PDF**: < 30 segundos
- [ ] **Navegación entre páginas**: < 2 segundos

### 2. Functionality Check
- [ ] **Registro/Login**: ✅ Funcional
- [ ] **Dashboard**: ✅ Carga datos reales
- [ ] **Upload PDF**: ✅ Procesamiento completo
- [ ] **Vista detallada**: ✅ Datos estructurados
- [ ] **Exportación**: ✅ Genera archivos válidos

### 3. Security Check
- [ ] **HTTPS**: ✅ SSL activo
- [ ] **Headers Security**: ✅ Headers apropiados
- [ ] **Auth Protection**: ✅ Rutas protegidas
- [ ] **API Keys**: ✅ No expuestas en frontend

---

## 🚨 TROUBLESHOOTING

### Build Falla en Railway
**Soluciones**:
- Verificar que `npm run build` funciona localmente
- Revisar logs específicos de error en Railway
- Verificar versiones de Node.js compatibles

### Variables de Entorno No Cargan
**Soluciones**:
- Verificar que todas las variables están configuradas
- Reiniciar service en Railway después de añadir variables
- Verificar sintaxis de valores (sin espacios extra)

### SSL No Funciona
**Soluciones**:
- Esperar propagación (15-30 minutos)
- Verificar configuración de dominio en Railway
- Contactar soporte de Railway si persiste

### Auth No Funciona en Producción
**Soluciones**:
- Verificar NEXTAUTH_URL apunta a dominio correcto
- Verificar claves de Supabase son reales (no simuladas)
- Comprobar configuración de Supabase para dominio de producción

---

## ✅ CRITERIOS DE ÉXITO DEPLOYMENT

**✅ DEPLOYMENT EXITOSO**:
- [ ] Build completa sin errores
- [ ] Aplicación accesible en URL de producción
- [ ] SSL certificado activo
- [ ] Autenticación funciona en producción
- [ ] Procesamiento PDF funciona en producción
- [ ] Performance dentro de límites aceptables
- [ ] No hay errores críticos en logs

**🎯 RESULTADO**: Sistema GestAgent funcionando al 100% en producción

---

**⏭️ SIGUIENTE**: GES-006 - Validación Final del Sistema