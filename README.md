# 🚀 GestAgent - Sistema Integral de Digitalización de Documentos Financieros

[![Next.js](https://img.shields.io/badge/Next.js-14.0+-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Mistral AI](https://img.shields.io/badge/Mistral_AI-Document_AI-orange?style=flat-square)](https://mistral.ai/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.0+-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)

> **Sistema profesional para gestorías que automatiza la digitalización y extracción de datos de documentos financieros (facturas, nóminas) usando IA.**

## 🎯 **Características Principales**

### 🤖 **Procesamiento Inteligente con IA**
- **Mistral Document AI**: OCR avanzado y extracción de datos estructurados con Document Understanding API
- **Procesamiento Inteligente**: Análisis PDF automático para determinar estrategia óptima de procesamiento
- **Plantillas Inteligentes**: Sistema que aprende de correcciones para mejores extracciones futuras
- **Detección de Duplicados**: Previene procesamiento de documentos repetidos
- **Multi-documento**: Capacidad de procesar PDFs con múltiples facturas

### 👥 **Gestión Completa de Usuarios**
- **Roles Granulares**: Admin, Contable, Gestor, Operador, Supervisor
- **Dashboard Personalizado**: Cada usuario ve solo su información relevante
- **Autenticación Segura**: Sistema robusto con JWT y sesiones
- **Portal de Proveedores COMPLETO**: Dashboard profesional, upload directo, seguimiento tiempo real

### 📊 **Dashboard y Visualización**
- **Vista Resumen**: KPIs, estadísticas y gráficos en tiempo real
- **Lista Interactiva**: Búsqueda, filtrado y ordenación avanzada
- **Vista Detallada**: Información completa con edición en tiempo real
- **Panel de Debug**: Visualización del JSON crudo y proceso de IA
- **UX Moderna**: Efectos glassmorphism, animaciones Stripe, micro-interactions

### 🔧 **Productividad Avanzada**
- **Procesamiento Masivo**: Subida y procesamiento paralelo de múltiples PDFs
- **Auto-guardado**: Los cambios se guardan automáticamente cada 3 segundos
- **Atajos de Teclado**: Navegación rápida (Ctrl+K, Ctrl+N, etc.)
- **Búsqueda Global**: Búsqueda inteligente con fuzzy matching
- **Entity Matching**: Vinculación automática de facturas con proveedores/clientes
- **Bulk Operations**: Operaciones masivas con validación de dependencias

### 📋 **Exportación y Reportes**
- **Exportación Masiva**: Excel, CSV, y formatos compatibles con software contable
- **Integración SAGE**: Exportación directa a formato SAGE 50c
- **Reportes Analíticos**: Estadísticas y tendencias de documentos
- **Auditoría Completa**: Registro detallado de todas las acciones

### 🔒 **Seguridad y Auditoría**
- **Logs de Auditoría**: Registro completo de acciones con timestamps
- **Control de Acceso**: Permisos granulares por rol y recurso
- **Backup Automático**: Sistema configurable de respaldos
- **Notificaciones**: Sistema completo en tiempo real con badges animados
- **Portal Seguro**: Autenticación independiente para proveedores

## 🏗️ **Arquitectura Técnica**

### **Frontend**
- **Framework**: Next.js 14+ con App Router
- **Lenguaje**: TypeScript para máxima seguridad de tipos
- **Estilos**: TailwindCSS + shadcn/ui para componentes modernos
- **Estado**: React Context + Hooks personalizados
- **Validación**: Zod para schemas y validación de datos

### **Backend**
- **API**: Next.js API Routes con middleware personalizado
- **Base de Datos**: PostgreSQL con consultas optimizadas
- **Autenticación**: JWT + bcrypt para máxima seguridad
- **Procesamiento**: Queue system para documentos masivos
- **Almacenamiento**: Sistema híbrido (DB + archivos)

### **Inteligencia Artificial**
- **Motor Principal**: Mistral Document AI con Document Understanding API
- **Análisis Inteligente**: Sistema de análisis PDF para optimizar procesamiento
- **Aprendizaje**: Sistema de plantillas que mejora con el uso
- **Procesamiento**: Paralelo y asíncrono para máximo rendimiento
- **Multi-estrategia**: Adaptación automática según tipo de documento

## 🚀 **Instalación y Configuración**

### **Prerrequisitos**
```bash
# Requerimientos del sistema
- Node.js 18.0+
- PostgreSQL 15+
- API Key: Mistral AI
```

### **Configuración de Puertos**
El sistema utiliza los siguientes puertos:
- **Aplicación (Frontend + Backend)**: Puerto 2200
- **Base de datos PostgreSQL**: Puerto 5432 (estándar)

### **1. Clonar el Repositorio**
```bash
git clone https://github.com/tu-usuario/gestagent.git
cd gestagent
```

### **2. Instalar Dependencias**
```bash
npm install
```

### **3. Configurar Base de Datos**
```bash
# Ejecutar scripts de migración
node scripts/setup-postgresql.js

# Crear usuarios de prueba
node scripts/create-test-users.js
```

### **4. Variables de Entorno**
```bash
# Copiar el archivo de ejemplo
cp .env.example .env.local

# Configurar las siguientes variables:
DATABASE_URL="postgresql://user:password@localhost:5432/gestagent"
MISTRAL_API_KEY="tu_api_key_mistral"
NEXTAUTH_SECRET="tu_secret_jwt"
NEXTAUTH_URL="http://localhost:3000"
```

### **5. Ejecutar el Proyecto**
```bash
# Desarrollo
npm run dev

# Producción
npm run build
npm start
```

## 📖 **Documentación Completa**

### **Guías de Usuario**
- 📚 [Guía de Instalación](./docs/installation.md)
- 🎯 [Manual de Usuario](./docs/user-manual.md)
- 👨‍💼 [Guía de Administrador](./docs/admin-guide.md)
- 🏢 [Portal de Proveedores](./docs/provider-portal.md)

### **Documentación Técnica**
- 🔧 [API Reference](./docs/api-reference.md)
- 🏗️ [Arquitectura del Sistema](./docs/architecture.md)
- 🔌 [Sistema de Plugins](./docs/plugins.md)
- 📊 [Modelos de Datos](./docs/data-models.md)

### **Integraciones**
- 💼 [Integración SAGE](./docs/sage-integration.md)
- 🤖 [Configuración IA](./docs/ai-configuration.md)
- 📧 [Sistema de Notificaciones](./docs/notifications.md)
- 🔄 [Backup y Migración](./docs/backup-migration.md)

## 🎨 **Screenshots**

### Dashboard Principal
![Dashboard](docs/images/dashboard.png)

### Procesamiento de Documentos
![Upload](docs/images/document-processing.png)

### Vista de Documento Individual
![Document Detail](docs/images/document-detail.png)

### Portal de Proveedores
![Provider Portal](docs/images/provider-portal.png)

## 📊 **Estadísticas del Proyecto**

- **Líneas de Código**: 30,000+ (TypeScript/JavaScript)
- **Componentes**: 100+ componentes reutilizables
- **APIs**: 50+ endpoints RESTful
- **Servicios**: 15+ servicios especializados
- **Completitud**: 96% funcionalidades implementadas
- **Estado**: LISTO PARA PRODUCCIÓN

## 🎯 **Estado Actual del Proyecto**

### ✅ **COMPLETADO Y FUNCIONANDO**
- 🤖 **Procesamiento IA**: 98% - Mistral AI + Entity Matching
- 👥 **Gestión Usuarios**: 95% - Roles + Portal Proveedores
- 🎭 **UX/UI**: 95% - Efectos modernos + Responsive
- 📊 **Dashboard**: 90% - KPIs + Visualización tiempo real
- 🔧 **CRM**: 95% - Proveedores + Clientes + Estadísticas
- 📋 **Exportaciones**: 98% - SAGE + Excel + CSV
- 🔔 **Notificaciones**: 90% - Tiempo real + Email

### 🚧 **PENDIENTE (Opcional)**
- ⚙️ **Panel Configuración**: 20% - Página da 404 (ALTA PRIORIDAD)
- 🔌 **API Pública**: 0% - Para integraciones externas
- 📱 **Mobile App**: 15% - PWA cubre necesidades actuales

📋 **Detalles completos**: Ver [PROJECT_STATUS.md](./PROJECT_STATUS.md)

## 🤝 **Contribuir**

¡Las contribuciones son bienvenidas! Por favor:

1. **Fork** el proyecto
2. Crea una **rama** para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. **Commit** tus cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. **Push** a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un **Pull Request**

### **Estándares de Código**
- ESLint + Prettier para formato consistente
- Conventional Commits para mensajes claros
- Tests requeridos para nuevas funcionalidades
- Documentación actualizada

## 📜 **Licencia**

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 🆘 **Soporte**

### **Comunidad**
- 💬 [Discord](https://discord.gg/gestagent)
- 📧 [Email de Soporte](mailto:soporte@gestagent.com)
- 📋 [GitHub Issues](https://github.com/tu-usuario/gestagent/issues)
- 📖 [Wiki del Proyecto](https://github.com/tu-usuario/gestagent/wiki)

### **Soporte Comercial**
Para implementaciones empresariales y soporte dedicado:
- 🏢 [Contacto Empresarial](mailto:enterprise@gestagent.com)
- 📞 Teléfono: +34 XXX XXX XXX

## 🔄 **Changelog**

### **v3.1.0 - Portal Enhancement Suite** (Actual - 15/01/2025)
- ✅ **Portal de Proveedores Completo**: Dashboard, upload, seguimiento tiempo real
- ✅ **UX Enhancement Suite**: Efectos Stripe, glassmorphism, animaciones
- ✅ **Entity Matching System**: Vinculación automática inteligente
- ✅ **Sistema de Notificaciones**: Tiempo real con badges animados
- ✅ **Bulk Operations**: Borrado múltiple con validación
- ✅ **Logo Integration**: GestAgent branding completo
- ✅ **Auto-refresh**: Actualizaciones cada 30 segundos
- ✅ **PWA Ready**: Manifest.json y service worker

### **v3.0.0 - Production Ready** (Diciembre 2024)
- ✅ Entity Matching con algoritmo fuzzy
- ✅ Sistema de plantillas por proveedor
- ✅ Procesamiento paralelo optimizado
- ✅ CRM completo con estadísticas
- ✅ Auditoría simplificada para admins

### **v2.0.0 - PostgreSQL Migration**
- ✅ Migración completa a PostgreSQL
- ✅ Integración con Mistral Document AI
- ✅ Sistema de plantillas inteligentes
- ✅ Portal de proveedores básico
- ✅ Exportación SAGE 50c
- ✅ Sistema de auditoría completo

### **v1.5.0**
- Sistema de roles granulares
- Dashboard personalizable
- Procesamiento masivo de documentos

### **v1.0.0**
- Lanzamiento inicial
- Procesamiento básico de facturas
- Dashboard simple

---

**🔥 Desarrollado con ❤️ para revolucionar la gestión documental en gestorías**

*GestAgent - Haciendo la digitalización inteligente y accesible*