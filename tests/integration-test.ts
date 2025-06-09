// Script de prueba para verificar la integración de adaptadores
// Ejecutar con: npm run test:integration

import { MistralOcrAdapter } from '../infrastructure/adapters/mistral.adapter';
import { TranslationAdapter } from '../infrastructure/adapters/translation.adapter';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

async function testAdapterIntegration() {
  console.log('=== Prueba de Integración de Adaptadores ===\n');
  
  // Verificar variables de entorno
  console.log('1. Verificando configuración:');
  console.log(`   - MISTRAL_API_KEY: ${process.env.MISTRAL_API_KEY ? '✓ Configurado' : '✗ Falta'}`);
  console.log(`   - SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Configurado' : '✗ Falta'}`);
  console.log('');
  
  // Test 1: Adaptador de Traducción (no requiere API externa)
  console.log('2. Probando TranslationAdapter:');
  try {
    const translationAdapter = new TranslationAdapter();
    const testData = {
      document_type: 'factura',
      concepte: 'Servei de desenvolupament',
      import: 1000
    };
    
    const translated = await translationAdapter.translate(testData);
    console.log('   ✓ Traducción ejecutada correctamente');
    console.log(`   - Input: ${JSON.stringify(testData)}`);
    console.log(`   - Output: ${JSON.stringify(translated)}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('   ✗ Error en TranslationAdapter:', errorMessage);
  }
  console.log('');
  
  // Test 2: Adaptador OCR (requiere Mistral API)
  console.log('3. Probando MistralOcrAdapter:');
  try {
    const ocrAdapter = new MistralOcrAdapter();
    console.log('   ✓ Adaptador creado correctamente');
    console.log('   - Listo para procesar PDFs con Mistral OCR');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('   ✗ Error creando MistralOcrAdapter:', errorMessage);
  }
  console.log('');
  
  console.log('=== Fin de las pruebas ===');
  console.log('\nNota: Para pruebas completas con archivos PDF reales,');
  console.log('use el endpoint /api/documents/upload con un PDF de prueba.');
}

// Ejecutar las pruebas
testAdapterIntegration().catch(console.error);
