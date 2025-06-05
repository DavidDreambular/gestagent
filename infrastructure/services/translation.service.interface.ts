// Interface para el servicio de traducción (Domain Interface)
export interface ITranslationService {
  /**
   * Traduce el contenido del documento si es necesario
   * @param data Datos a traducir
   * @returns Datos traducidos
   */
  translate(data: any): Promise<any>;
}
