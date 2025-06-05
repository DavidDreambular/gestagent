# PDF Analyzer Service

## 📋 Descripción

El servicio `PDFAnalyzerService` es un componente crítico del sistema híbrido de GESTAGENT que analiza las características de un PDF para determinar la estrategia de procesamiento óptima: usar solo Llama Vision (rápido) o Mistral OCR + Llama (más preciso).

## 🎯 Objetivo

- Analizar PDFs en menos de 1 segundo
- Determinar automáticamente la mejor estrategia de procesamiento
- Optimizar el balance entre velocidad y precisión
- Reducir costos usando Llama solo cuando sea apropiado

## 📊 Análisis Realizado

### Características Básicas
- **Tipo de PDF**: Digital nativo vs Escaneado
- **Número de páginas**
- **Texto extraíble**: Presencia y calidad
- **Tamaño del archivo**

### Calidad del Contenido
- **Calidad del texto**: Alta, Media, Baja
- **Tablas complejas**: Detección automática
- **Imágenes embebidas**
- **Densidad de texto**: Caracteres por página

### Información del Documento
- **Idioma**: Español, Inglés, etc.
- **Tipo detectado**: Factura, Nómina, Recibo, etc.

### Métricas de Confianza
- **Extracción de texto**: 0-100%
- **Detección de estructura**: 0-100%
- **Confianza general**: 0-100%

## 🔄 Estrategias de Procesamiento

### 1. llama-only (Rápida)
**Cuándo se usa:**
- PDF digital nativo
- Alta calidad de texto
- Sin tablas complejas
- Menos de 5 páginas
- Confianza > 85%

**Ventajas:**
- ⚡ 5-8 segundos de procesamiento
- 💰 Menor costo
- 🎯 Ideal para facturas simples

### 2. mistral-llama (Completa)
**Cuándo se usa:**
- PDF escaneado
- Baja calidad de texto
- Tablas complejas detectadas
- Más de 5 páginas
- Confianza < 85%
- Documentos tipo balance o extracto

**Ventajas:**
- 🎯 Mayor precisión
- 📊 Mejor con tablas
- 📄 Maneja documentos complejos

## 💻 Uso del Servicio

### Análisis Completo
```typescript
import { pdfAnalyzer } from '@/services/pdf-analyzer';

const result = await pdfAnalyzer.analyzePDF(pdfBuffer, {
  detectTables: true,
  detectLanguage: true
});

if (result.success) {
  console.log('Estrategia:', result.analysis.recommendedStrategy);
  console.log('Razón:', result.analysis.strategyReason);
}
```

### Análisis Rápido (Preview)
```typescript
const quickResult = await pdfAnalyzer.quickAnalyze(pdfBuffer);
// Analiza solo las primeras 2 páginas
```

## 📈 Umbrales Configurables

```typescript
ANALYSIS_THRESHOLDS = {
  MIN_TEXT_QUALITY_FOR_LLAMA: 0.7,     // 70% calidad mínima
  MIN_TEXT_DENSITY: 100,                // 100 chars/página mínimo
  MAX_PAGES_FOR_LLAMA_ONLY: 5,         // Máximo 5 páginas
  COMPLEX_TABLE_THRESHOLD: 3,          // 3+ tablas = complejo
  MIN_CONFIDENCE_FOR_LLAMA: 0.85       // 85% confianza mínima
}
```

## 🔍 Criterios de Decisión

### Factores para Mistral+Llama:
1. **Documento escaneado** - Siempre usa OCR especializado
2. **Calidad baja** - Texto corrupto o poco legible
3. **Tablas complejas** - Múltiples columnas, formatos
4. **Muchas páginas** - Más de 5 páginas
5. **Baja confianza** - Menos del 85%
6. **Tipos específicos** - Balances, extractos bancarios

### Factores para Llama Solo:
1. **PDF nativo digital** - Creado digitalmente
2. **Alta calidad** - Texto claro y estructurado
3. **Pocas páginas** - 5 o menos
4. **Alta confianza** - Más del 85%
5. **Estructura simple** - Facturas, nóminas básicas

## 📊 Métricas y Logging

El servicio registra:
- Tiempo de análisis
- Estrategia seleccionada
- Razón de la decisión
- Nivel de confianza
- Tipo de documento detectado

## 🚀 Rendimiento

- **Objetivo**: < 1 segundo por análisis
- **Real**: ~50-200ms típicamente
- **Modo rápido**: ~20-50ms (2 páginas)

## 🔧 Mantenimiento

Para ajustar el sistema:
1. Modificar umbrales en `ANALYSIS_THRESHOLDS`
2. Revisar métricas en Supabase
3. Ajustar según tasas de éxito/fallback
