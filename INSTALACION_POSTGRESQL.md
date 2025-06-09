# 🚀 GUÍA DE MIGRACIÓN A POSTGRESQL LOCAL

## 📋 PROBLEMA ACTUAL
Supabase está dando errores constantes de "Invalid API key" y problemas de conexión, afectando la estabilidad del desarrollo.

## 🎯 SOLUCIÓN
Migrar completamente a PostgreSQL local para:
- ✅ Control total sobre la base de datos
- ✅ Sin límites de API o timeouts
- ✅ Desarrollo más rápido y estable
- ✅ Sin dependencias externas

---

## 🔧 INSTALACIÓN PASO A PASO

### OPCIÓN 1: Script Automático (Recomendado)

```bash
# Ejecutar script automático
node scripts/setup-postgresql.js
```

### OPCIÓN 2: Instalación Manual

#### Paso 1: Descargar PostgreSQL
1. Ve a: https://www.postgresql.org/download/windows/
2. Descarga **PostgreSQL 16.x** (recomendado)
3. Ejecuta el instalador **como administrador**

#### Paso 2: Configuración Durante la Instalación
```
Puerto: 5432 (dejar por defecto)
Usuario: postgres
Contraseña: postgres123 (o elige una)
Componentes: Instalar todos
Locale: Spanish, Spain (opcional)
```

#### Paso 3: Verificar Instalación
```powershell
# Abrir CMD/PowerShell como administrador
pg_ctl --version
# Debería mostrar: pg_ctl (PostgreSQL) 16.x
```

#### Paso 4: Crear Base de Datos del Proyecto
```sql
-- Conectar como postgres
psql -U postgres -h localhost

-- Crear usuario específico
CREATE USER gestagent WITH PASSWORD 'gestagent123';

-- Crear base de datos
CREATE DATABASE gestagent_db OWNER gestagent;

-- Dar permisos
GRANT ALL PRIVILEGES ON DATABASE gestagent_db TO gestagent;

-- Conectar a la nueva BD
\c gestagent_db

-- Permisos adicionales
GRANT ALL ON SCHEMA public TO gestagent;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO gestagent;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO gestagent;

-- Salir
\q
```

#### Paso 5: Inicializar Schema
```bash
# Ejecutar script de inicialización
psql -U gestagent -h localhost -d gestagent_db -f scripts/init-postgresql.sql
```

---

## ⚙️ CONFIGURACIÓN DEL PROYECTO

### Actualizar .env.local
```env
# PostgreSQL Local Database
DATABASE_URL="postgresql://gestagent:gestagent123@localhost:5432/gestagent_db"
POSTGRES_HOST="localhost"
POSTGRES_PORT="5432"
POSTGRES_DB="gestagent_db"
POSTGRES_USER="gestagent"
POSTGRES_PASSWORD="gestagent123"

# APIs Externas (mantener)
MISTRAL_API_KEY="JITyrx8a7QaG8Wxj0XOqDRtgqmKUeOzr"
OPENROUTER_API_KEY="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"

# Auth (mantener)
NEXTAUTH_SECRET="tu-secret-gestagent-2024"
NEXTAUTH_URL="http://localhost:3000"

# Supabase DESACTIVADO (comentar/eliminar)
# NEXT_PUBLIC_SUPABASE_URL=""
# NEXT_PUBLIC_SUPABASE_ANON_KEY=""
# SUPABASE_SERVICE_ROLE_KEY=""
```

---

## 🧪 VERIFICACIÓN

### Probar Conexión
```bash
# Conectar a la base de datos
psql -U gestagent -h localhost -d gestagent_db

# Verificar tablas
\dt

# Verificar datos de ejemplo
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM suppliers;
SELECT COUNT(*) FROM customers;
SELECT COUNT(*) FROM documents;

# Salir
\q
```

### Probar APIs
```bash
# Reiniciar servidor de desarrollo
npm run dev

# Probar APIs principales
curl http://localhost:3000/api/test
curl http://localhost:3000/api/dashboard/stats
curl http://localhost:3000/api/customers
curl http://localhost:3000/api/suppliers
```

---

## 📊 SCHEMA DE BASE DE DATOS

### Tablas Principales
- **users**: Gestión de usuarios del sistema
- **suppliers**: Proveedores (detectados automáticamente de facturas)
- **customers**: Clientes (detectados automáticamente de facturas)
- **documents**: Documentos procesados (facturas, nóminas, etc.)
- **audit_logs**: Registro de auditoría y cambios

### Características
- ✅ **UUIDs** para IDs únicos
- ✅ **JSONB** para almacenamiento flexible de documentos
- ✅ **Índices GIN** para búsquedas rápidas
- ✅ **Triggers** para actualización automática de timestamps
- ✅ **Datos de ejemplo** incluidos

---

## 🚫 ELIMINAR DEPENDENCIAS DE SUPABASE

### Archivos Modificados
- ✅ `lib/postgresql-client.ts` - Nuevo cliente PostgreSQL
- ✅ `scripts/init-postgresql.sql` - Schema completo
- ✅ `scripts/setup-postgresql.js` - Script de configuración
- ⏳ APIs principales (próximo paso)

### APIs a Migrar
- `app/api/dashboard/stats/route.ts`
- `app/api/documents/list/route.ts`
- `app/api/customers/route.ts`
- `app/api/suppliers/route.ts`
- `app/api/documents/upload/route.ts`

---

## 🔍 SOLUCIÓN DE PROBLEMAS

### Error: "pg_ctl no reconocido"
```bash
# Añadir PostgreSQL al PATH manualmente
# Ubicación típica: C:\Program Files\PostgreSQL\16\bin
```

### Error: "psql: FATAL: password authentication failed"
```bash
# Verificar contraseña configurada durante instalación
# Reintentar con contraseña correcta
```

### Error: "could not connect to server"
```bash
# Verificar que el servicio esté iniciado
net start postgresql-x64-16

# O reiniciar el servicio
net stop postgresql-x64-16
net start postgresql-x64-16
```

### Error: "database does not exist"
```bash
# Volver a crear la base de datos
psql -U postgres -h localhost
CREATE DATABASE gestagent_db OWNER gestagent;
\q
```

---

## 🎯 SIGUIENTES PASOS

1. **Instalar PostgreSQL** ← ACTUAL
2. **Migrar APIs principales** (siguiente)
3. **Probar flujo completo**
4. **Eliminar código de Supabase**
5. **Actualizar documentación**

---

## 💡 COMANDOS ÚTILES

```bash
# Conectar a PostgreSQL
psql -U gestagent -h localhost -d gestagent_db

# Ver todas las tablas
\dt

# Describir tabla
\d table_name

# Ver usuarios
\du

# Ver bases de datos
\l

# Ejecutar archivo SQL
\i path/to/file.sql

# Backup de base de datos
pg_dump -U gestagent -h localhost gestagent_db > backup.sql

# Restaurar backup
psql -U gestagent -h localhost -d gestagent_db < backup.sql
```

¡Listo para empezar la migración! 🚀 