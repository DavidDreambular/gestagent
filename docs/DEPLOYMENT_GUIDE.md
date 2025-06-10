# 🚀 Guía de Despliegue - GestAgent V3.1

## 📚 **Índice**
1. [Preparación Previa](#preparación-previa)
2. [Despliegue en Vercel](#despliegue-en-vercel)
3. [Despliegue en Railway](#despliegue-en-railway)
4. [Configuración de Base de Datos](#configuración-de-base-de-datos)
5. [Variables de Entorno](#variables-de-entorno)
6. [Configuración de APIs Externas](#configuración-de-apis-externas)
7. [Post-Despliegue](#post-despliegue)
8. [Monitoreo y Mantenimiento](#monitoreo-y-mantenimiento)

---

## 🎯 **Preparación Previa**

### **Requisitos**
- Node.js 18+
- Cuenta de Supabase
- Cuenta de Vercel o Railway
- API Key de Mistral AI
- Código fuente del proyecto

### **Checklist Pre-Despliegue**
- [ ] ✅ Código fuente actualizado en repositorio
- [ ] ✅ Variables de entorno configuradas
- [ ] ✅ Base de datos Supabase creada
- [ ] ✅ APIs externas configuradas
- [ ] ✅ Dominio configurado (opcional)

---

## ☁️ **Despliegue en Vercel (Recomendado)**

### **1. Instalación de Vercel CLI**
```bash
npm i -g vercel
vercel login
```

### **2. Configuración del Proyecto**
```bash
# En el directorio del proyecto
vercel init

# Seguir las instrucciones:
# ? Set up and deploy "~/gestagent"? [Y/n] y
# ? Which scope do you want to deploy to? [tu-usuario]
# ? Link to existing project? [y/N] n
# ? What's your project's name? gestagent-v3
# ? In which directory is your code located? ./
```

### **3. Configuración de Variables de Entorno**
```bash
# Configurar variables una por una
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add MISTRAL_API_KEY
# vercel env add OPENAI_API_KEY # Ya no necesario - solo Mistral AI
vercel env add NEXTAUTH_SECRET
vercel env add NEXTAUTH_URL
```

### **4. Configuración de vercel.json**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "functions": {
    "app/api/documents/upload/route.ts": {
      "maxDuration": 30
    },
    "app/api/documents/ocr/*/route.ts": {
      "maxDuration": 60
    }
  },
  "env": {
    "NODE_ENV": "production"
  },
  "regions": ["fra1"]
}
```

### **5. Despliegue**
```bash
# Despliegue de desarrollo
vercel

# Despliegue de producción
vercel --prod
```

---

## 🚄 **Despliegue en Railway**

### **1. Instalación de Railway CLI**
```bash
npm install -g @railway/cli
railway login
```

### **2. Inicialización del Proyecto**
```bash
railway init
# Seleccionar: "Empty Project"
# Nombre: "gestagent-v3"
```

### **3. Configuración con railway.json**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run start",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  },
  "environments": {
    "production": {
      "variables": {
        "NODE_ENV": "production",
        "PORT": "3000"
      }
    }
  }
}
```

### **4. Configuración de Variables**
```bash
# Configurar variables de entorno
railway variables set NEXT_PUBLIC_SUPABASE_URL=your_url
railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
railway variables set SUPABASE_SERVICE_ROLE_KEY=your_service_key
railway variables set MISTRAL_API_KEY=your_mistral_key
# railway variables set OPENAI_API_KEY=your_openai_key # Ya no necesario - solo Mistral AI
railway variables set NEXTAUTH_SECRET=your_secret
railway variables set NEXTAUTH_URL=https://your-app.railway.app
```

### **5. Despliegue**
```bash
# Conectar repositorio
railway link

# Desplegar
railway up
```

---

## 🗄️ **Configuración de Base de Datos**

### **1. Crear Proyecto en Supabase**
1. Ve a [supabase.com](https://supabase.com)
2. Crea un nuevo proyecto
3. Anota la URL y las API Keys

### **2. Ejecutar Schema SQL**
```sql
-- Crear tablas principales
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'contable', 'gestor', 'operador', 'supervisor')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    phone VARCHAR(20),
    department VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    last_login TIMESTAMP WITH TIME ZONE
);

CREATE TABLE documents (
    job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type VARCHAR(50) NOT NULL,
    raw_json JSONB,
    processed_json JSONB NOT NULL,
    upload_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES users(user_id),
    status VARCHAR(20) DEFAULT 'pending',
    emitter_name VARCHAR(255),
    receiver_name VARCHAR(255),
    document_date DATE,
    total_amount DECIMAL(12,2),
    currency VARCHAR(3) DEFAULT 'EUR',
    version INTEGER DEFAULT 1,
    file_path TEXT
);

CREATE TABLE audit_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(job_id),
    user_id UUID REFERENCES users(user_id),
    action VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    details JSONB,
    ip_address INET
);
```

### **3. Configurar RLS (Row Level Security)**
```sql
-- Habilitar RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para documentos
CREATE POLICY "Users can view own documents" ON documents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all documents" ON documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Políticas para usuarios
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all users" ON users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );
```

### **4. Crear Índices para Performance**
```sql
-- Índices GIN para JSONB
CREATE INDEX idx_documents_raw_json ON documents USING GIN (raw_json);
CREATE INDEX idx_documents_processed_json ON documents USING GIN (processed_json);

-- Índices B-tree para columnas denormalizadas
CREATE INDEX idx_documents_emitter_name ON documents (emitter_name);
CREATE INDEX idx_documents_document_date ON documents (document_date);
CREATE INDEX idx_documents_status ON documents (status);
CREATE INDEX idx_documents_user_id ON documents (user_id);
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_role ON users (role);
```

---

## 🔑 **Variables de Entorno**

### **Archivo .env.local (Desarrollo)**
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# APIs de IA
MISTRAL_API_KEY=your-mistral-api-key
OPENAI_API_KEY=your-openai-api-key

# NextAuth
NEXTAUTH_SECRET=your-nextauth-secret-min-32-chars
NEXTAUTH_URL=http://localhost:3000

# General
API_URL=http://localhost:3000/api
NODE_ENV=development
```

### **Variables de Producción**
```env
# Supabase (mismas keys)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# APIs de IA (mismas keys)
MISTRAL_API_KEY=your-mistral-api-key
OPENAI_API_KEY=your-openai-api-key

# NextAuth (IMPORTANTE: cambiar URL)
NEXTAUTH_SECRET=your-nextauth-secret-min-32-chars
NEXTAUTH_URL=https://your-production-domain.com

# General
API_URL=https://your-production-domain.com/api
NODE_ENV=production
```

---

## 🔌 **Configuración de APIs Externas**

### **1. Mistral AI**
1. Ve a [console.mistral.ai](https://console.mistral.ai)
2. Crea una cuenta y obtén API key
3. Configura límites de uso si es necesario

### **2. Mistral AI (Primario)**
1. Ve a [console.mistral.ai](https://console.mistral.ai)
2. Crea una cuenta y obtén API key
3. Asegúrate de tener créditos disponibles
4. Configura límites de uso para Document Understanding API

### **3. Configuración de CORS (Si es necesario)**
```javascript
// next.config.js
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://your-domain.com' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};
```

---

## ✅ **Post-Despliegue**

### **1. Verificación de Salud del Sistema**
```bash
# Verificar que la aplicación responda
curl https://your-domain.com/api/health

# Respuesta esperada:
# {
#   "status": "healthy",
#   "timestamp": "2024-12-19T...",
#   "services": {
#     "database": "up",
#     "auth": "up"
#   }
# }
```

### **2. Crear Usuario Administrador**
```sql
-- Ejecutar en Supabase SQL Editor
INSERT INTO users (username, email, role, status)
VALUES ('admin', 'admin@your-company.com', 'admin', 'active');
```

### **3. Testing de Funcionalidades Críticas**

#### **Testing con cURL**
```bash
# 1. Test de registro
curl -X POST https://your-domain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "testpassword123",
    "role": "operador"
  }'

# 2. Test de login
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123"
  }'

# 3. Test de upload (requiere token)
curl -X POST https://your-domain.com/api/documents/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@test-invoice.pdf" \
  -F "document_type=factura"
```

### **4. Configuración de Dominio Personalizado**

#### **En Vercel**
1. Ve a Project Settings → Domains
2. Añade tu dominio personalizado
3. Configura DNS según instrucciones
4. Actualiza NEXTAUTH_URL

#### **En Railway**
1. Ve a Settings → Domains
2. Añade custom domain
3. Configura DNS CNAME
4. Actualiza variables de entorno

---

## 📊 **Monitoreo y Mantenimiento**

### **1. Logging**
```javascript
// Configurar logging estructurado
const logger = {
  info: (message, meta) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  },
  error: (message, error, meta) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error?.message,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  }
};
```

### **2. Métricas de Performance**
- **Tiempo de respuesta de APIs**: < 2 segundos
- **Tiempo de procesamiento de documentos**: < 30 segundos
- **Disponibilidad**: > 99.5%
- **Tasa de éxito de OCR**: > 85%

### **3. Alertas Automáticas**
```javascript
// Endpoint de health check mejorado
export async function GET() {
  try {
    const checks = await Promise.all([
      checkDatabase(),
      checkAuth(),
      checkExternalAPIs()
    ]);
    
    const allHealthy = checks.every(check => check.status === 'up');
    
    return Response.json({
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: checks.reduce((acc, check) => ({
        ...acc,
        [check.service]: check.status
      }), {})
    }, {
      status: allHealthy ? 200 : 503
    });
  } catch (error) {
    return Response.json({
      status: 'unhealthy',
      error: error.message
    }, { status: 500 });
  }
}
```

### **4. Backup y Recuperación**
```bash
# Backup de base de datos Supabase
# (Automático, pero verificar configuración en dashboard)

# Backup de archivos importantes
# - Variables de entorno
# - Configuración de despliegue
# - Documentación actualizada
```

### **5. Actualizaciones**
```bash
# Proceso de actualización
git pull origin main
npm install
npm run build
vercel --prod  # o railway up
```

---

## 🚨 **Troubleshooting Común**

### **Error: Environment variables not set**
```bash
# Verificar variables
vercel env ls
# o
railway variables

# Re-configurar si es necesario
vercel env add VARIABLE_NAME
```

### **Error: Database connection failed**
- Verificar URL y keys de Supabase
- Comprobar RLS policies
- Verificar network en Supabase dashboard

### **Error: AI API rate limit**
- Verificar créditos en OpenAI/Mistral
- Implementar retry logic
- Configurar límites de requests

### **Error: File upload too large**
```javascript
// next.config.js
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['canvas']
  },
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};
```

---

## 📞 **Soporte Post-Despliegue**

### **Contactos de Emergencia**
- **Supabase Support**: support@supabase.io
- **Vercel Support**: support@vercel.com
- **Railway Support**: team@railway.app

### **Recursos Útiles**
- [Documentación de Next.js](https://nextjs.org/docs)
- [Documentación de Supabase](https://supabase.com/docs)
- [Guías de Vercel](https://vercel.com/docs)
- [Documentación de Railway](https://docs.railway.app)

---

**Guía creada por**: Equipo de Desarrollo GestAgent  
**Última actualización**: 19 de Diciembre, 2024  
**Versión**: 1.0 