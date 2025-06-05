// Interfaz para la extensibilidad mediante plugins
export interface IPlugin {
  readonly pluginId: string
  readonly pluginType: string
  readonly version: string

  // Métodos que deben implementar los plugins
  initialize(): Promise<void>
  processDocument(documentType: string, data: Record<string, any>): Promise<Record<string, any>>
  validateDocument(documentType: string, data: Record<string, any>): Promise<boolean>
  getMetadata(): PluginMetadata
}

export interface PluginMetadata {
  name: string
  description: string
  supportedDocumentTypes: string[]
  author: string
}

