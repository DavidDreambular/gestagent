# Instrucciones para ejecutar el Schema SQL en Supabase

## 🚀 Pasos para ejecutar el schema

### Opción 1: Usando el Dashboard de Supabase (Recomendado)

1. **Accede al SQL Editor**:
   - Ve a: https://supabase.com/dashboard/project/vyqnurwqcrpfoyhwndmz/sql/new
   - O navega: Dashboard → SQL Editor → New Query

2. **Copia y pega el contenido de `schema.sql`**

3. **Ejecuta el script**:
   - Click en "Run" o presiona Ctrl+Enter
   - Espera a que todas las tablas se creen

4. **Verifica la instalación**:
   - Ejecuta el contenido de `verify-schema.sql`
   - Deberías ver todas las tablas con ✅

### Opción 2: Usando Supabase CLI

```bash
# Instalar Supabase CLI si no lo tienes
npm install -g supabase

# Login
supabase login

# Conectar al proyecto
supabase link --project-ref vyqnurwqcrpfoyhwndmz

# Ejecutar el schema
supabase db push database/schema.sql

# Verificar
supabase db push database/verify-schema.sql
```

## 📋 Tablas creadas

1. **users** - Usuarios del sistema
2. **documents** - Documentos procesados
3. **audit_logs** - Registro de auditoría
4. **processing_metrics** - Métricas del sistema híbrido
5. **notifications** - Notificaciones en tiempo real
6. **migrations** - Control de versiones del schema

## 🔐 Políticas RLS

Las políticas Row Level Security están habilitadas para:
- Los usuarios solo pueden ver/editar sus propios documentos
- Los logs de auditoría son visibles solo para el dueño del documento
- Las notificaciones son privadas por usuario

## ⚠️ Importante

- **Antes de ejecutar**: Asegúrate de tener backup si hay datos existentes
- **Auth**: Las políticas RLS usan `auth.uid()` de Supabase Auth
- **Índices**: Se crean automáticamente para optimizar consultas

## 🧪 Datos de prueba

El schema incluye usuarios de prueba comentados. Para activarlos:
1. Descomenta las últimas líneas del `schema.sql`
2. O ejecuta manualmente:

```sql
INSERT INTO users (username, email, role) VALUES 
('admin', 'admin@gestagent.com', 'admin'),
('demo', 'demo@gestagent.com', 'operador');
```

## 📊 Vista del Dashboard

Se crea una vista `document_summary` que combina información de:
- Documentos
- Usuarios
- Métricas de procesamiento

Útil para el dashboard principal.

## 🔧 Función de estadísticas

La función `get_dashboard_stats()` devuelve:
- Total de documentos
- Documentos por estado
- Tiempo promedio de procesamiento
- Uso de cada estrategia (llama-only vs híbrido)

Uso: `SELECT * FROM get_dashboard_stats(user_id);`
