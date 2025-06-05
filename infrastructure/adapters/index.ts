// Export centralizado de todos los adaptadores
export { MistralOcrAdapter, createMistralOcrAdapter } from './mistral.adapter';
// export { OpenRouterAdapter, createOpenRouterAdapter } from './openrouter.adapter'; // Temporalmente deshabilitado
export { TranslationAdapter, createTranslationAdapter } from './translation.adapter';

// Tipos de interfaces
export type { IOcrService } from '../services/ocr.service.interface';
export type { IGptService } from '../services/gpt.service.interface';
export type { ITranslationService } from '../services/translation.service.interface';
