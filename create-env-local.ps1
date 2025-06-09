# PowerShell script to create .env.local with working PostgreSQL credentials
# Based on successful debug-auth-temp.js script results

$envContent = @"
# PostgreSQL Configuration for GestAgent
# Auto-generated on $(Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ")

# Database Configuration - Using working credentials from debug
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
NEXTAUTH_URL=http://localhost:3002

# Migration Status
POSTGRESQL_MIGRATED=true
POSTGRESQL_SETUP_DATE=$(Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ")
USE_POSTGRESQL=true
USE_SUPABASE=false
"@

try {
    $envContent | Out-File -FilePath ".env.local" -Encoding UTF8
    Write-Host "✅ Archivo .env.local creado exitosamente!"
    Write-Host "📄 Credenciales: postgres:postgres@localhost:5432/gestagent"
    Write-Host "🔄 Reiniciar aplicación para aplicar cambios"
} catch {
    Write-Host "❌ Error creando .env.local: $($_.Exception.Message)"
    Write-Host "📝 Contenido para crear manualmente:"
    Write-Host $envContent
} 