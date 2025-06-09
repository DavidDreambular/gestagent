const { config } = require('dotenv');
const path = require('path');

// Cargar .env.local de forma más explícita
const result = config({ path: path.resolve('.env.local') });

if (result.error) {
  console.log('❌ Error cargando .env.local:', result.error.message);
  process.exit(1);
}

console.log('🔍 Verificando Variables de Entorno para GestAgent');
console.log('=' .repeat(50));

const envVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY', 
  'SUPABASE_SERVICE_ROLE_KEY',
  'MISTRAL_API_KEY',
  'OPENROUTER_API_KEY',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL'
];

let allGood = true;

envVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '❌';
  const length = value ? `(${value.length} chars)` : '(no definida)';
  console.log(`${status} ${varName}: ${length}`);
  
  if (!value) {
    allGood = false;
  }
  
  if (value && varName.includes('KEY')) {
    console.log(`   Valor: ${value.substring(0, 20)}...`);
  }
});

console.log('=' .repeat(50));

// Verificar configuración específica
if (allGood) {
  console.log('✅ Todas las variables están configuradas correctamente');
  console.log('✅ El sistema está listo para funcionar');
} else {
  console.log('❌ PROBLEMA: Algunas variables no están configuradas');
  console.log('💡 Solución: Verifica tu archivo .env.local');
  console.log('📁 Ubicación esperada:', path.resolve('.env.local'));
}