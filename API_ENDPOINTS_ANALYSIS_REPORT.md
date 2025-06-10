# Análisis de Endpoints API - GestAgent

## Resumen Ejecutivo

Se han analizado 41 endpoints API en el proyecto GestAgent. El proyecto está actualmente utilizando una mezcla de bases de datos:
- PostgreSQL (migrado)
- Base de datos en memoria (parcialmente implementada)
- Datos mock/ejemplo

## Estado Actual de los Endpoints

### 1. Endpoints Completamente Migrados a PostgreSQL ✅

#### Proveedores y Clientes
- `/api/suppliers` (GET, POST) - Totalmente migrado a PostgreSQL
- `/api/suppliers/[id]` (GET, PUT, DELETE) - Totalmente migrado a PostgreSQL
- `/api/customers` (GET, POST) - Totalmente migrado a PostgreSQL
- `/api/customers/[id]` (GET, PUT, DELETE) - Totalmente migrado a PostgreSQL

#### Dashboard
- `/api/dashboard/stats` - Migrado con fallback a datos mock
- `/api/dashboard/summary` - Usa PostgreSQL

#### Documentos (Parcialmente migrados)
- `/api/documents/list` - Migrado a PostgreSQL con fallback
- `/api/documents/upload` - Migrado a PostgreSQL
- `/api/documents/upload-multiple` - Usa PostgreSQL
- `/api/documents/export/sage` - Usa PostgreSQL

### 2. Endpoints con Implementación Mixta 🔄

#### Documentos
- `/api/documents` - Usa DDD con repositorio (necesita migración completa)
- `/api/documents/[jobId]` - Usa DDD con repositorio
- `/api/documents/data/[jobId]` - Necesita revisión
- `/api/documents/update/[jobId]` - Usa PostgreSQL parcialmente
- `/api/documents/link` - Usa PostgreSQL
- `/api/documents/export` - Necesita implementación
- `/api/documents/export/[jobId]` - Necesita implementación

#### Notificaciones
- `/api/notifications` - Usa datos mock (necesita migración)

#### Auditoría
- `/api/audit/logs` - Usa servicio de auditoría con fallback a mock
- `/api/audit/export` - Necesita implementación

### 3. Endpoints con Datos Mock 📦

- `/api/templates` - Usa servicio de plantillas (necesita base de datos)
- `/api/templates/[id]` - Necesita implementación
- `/api/templates/metrics/individual` - Necesita implementación
- `/api/templates/metrics/system` - Necesita implementación
- `/api/reports` - Usa datos mock
- `/api/metrics` - Usa datos mock
- `/api/webhooks` - Necesita implementación

### 4. Endpoints del Portal 🌐

Todos los endpoints del portal necesitan migración:
- `/api/portal/auth/login`
- `/api/portal/auth/user`
- `/api/portal/dashboard/documents`
- `/api/portal/dashboard/stats`
- `/api/portal/notifications`
- `/api/portal/upload`

### 5. Endpoints de Sistema y Configuración ⚙️

- `/api/auth/[...nextauth]` - Configuración de autenticación
- `/api/backup` - Necesita adaptación para base de datos en memoria
- `/api/configuration` - Necesita implementación
- `/api/health` - Endpoint básico implementado
- `/api/test` - Endpoint de prueba
- `/api/simple-test` - Endpoint de prueba
- `/api/setup-database` - Para PostgreSQL (necesita adaptación)
- `/api/setup-test-users` - Para PostgreSQL (necesita adaptación)

## Archivos que Necesitan Modificación

### 1. Para Migración Completa a Base de Datos en Memoria

#### Alta Prioridad 🔴
1. **`/app/api/documents/route.ts`**
   - Cambiar de `documentRepository` (DDD) a `memoryDB`
   - Implementar métodos GET, POST, DELETE

2. **`/app/api/documents/[jobId]/route.ts`**
   - Migrar de repositorio DDD a `memoryDB`
   - Implementar GET, PUT, DELETE

3. **`/app/api/notifications/route.ts`**
   - Cambiar de datos mock a `memoryDB`
   - Implementar CRUD completo

4. **`/app/api/audit/logs/route.ts`**
   - Migrar de servicio de auditoría a `memoryDB`
   - Mantener estructura de datos existente

#### Media Prioridad 🟡
5. **`/app/api/templates/route.ts`**
   - Implementar almacenamiento en `memoryDB`
   - Crear estructura de datos para plantillas

6. **`/app/api/reports/route.ts`**
   - Cambiar de datos mock a consultas reales en `memoryDB`

7. **`/app/api/metrics/route.ts`**
   - Implementar cálculo de métricas desde `memoryDB`

### 2. Nuevos Endpoints a Crear

#### Documentos
1. **`/app/api/documents/export/route.ts`**
   - Implementar exportación masiva de documentos

2. **`/app/api/documents/export/[jobId]/route.ts`**
   - Implementar exportación individual

#### Templates
3. **`/app/api/templates/[id]/route.ts`**
   - CRUD individual de plantillas

4. **`/app/api/templates/metrics/individual/route.ts`**
   - Métricas por plantilla

5. **`/app/api/templates/metrics/system/route.ts`**
   - Métricas globales del sistema

#### Portal
6. **Todos los endpoints del portal** necesitan implementación completa con `memoryDB`

### 3. Modificaciones en la Base de Datos en Memoria

**Archivo: `/lib/memory-db.ts`**

Necesita agregar:
1. Métodos para plantillas de extracción
2. Métodos para configuración del sistema
3. Métodos para métricas y reportes
4. Métodos para el portal de proveedores
5. Métodos de búsqueda y filtrado avanzados

## Recomendaciones de Implementación

### Fase 1: Migración Crítica (1-2 días)
1. Migrar endpoints de documentos principales
2. Implementar notificaciones en memoria
3. Migrar auditoría a memoria

### Fase 2: Funcionalidad Completa (2-3 días)
1. Implementar sistema de plantillas
2. Crear endpoints de exportación
3. Implementar métricas y reportes

### Fase 3: Portal de Proveedores (2-3 días)
1. Implementar autenticación del portal
2. Crear endpoints específicos del portal
3. Implementar notificaciones del portal

### Fase 4: Optimización (1-2 días)
1. Eliminar dependencias de PostgreSQL
2. Optimizar consultas en memoria
3. Implementar caché y mejoras de rendimiento

## Conclusión

El proyecto necesita una migración completa de aproximadamente 25 endpoints para funcionar completamente con base de datos en memoria. La prioridad debe ser:

1. **Endpoints de documentos** - Core del negocio
2. **Notificaciones y auditoría** - Funcionalidad esencial
3. **Templates y métricas** - Valor agregado
4. **Portal de proveedores** - Funcionalidad adicional

La migración completa permitirá que el sistema funcione sin dependencias externas de base de datos, facilitando el desarrollo y las pruebas.