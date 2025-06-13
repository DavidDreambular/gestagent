# Configuración de Puertos - GestAgent

## Arquitectura del Sistema

GestAgent utiliza Next.js 14 que maneja tanto el frontend como el backend (API routes) en una única aplicación, siguiendo las mejores prácticas de desarrollo moderno.

## Puertos Configurados

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| **Next.js App** | 2200 | Frontend + API Routes |
| **PostgreSQL** | 5432 | Base de datos principal |

## Configuración

### Variables de Entorno (.env.local)
```env
NEXTAUTH_URL=http://localhost:2200
API_URL=http://localhost:2200
NEXT_PUBLIC_API_URL=http://localhost:2200
```

### Scripts de NPM
```json
{
  "scripts": {
    "dev": "next dev -p 2200",     // Desarrollo
    "build": "next build",          // Build de producción
    "start": "next start -p 2200"   // Producción
  }
}
```

## Iniciar Servicios

### 1. Base de Datos PostgreSQL
```bash
# Verificar que PostgreSQL esté corriendo
sudo systemctl status postgresql

# Si no está activo, iniciarlo
sudo systemctl start postgresql
```

### 2. Aplicación Next.js
```bash
# Modo desarrollo
npm run dev

# Modo producción
npm run build
npm run start
```

## URLs de Acceso

### Frontend
- **Dashboard**: http://localhost:2200/dashboard
- **Login**: http://localhost:2200/
- **Portal Proveedores**: http://localhost:2200/portal

### API Routes
- **Auth**: http://localhost:2200/api/auth/*
- **Documents**: http://localhost:2200/api/documents/*
- **Suppliers**: http://localhost:2200/api/suppliers/*
- **Customers**: http://localhost:2200/api/customers/*
- **API v1**: http://localhost:2200/api/v1/*

## Ventajas de esta Arquitectura

1. **Simplicidad**: Una sola aplicación maneja todo
2. **Performance**: No hay overhead de proxy entre servicios
3. **Desarrollo**: Hot reload automático para frontend y backend
4. **Despliegue**: Un solo proceso para gestionar
5. **SEO**: Server-side rendering nativo de Next.js

## Notas Importantes

- Next.js maneja automáticamente las rutas `/api/*` como endpoints backend
- El middleware de autenticación protege tanto páginas como API routes
- Los archivos estáticos se sirven desde `/public`
- Las uploads de archivos se guardan en `/uploads`