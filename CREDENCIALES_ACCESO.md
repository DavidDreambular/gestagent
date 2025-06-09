# 🔐 CREDENCIALES DE ACCESO - GESTAGENT

## 📊 Estado del Sistema
- ✅ **PostgreSQL**: Conectado en `localhost:5433`
- ✅ **Base de datos**: `gestagent` 
- ✅ **Usuario DB**: `gestagent_user`
- ✅ **Servidor**: `http://localhost:3002`
- ✅ **Archivo .env.local**: Configurado correctamente

## 👥 Usuarios Disponibles

### 🔑 Credenciales Principales
Basado en la investigación de la base de datos, todos los usuarios tienen el mismo hash de contraseña.

**Usuarios confirmados en PostgreSQL:**
- **Admin**: `admin@gestagent.com`
- **Demo**: `demo@gestagent.com` 
- **Contable**: `contable@gestagent.com`
- **Gestor**: `gestor@gestagent.com`

### 🧪 Contraseñas a Probar
Según el patrón del proyecto, prueba estas contraseñas:
1. `admin123`
2. `demo123`
3. `contable123`
4. `gestor123`
5. `password`
6. `123456`

## 🌐 Acceso al Sistema

### 1. Página de Login
```
http://localhost:3002/auth/login
```

### 2. Dashboard Principal
```
http://localhost:3002/dashboard
```

## 🔧 Configuración Actual

### Database URL
```
postgresql://gestagent_user:gestagent_pass_2024@localhost:5433/gestagent
```

### NextAuth
```
NEXTAUTH_URL=http://localhost:3002
NEXTAUTH_SECRET=gestagent-secret-key-super-secure-2024
```

## 📋 Estructura de Base de Datos Confirmada

### Tabla `users`
- `user_id` (UUID, PK)
- `username` (VARCHAR)
- `email` (VARCHAR)
- `role` (VARCHAR)
- `password_hash` (VARCHAR)
- `created_at`, `updated_at` (TIMESTAMP)

### Tabla `documents`
- `id` (INTEGER, PK)
- `job_id` (UUID)
- `document_type` (VARCHAR)
- `raw_json`, `processed_json` (JSONB)
- `user_id` (UUID, FK)
- `status`, `emitter_name`, `receiver_name`
- `document_date`, `total_amount`, `tax_amount`
- Timestamps y metadata

## 🚀 Próximos Pasos

1. **Acceder al sistema**: Usar `http://localhost:3002/auth/login`
2. **Probar credenciales**: Empezar con `admin@gestagent.com` / `admin123`
3. **Verificar dashboard**: Confirmar acceso a `/dashboard`
4. **Probar upload**: Subir el PDF `multiples-facturas.pdf`

## ⚠️ Notas Importantes

- El servidor está en puerto **3002** (no 3000)
- PostgreSQL funciona correctamente
- Todos los usuarios tienen el mismo hash de contraseña
- El sistema está listo para pruebas end-to-end 