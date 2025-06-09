const fs = require('fs');

const envContent = `# PostgreSQL Configuration for GestAgent
# Generated automatically on ${new Date().toISOString()}

# Database Configuration
DATABASE_URL=postgresql://gestagent_user:gestagent_pass_2024@localhost:5433/gestagent
POSTGRES_HOST=localhost
POSTGRES_PORT=5433
POSTGRES_DB=gestagent
POSTGRES_USER=gestagent_user
POSTGRES_PASSWORD=gestagent_pass_2024

# Connection Pool Settings
POSTGRES_MAX_CONNECTIONS=20
POSTGRES_IDLE_TIMEOUT=30000
POSTGRES_CONNECTION_TIMEOUT=2000

# Features
POSTGRES_SSL=false
POSTGRES_SSL_REJECT_UNAUTHORIZED=false

# External APIs
MISTRAL_API_KEY=JITyrx8a7QaG8Wxj0XOqDRtgqmKUeOzr
OPENROUTER_API_KEY=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

# NextAuth Configuration
NEXTAUTH_SECRET=tu-secreto-super-seguro-de-32-caracteres-minimo-para-jwt-sessions
NEXTAUTH_URL=http://localhost:3000

# Migration Status
POSTGRESQL_MIGRATED=true
POSTGRESQL_SETUP_DATE=${new Date().toISOString()}
USE_POSTGRESQL=true
USE_SUPABASE=false
`;

fs.writeFileSync('.env.local', envContent, 'utf8');
console.log('✅ Archivo .env.local creado correctamente');
console.log('📄 Configuración PostgreSQL activada');
console.log('🚫 Configuración Supabase desactivada'); 