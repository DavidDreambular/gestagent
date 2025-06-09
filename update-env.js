const fs = require('fs');

// Leer archivo actual
let envContent = '';
try {
  envContent = fs.readFileSync('.env.local', 'utf8');
  console.log('📄 Archivo .env.local actual:');
  console.log(envContent);
} catch (error) {
  console.log('⚠️ No se pudo leer .env.local, creando nuevo...');
}

// Crear contenido actualizado
const newEnvContent = `# ===============================================
# GESTAGENT - Configuración Ambiente Local
# ===============================================

# ===== DATABASE (PostgreSQL) =====
DATABASE_URL=postgresql://gestagent_user:gestagent_pass_2024@localhost:5433/gestagent
POSTGRESQL_URL=postgresql://gestagent_user:gestagent_pass_2024@localhost:5433/gestagent

# ===== NEXTAUTH =====
NEXTAUTH_URL=http://localhost:3002
NEXTAUTH_SECRET=gestagent-secret-key-super-secure-2024

# ===== API KEYS (Replace with real keys) =====
MISTRAL_API_KEY=your-mistral-api-key-here
OPENAI_API_KEY=your-openai-api-key-here

# ===== APP CONFIG =====
NODE_ENV=development
API_URL=http://localhost:3002/api
NEXT_PUBLIC_APP_URL=http://localhost:3002

# ===== DEBUG =====
DEBUG=true
NEXT_PUBLIC_DEBUG=true
`;

// Escribir archivo actualizado
fs.writeFileSync('.env.local', newEnvContent);
console.log('\n✅ Archivo .env.local actualizado con puerto 3002');
console.log('\n🔄 Reinicia el servidor para aplicar cambios:');
console.log('   Ctrl+C para parar el servidor actual');
console.log('   npm run dev');
console.log('\n🌐 Luego accede a: http://localhost:3002/auth/login'); 