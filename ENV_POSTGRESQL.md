# ENV PostgreSQL - Configuración de Producción

## Variables de Entorno Requeridas

```bash
# PostgreSQL Database Configuration
POSTGRES_CONNECTION_STRING=postgresql://username:password@localhost:5432/gestagent_db
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DATABASE=gestagent_db
POSTGRES_USER=gestagent_user
POSTGRES_PASSWORD=your_secure_password

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key-here

# API Keys for Document Processing
MISTRAL_API_KEY=your-mistral-api-key
OPENAI_API_KEY=your-openai-api-key

# Upload Configuration
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=52428800

# Environment
NODE_ENV=production
```

## Configuración para Railway/Vercel

```bash
# Railway Production
POSTGRES_CONNECTION_STRING=postgresql://user:pass@host:port/database
NEXTAUTH_URL=https://your-app.railway.app
```

## Configuración Local con Docker

```bash
# Docker PostgreSQL
POSTGRES_CONNECTION_STRING=postgresql://gestagent_user:gestagent_pass@localhost:5432/gestagent_db
```
