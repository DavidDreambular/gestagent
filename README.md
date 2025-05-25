# GESTAGENT

Sistema integral de digitalización de documentos financieros usando IA (Mistral + GPT-4o).

## Características

- 📄 **Procesamiento Automático**: Extrae datos de PDFs usando Mistral OCR y valida con GPT-4o
- 📊 **Reportes Avanzados**: Genera reportes detallados y análisis estadísticos
- 🔒 **Seguridad Avanzada**: Autenticación robusta y control de acceso basado en roles
- ⚡ **Integración Fácil**: Conecta con sistemas contables y exporta en múltiples formatos

## Stack Tecnológico

- **Frontend**: Next.js 14 + TypeScript + TailwindCSS + shadcn/ui
- **Backend**: Next.js API Routes + Supabase
- **Base de Datos**: PostgreSQL (Supabase)
- **IA**: Mistral OCR + OpenAI GPT-4o
- **Autenticación**: Supabase Auth
- **Despliegue**: Railway

## Instalación

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/DavidDreambular/gestagent.git
   cd gestagent
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**:
   ```bash
   cp .env.example .env.local
   ```
   
   Edita `.env.local` con tus credenciales:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=tu-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
   
   # AI Services
   OPENAI_API_KEY=tu-openai-api-key
   MISTRAL_API_KEY=tu-mistral-api-key
   
   # NextAuth
   NEXTAUTH_SECRET=tu-nextauth-secret
   NEXTAUTH_URL=http://localhost:3000
   ```

4. **Ejecutar en desarrollo**:
   ```bash
   npm run dev
   ```

5. **Visitar la aplicación**:
   Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Estructura del Proyecto

```
gestagent/
├── app/                    # App Router de Next.js
│   ├── api/                # API Routes
│   ├── auth/               # Páginas de autenticación
│   ├── dashboard/          # Páginas del dashboard
│   └── globals.css         # Estilos globales
├── components/            # Componentes React
│   ├── ui/                 # Componentes UI base
│   └── dashboard/          # Componentes del dashboard
├── contexts/              # Contextos de React
├── lib/                   # Utilidades y configuración
├── services/              # Servicios externos (AI, etc.)
└── types/                 # Definiciones de tipos TypeScript
```

## Uso

### 1. Registro y Autenticación
- Crea una cuenta en `/auth/register`
- Inicia sesión en `/auth/login`
- Los roles disponibles son: admin, contable, gestor, operador, supervisor

### 2. Subir Documentos

- Ve a **Dashboard > Nuevo Documento**
- Sube un PDF de factura, nómina, recibo, etc.
- El sistema procesará automáticamente el documento
- Revisa y valida la información extraída

### 3. Gestionar Documentos

- Ve a **Dashboard > Documentos** para ver todos los documentos
- Filtra por tipo, estado, fecha, etc.
- Edita la información de cualquier documento
- Exporta datos a CSV, Excel, etc.

### 4. Reportes

- Ve a **Dashboard > Reportes** para generar análisis
- Crea reportes personalizados
- Exporta gráficos y estadísticas

## Contribuir

1. Haz fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-caracteristica`)
3. Commit tus cambios (`git commit -m 'Añadir nueva característica'`)
4. Push a la rama (`git push origin feature/nueva-caracteristica`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## Soporte

Si tienes preguntas o necesitas ayuda, puedes:

- Abrir un issue en GitHub
- Contactar al equipo de desarrollo

---

**GESTAGENT** - Digitalización inteligente de documentos financieros 🚀