# Adaptadores de Servicios IA

Este directorio contiene los adaptadores que conectan los servicios externos con la arquitectura DDD del proyecto GESTAGENT.

## Arquitectura

Los adaptadores implementan las interfaces definidas en el dominio y traducen las llamadas a los servicios externos reales:

```
Domain Layer (Interfaces)
    ↓
Infrastructure Layer (Adapters)
    ↓
External Services (Mistral, OpenRouter, etc.)
```

## Adaptadores Implementados

### 1. MistralOcrAdapter
- **Interfaz**: `IOcrService`
- **Servicio Externo**: Mistral OCR API
- **Función**: Extrae texto y estructura de documentos PDF
- **Archivo**: `mistral.adapter.ts`

### 2. OpenRouterAdapter
- **Interfaz**: `IGptService`
- **Servicio Externo**: OpenRouter API (Llama 3.2 90B Vision)
- **Función**: Valida y estructura los datos extraídos por OCR
- **Archivo**: `openrouter.adapter.ts`
- **Nota**: Reemplaza al servicio OpenAI/GPT-4o anterior

### 3. TranslationAdapter
- **Interfaz**: `ITranslationService`
- **Servicio**: Interno (no requiere API externa)
- **Función**: Detecta y traduce documentos en catalán a español
- **Archivo**: `translation.adapter.ts`

## Configuración Requerida

Las siguientes variables de entorno deben estar configuradas en `.env.local`:

```env
# Mistral OCR
MISTRAL_API_KEY=your-mistral-api-key
MISTRAL_API_URL=https://api.mistral.ai/v1/ocr

# OpenRouter (Llama Vision)
OPENROUTER_API_KEY=your-openrouter-api-key
OPENROUTER_MODEL=meta-llama/llama-3.2-90b-vision-instruct
OPENROUTER_API_URL=https://openrouter.ai/api/v1

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Uso

Los adaptadores se configuran automáticamente en `/api-ddd/dependencies.ts`:

```typescript
import { MistralOcrAdapter } from '../infrastructure/adapters/mistral.adapter';
import { OpenRouterAdapter } from '../infrastructure/adapters/openrouter.adapter';
import { TranslationAdapter } from '../infrastructure/adapters/translation.adapter';

// Instanciar adaptadores
const ocrService = new MistralOcrAdapter();
const gptService = new OpenRouterAdapter();
const translationService = new TranslationAdapter();
```

## Testing

Para probar los adaptadores:

```bash
# Tests unitarios
npm test adapters.test.ts

# Test de integración
npm run test:integration
```

## Ventajas de la Arquitectura de Adaptadores

1. **Desacoplamiento**: El dominio no depende de implementaciones específicas
2. **Testabilidad**: Fácil crear mocks para testing
3. **Flexibilidad**: Cambiar proveedores sin afectar la lógica de negocio
4. **Mantenibilidad**: Cambios aislados en adaptadores específicos

## Migración desde Servicios Directos

Anteriormente, el proyecto usaba servicios directos en `/services`. Con los adaptadores:
- La lógica de negocio está protegida de cambios en APIs externas
- Es más fácil cambiar entre proveedores (ej: de OpenAI a OpenRouter)
- Los tests son más simples y no requieren llamadas a APIs reales
