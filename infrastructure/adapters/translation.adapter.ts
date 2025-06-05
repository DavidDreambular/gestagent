// Adaptador para el servicio de traducción
import { ITranslationService } from '../services/translation.service.interface';

export class TranslationAdapter implements ITranslationService {
  /**
   * Traduce el contenido del documento si es necesario
   * Por ahora es una implementación básica que detecta catalán y traduce
   */
  async translate(data: any): Promise<any> {
    try {
      // Detectar si necesita traducción
      const needsTranslation = this.detectCatalanLanguage(JSON.stringify(data));
      
      if (!needsTranslation) {
        console.log('[TranslationAdapter] No se detectó catalán, no se requiere traducción');
        return data;
      }
      
      console.log('[TranslationAdapter] Catalán detectado, iniciando traducción');
      
      // Por ahora, implementación simplificada
      // En producción, esto podría usar un servicio de traducción real
      const translatedData = this.performBasicTranslation(data);
      
      console.log('[TranslationAdapter] Traducción completada');
      return translatedData;
      
    } catch (error) {
      console.error('[TranslationAdapter] Error durante la traducción:', error);
      // En caso de error, devolver los datos originales
      return data;
    }
  }
  
  /**
   * Detecta si el texto contiene catalán
   */
  private detectCatalanLanguage(text: string): boolean {
    const catalanIndicators = [
      'és', 'però', 'també', 'aquesta', 'desenvolupament',
      'factura', 'rebut', 'pagament', 'import', 'concepte'
    ];
    
    const lowerText = text.toLowerCase();
    return catalanIndicators.some(word => lowerText.includes(word));
  }
  
  /**
   * Realiza traducción básica de catalán a español
   */
  private performBasicTranslation(data: any): any {
    // Mapa básico de traducción catalán -> español
    const translations: Record<string, string> = {
      'factura': 'factura',
      'rebut': 'recibo',
      'pagament': 'pago',
      'import': 'importe',
      'concepte': 'concepto',
      'total': 'total',
      'subtotal': 'subtotal',
      'impostos': 'impuestos',
      'data': 'fecha',
      'número': 'número',
      'client': 'cliente',
      'proveïdor': 'proveedor',
      'adreça': 'dirección',
      'telèfon': 'teléfono',
      'correu': 'correo',
      'descripció': 'descripción',
      'quantitat': 'cantidad',
      'preu': 'precio',
      'descompte': 'descuento'
    };
    
    // Función recursiva para traducir objetos
    const translateObject = (obj: any): any => {
      if (typeof obj === 'string') {
        let translated = obj;
        // Aplicar traducciones
        Object.entries(translations).forEach(([cat, esp]) => {
          const regex = new RegExp(cat, 'gi');
          translated = translated.replace(regex, esp);
        });
        return translated;
      }
      
      if (Array.isArray(obj)) {
        return obj.map(item => translateObject(item));
      }
      
      if (obj && typeof obj === 'object') {
        const translatedObj: any = {};
        Object.entries(obj).forEach(([key, value]) => {
          translatedObj[key] = translateObject(value);
        });
        return translatedObj;
      }
      
      return obj;
    };
    
    return translateObject(data);
  }
}

// Singleton export para facilitar la inyección de dependencias
export const createTranslationAdapter = () => new TranslationAdapter();
