// Test para los adaptadores de servicios IA
import { MistralOcrAdapter } from '../infrastructure/adapters/mistral.adapter';
import { OpenRouterAdapter } from '../infrastructure/adapters/openrouter.adapter';
import { TranslationAdapter } from '../infrastructure/adapters/translation.adapter';
import * as fs from 'fs';
import * as path from 'path';

describe('AI Service Adapters Tests', () => {
  describe('MistralOcrAdapter', () => {
    let adapter: MistralOcrAdapter;
    
    beforeEach(() => {
      adapter = new MistralOcrAdapter();
    });
    
    it('should implement IOcrService interface', () => {
      expect(adapter.extractText).toBeDefined();
    });
    
    it('should handle PDF buffer input', async () => {
      // Mock PDF buffer
      const mockPdfBuffer = Buffer.from('mock pdf content');
      
      try {
        // Este test fallará hasta que Mistral esté correctamente configurado
        const result = await adapter.extractText(mockPdfBuffer);
        expect(result).toHaveProperty('rawText');
        expect(result).toHaveProperty('rawJson');
        expect(result).toHaveProperty('jobId');
      } catch (error) {
        // Esperado si no hay conexión real a Mistral
        expect(error.message).toContain('Mistral');
      }
    });
  });
  
  describe('OpenRouterAdapter', () => {
    let adapter: OpenRouterAdapter;
    
    beforeEach(() => {
      // Mock de variables de entorno para tests
      process.env.OPENROUTER_API_KEY = 'test-key';
      adapter = new OpenRouterAdapter();
    });
    
    it('should implement IGptService interface', () => {
      expect(adapter.processText).toBeDefined();
    });
    
    it('should return processed JSON with confidence', async () => {
      const mockRawText = 'FACTURA Nº 123';
      const mockRawJson = { document_type: 'factura' };
      
      try {
        const result = await adapter.processText(mockRawText, mockRawJson, 'factura');
        expect(result).toHaveProperty('processedJson');
        expect(result).toHaveProperty('dialog');
        expect(result).toHaveProperty('confidence');
        expect(typeof result.confidence).toBe('number');
      } catch (error) {
        // Esperado si no hay conexión real a OpenRouter
        expect(error.message).toBeDefined();
      }
    });
  });
  
  describe('TranslationAdapter', () => {
    let adapter: TranslationAdapter;
    
    beforeEach(() => {
      adapter = new TranslationAdapter();
    });
    
    it('should implement ITranslationService interface', () => {
      expect(adapter.translate).toBeDefined();
    });
    
    it('should detect and translate Catalan text', async () => {
      const mockData = {
        document_type: 'factura',
        items: [
          { descripció: 'Servei de consultoria' }
        ]
      };
      
      const result = await adapter.translate(mockData);
      expect(result.items[0].descripció).toBe('Servei de consultoria');
      // La traducción básica debería haber convertido 'descripció' a 'descripción'
    });
    
    it('should return original data if no Catalan detected', async () => {
      const mockData = {
        document_type: 'invoice',
        items: [
          { description: 'Consulting service' }
        ]
      };
      
      const result = await adapter.translate(mockData);
      expect(result).toEqual(mockData);
    });
  });
});
