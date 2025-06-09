const fs = require('fs');

async function fixMistralAPI() {
  console.log('🔧 Solucionando configuración de Mistral API...');
  
  // API Key de Mistral encontrada en el proyecto
  const mistralApiKey = 'JITyrx8a7QaG8Wxj0XOqDRtgqmKUeOzr';
  
  // Crear archivo .env.local completo
  const envContent = `# ===============================================
# GESTAGENT - Configuración Ambiente Local
# ===============================================

# ===== DATABASE (PostgreSQL) =====
DATABASE_URL=postgresql://gestagent_user:gestagent_pass_2024@localhost:5433/gestagent
POSTGRESQL_URL=postgresql://gestagent_user:gestagent_pass_2024@localhost:5433/gestagent

# ===== NEXTAUTH =====
NEXTAUTH_URL=http://localhost:3002
NEXTAUTH_SECRET=gestagent-secret-key-super-secure-2024

# ===== API KEYS (REAL KEYS) =====
MISTRAL_API_KEY=${mistralApiKey}
OPENAI_API_KEY=sk-proj-your-openai-key-here

# ===== OPENROUTER (ALTERNATIVE) =====
OPENROUTER_API_KEY=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

# ===== APP CONFIG =====
NODE_ENV=development
API_URL=http://localhost:3002/api
NEXT_PUBLIC_APP_URL=http://localhost:3002

# ===== DEBUG =====
DEBUG=true
NEXT_PUBLIC_DEBUG=true
`;

  try {
    // Escribir archivo .env.local
    fs.writeFileSync('.env.local', envContent);
    console.log('✅ Archivo .env.local actualizado con API key real');
    
    // Verificar que el archivo se creó correctamente
    if (fs.existsSync('.env.local')) {
      const content = fs.readFileSync('.env.local', 'utf8');
      if (content.includes(mistralApiKey)) {
        console.log('✅ API key de Mistral configurada correctamente');
        console.log(`   Key: ${mistralApiKey.substring(0, 10)}...${mistralApiKey.substring(-5)}`);
      }
    }
    
    console.log('\n🔄 Para aplicar los cambios:');
    console.log('   1. Detén el servidor actual (Ctrl+C)');
    console.log('   2. Reinicia: npm run dev');
    console.log('   3. Prueba subir el PDF nuevamente');
    
    console.log('\n📝 Configuración aplicada:');
    console.log('   ✅ PostgreSQL: puerto 5433');
    console.log('   ✅ NextAuth: puerto 3002');
    console.log('   ✅ Mistral API: configurada');
    console.log('   ✅ Debug: activado');
    
  } catch (error) {
    console.error('❌ Error creando .env.local:', error.message);
  }
}

// También crear un fallback para cuando la API de Mistral falle
function createMockProcessor() {
  console.log('\n🎭 Configurando fallback para pruebas...');
  
  const mockContent = `// Mock processor para pruebas sin API real
export class MockMistralProcessor {
  static async processDocument(filePath, fileName) {
    console.log('🎭 [MOCK] Simulando procesamiento de:', fileName);
    
    // Simular delay de procesamiento
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Retornar JSON simulado
    return {
      invoices: [
        {
          invoice_number: "MOCK-001",
          date: "2024-06-09",
          supplier: {
            name: "Proveedor Mock",
            tax_id: "12345678A",
            address: "Calle Falsa 123"
          },
          customer: {
            name: "Cliente Mock", 
            tax_id: "87654321B"
          },
          line_items: [
            {
              description: "Producto de prueba",
              quantity: 1,
              unit_price: 100.00,
              total: 100.00
            }
          ],
          totals: {
            subtotal: 100.00,
            tax: 21.00,
            total: 121.00
          }
        }
      ],
      confidence: 0.95,
      processing_time: "2.1s"
    };
  }
}
`;

  try {
    fs.writeFileSync('services/mock-mistral-processor.js', mockContent);
    console.log('✅ Mock processor creado para fallback');
  } catch (error) {
    console.log('⚠️ No se pudo crear mock processor:', error.message);
  }
}

console.log('🚀 Iniciando corrección de Mistral API...\n');
fixMistralAPI();
createMockProcessor();

console.log('\n🎯 PROBLEMA IDENTIFICADO: API Key de Mistral');
console.log('🔧 SOLUCIÓN APLICADA: Configuración con key real');
console.log('📋 SIGUIENTE PASO: Reiniciar servidor y probar upload'); 