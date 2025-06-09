const fs = require('fs');

console.log('🔧 Creando .env.local con credenciales correctas...\n');

// Basado en el éxito del script debug-auth-temp.js, estas credenciales funcionan
const envContent = `# PostgreSQL Configuration for GestAgent
# Auto-generated with working credentials

# Database Configuration - CONFIRMED WORKING
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/gestagent
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=gestagent
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

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

try {
  fs.writeFileSync('.env.local', envContent);
  console.log('✅ Archivo .env.local creado exitosamente!');
  console.log('📄 Credenciales: postgres:postgres@localhost:5432/gestagent');
  console.log('🔄 IMPORTANTE: Reinicia la aplicación Next.js para aplicar cambios');
  console.log('💡 Comando: Ctrl+C en terminal y luego npm run dev');
} catch (error) {
  console.error('❌ Error creando .env.local:', error.message);
  console.log('\n📝 Contenido para crear manualmente:');
  console.log(envContent);
}

console.log('\n🚀 Una vez reiniciada la aplicación, podrás hacer login con:');
console.log('   Email: admin@gestagent.com');
console.log('   Password: password123'); 