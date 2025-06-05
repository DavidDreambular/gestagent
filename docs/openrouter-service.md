# OpenRouter Service - Llama 3.2 90B Vision

## 📋 Descripción

El servicio `OpenRouterService` conecta con OpenRouter API para utilizar Llama 3.2 90B Vision en lugar de GPT-4o, proporcionando validación y estructuración de documentos financieros con capacidades de visión.

## 🎯 Características

### Capacidades Principales
- **Validación de datos extraídos**: Valida y estructura JSONs de Mistral OCR
- **Visión directa**: Procesa PDFs como imágenes sin OCR previo
- **Retry automático**: Reintentos con backoff exponencial
- **Cálculo de confianza**: Evalúa la calidad de la extracción

### Ventajas de Llama 3.2 90B Vision
- 🎯 Excelente comprensión de documentos en español
- 👁️ Capacidades de visión nativas para PDFs
- 💰 Costo competitivo ($0.90/M tokens)
- 🚀 Respuestas rápidas y consistentes

## 🔧 Configuración

### Variables de Entorno Requeridas
```env
OPENROUTER_API_KEY=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
OPENROUTER_MODEL=meta-llama/llama-3.2-90b-vision-instruct
OPENROUTER_API_URL=https://openrouter.ai/api/v1
RAILWAY_PUBLIC_DOMAIN=gestagent-app-production.up.railway.app
```

### Headers Requeridos
- `Authorization`: Bearer token
- `HTTP-Referer`: URL de tu aplicación
- `X-Title`: Nombre de tu aplicación

## 💻 Uso

### Validación de Datos Extraídos
```typescript
import { createOpenRouterService } from '@/services/openrouter';

const service = createOpenRouterService(
  process.env.OPENROUTER_API_KEY!,
  process.env.OPENROUTER_MODEL!
);

// Validar JSON de Mistral
const result = await service.validateAndStructureData(
  rawJson,      // JSON extraído por Mistral
  rawText,      // Texto crudo del PDF
  'factura'     // Tipo de documento
);

console.log('Documento estructurado:', result.result);
console.log('Confianza:', result.confidence);
```

### Visión Directa (PDF como Imagen)
```typescript
// Procesar PDF directamente sin OCR previo
const result = await service.extractAndValidate(
  pdfBuffer,    // Buffer del PDF
  'factura'     // Tipo de documento (opcional)
);
```

### Compatibilidad con Servicio Anterior
```typescript
// Para reemplazar OpenAI sin cambiar código
import { OpenRouterValidationService } from '@/services/openrouter';

const validationService = new OpenRouterValidationService(
  apiKey,
  model,
  apiUrl
);
```

## 📊 Estructura de Respuesta

```typescript
interface ValidationResponse {
  result: FinancialDocument;    // Documento estructurado
  dialog: string;               // Respuesta raw del modelo
  confidence?: number;          // 0-1, nivel de confianza
  processingTime?: number;      // Tiempo en ms
}
```

## 🔄 Estrategias de Procesamiento

### 1. Validación de OCR
- **Entrada**: JSON + texto de Mistral OCR
- **Proceso**: Llama valida y corrige errores
- **Salida**: JSON estructurado y validado
- **Tiempo**: ~2-3 segundos

### 2. Visión Directa
- **Entrada**: PDF como imagen base64
- **Proceso**: Llama extrae directamente
- **Salida**: JSON estructurado
- **Tiempo**: ~3-5 segundos

## 📈 Métricas de Confianza

El servicio calcula confianza basándose en:
- Campos principales completos (número, fecha)
- Información de emisor/receptor
- Items con importes
- Totales calculados correctamente

**Escala**:
- >90%: Excelente, todos los campos críticos
- 70-90%: Buena, mayoría de campos
- <70%: Revisar, pueden faltar datos importantes

## 🚨 Manejo de Errores

### Retry Automático
- 3 intentos por defecto
- Delay incremental: 1s, 2s, 3s
- Logging detallado de errores

### Tipos de Error
- `API_ERROR`: Problema con OpenRouter
- `PARSING_ERROR`: Respuesta mal formada
- `TIMEOUT_ERROR`: Tiempo excedido (30s)
- `VALIDATION_ERROR`: Datos inconsistentes

## 💰 Costos

### Llama 3.2 90B Vision
- **Entrada**: $0.90 por millón de tokens
- **Salida**: $0.90 por millón de tokens
- **Promedio por documento**: ~$0.002-0.005

### Comparación
- GPT-4o: ~10x más caro
- Llama 3.2 11B Vision: ~16x más barato pero menos preciso

## 🔍 Debugging

### Logging
```typescript
// El servicio incluye interceptores para logging
[OpenRouter] Request to /chat/completions
[OpenRouter] Response received, status: 200
```

### Verificar Modelo
```typescript
const modelInfo = await service.getModelInfo();
console.log('Modelos disponibles:', modelInfo);
```

## ⚡ Optimización

### Parámetros Ajustables
```typescript
temperature: 0.1,    // Baja para consistencia
max_tokens: 2000,    // Ajustar según documento
top_p: 0.95,        // Balance creatividad/precisión
```

### Tips de Rendimiento
1. Usar modo visión solo para PDFs de alta calidad
2. Limitar páginas para documentos largos
3. Cachear respuestas cuando sea posible
4. Monitorear métricas de confianza

## 🧪 Testing

Ejecutar pruebas:
```bash
npm run test:openrouter
```

El test verifica:
- Validación de datos extraídos
- Estructura de respuesta
- Cálculo de confianza
- Manejo de errores
