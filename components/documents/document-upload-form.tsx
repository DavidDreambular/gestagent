'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Terminal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

interface LogEntry {
  id: string
  timestamp: Date
  level: 'info' | 'warning' | 'error' | 'success'
  message: string
  details?: any
}

interface ExtractedDocument {
  type: string
  data: any
  confidence: number
}

interface ProcessingResult {
  jobId: string
  status: 'success' | 'error'
  documentsFound: number
  processingTime: number
  extractedDocuments?: ExtractedDocument[]
  error?: string
}

export function DocumentUploadForm() {
  const [file, setFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState<string>('Facturas')
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<ProcessingResult | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [dragActive, setDragActive] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const addLog = useCallback((level: LogEntry['level'], message: string, details?: any) => {
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      level,
      message,
      details
    }
    setLogs(prev => [...prev, entry])
  }, [])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile)
        addLog('info', `Archivo cargado: ${droppedFile.name} (${(droppedFile.size / 1024 / 1024).toFixed(2)} MB)`)
      } else {
        addLog('error', 'Por favor, selecciona un archivo PDF')
      }
    }
  }, [addLog])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)
      addLog('info', `Archivo seleccionado: ${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)`)
    }
  }

  const handleProcessDocument = async () => {
    if (!file) {
      addLog('error', 'Por favor, selecciona un archivo PDF')
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setResult(null)
    
    addLog('info', `Iniciando procesamiento de ${file.name}`)
    addLog('info', `Tipo de documento: ${documentType}`)

    try {
      // Simular progreso mientras procesamos
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90))
      }, 500)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('documentType', documentType.toLowerCase())

      addLog('info', 'Enviando archivo al servidor...')
      
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setProgress(95)

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al procesar el documento')
      }

      addLog('success', 'Archivo procesado exitosamente')
      addLog('info', `Job ID: ${data.jobId}`)
      
      // Ahora obtener los detalles del documento procesado
      addLog('info', 'Obteniendo documentos extraídos...')
      
      const detailsResponse = await fetch(`/api/documents/${data.jobId}`)
      const documentDetails = await detailsResponse.json()

      if (documentDetails.processedJson) {
        const extractedDocs = parseExtractedDocuments(documentDetails.processedJson)
        
        setResult({
          jobId: data.jobId,
          status: 'success',
          documentsFound: extractedDocs.length,
          processingTime: data.processingTime || 0,
          extractedDocuments: extractedDocs
        })

        extractedDocs.forEach((doc, index) => {
          addLog('success', `Documento ${index + 1} extraído: ${doc.type}`, doc.data)
        })
      }

      setProgress(100)
      
    } catch (error) {
      console.error('Error:', error)
      addLog('error', `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      setResult({
        jobId: '',
        status: 'error',
        documentsFound: 0,
        processingTime: 0,
        error: error instanceof Error ? error.message : 'Error desconocido'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const parseExtractedDocuments = (processedJson: any): ExtractedDocument[] => {
    // Parsear el JSON procesado para extraer documentos individuales
    const documents: ExtractedDocument[] = []
    
    if (processedJson.facturas && Array.isArray(processedJson.facturas)) {
      processedJson.facturas.forEach((factura: any) => {
        documents.push({
          type: 'Factura',
          data: factura,
          confidence: factura.confidence || 0.95
        })
      })
    }
    
    if (processedJson.nominas && Array.isArray(processedJson.nominas)) {
      processedJson.nominas.forEach((nomina: any) => {
        documents.push({
          type: 'Nómina',
          data: nomina,
          confidence: nomina.confidence || 0.95
        })
      })
    }

    // Si no hay arrays específicos, intentar extraer del objeto principal
    if (documents.length === 0 && processedJson.document_type) {
      documents.push({
        type: processedJson.document_type,
        data: processedJson,
        confidence: processedJson.confidence || 0.95
      })
    }

    return documents
  }

  const getLogIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <Terminal className="h-4 w-4 text-blue-500" />
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Procesamiento de Documentos Financieros</h1>
        <p className="text-muted-foreground mt-2">
          Sube un PDF con múltiples facturas/nóminas para extracción automática con IA
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna izquierda: Upload */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Subir Documento</CardTitle>
              <CardDescription>
                Selecciona el tipo de documento y sube tu archivo PDF
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="documentType">Tipo de documento principal</Label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger id="documentType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Facturas">Facturas</SelectItem>
                    <SelectItem value="Nóminas">Nóminas</SelectItem>
                    <SelectItem value="Mixto">Mixto (Facturas y Nóminas)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Archivo PDF</Label>
                <div
                  className={cn(
                    "relative border-2 border-dashed rounded-lg p-8 transition-colors",
                    dragActive ? "border-primary bg-primary/5" : "border-border",
                    "hover:border-primary/50"
                  )}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Arrastra y suelta tu PDF aquí, o haz clic para seleccionar
                    </p>
                    {file && (
                      <div className="mt-4 inline-flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4" />
                        <span className="font-medium">{file.name}</span>
                        <span className="text-muted-foreground">
                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {progress > 0 && progress < 100 && (
                <Progress value={progress} className="h-2" />
              )}

              <Button 
                onClick={handleProcessDocument}
                disabled={!file || isProcessing}
                className="w-full"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  'Procesar Documento'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Resultados */}
          {result && (
            <Card className={result.status === 'success' ? 'border-green-500' : 'border-red-500'}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {result.status === 'success' ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      Procesamiento Completado
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 text-red-500" />
                      Error en el Procesamiento
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {result.status === 'success' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Job ID:</p>
                        <p className="font-mono text-xs">{result.jobId}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Documentos encontrados:</p>
                        <p className="text-2xl font-bold">{result.documentsFound}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Tiempo de procesamiento:</p>
                        <p>{result.processingTime ? `${result.processingTime}s` : 'N/A'}</p>
                      </div>
                    </div>
                    
                    <div className="pt-4 space-y-2">
                      <Button 
                        variant="default" 
                        className="w-full"
                        onClick={() => window.location.href = `/documents/${result.jobId}`}
                      >
                        Ver Todos los Documentos
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => {
                          setFile(null)
                          setResult(null)
                          setLogs([])
                          setProgress(0)
                        }}
                      >
                        Procesar Otro
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{result.error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Columna derecha: Logs y documentos extraídos */}
        <div className="space-y-6">
          <Card className="h-[600px]">
            <CardHeader>
              <CardTitle>Consola de Procesamiento</CardTitle>
              <CardDescription>
                Logs en tiempo real del proceso de extracción
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs defaultValue="logs" className="h-full">
                <TabsList className="w-full rounded-none">
                  <TabsTrigger value="logs" className="flex-1">
                    Logs ({logs.length})
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="flex-1">
                    Documentos ({result?.extractedDocuments?.length || 0})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="logs" className="h-[480px] m-0">
                  <ScrollArea className="h-full">
                    <div className="p-4 space-y-2 font-mono text-sm">
                      {logs.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">
                          Los logs aparecerán aquí cuando proceses un documento...
                        </p>
                      ) : (
                        logs.map((log) => (
                          <div
                            key={log.id}
                            className={cn(
                              "flex items-start gap-2 p-2 rounded",
                              log.level === 'error' && "bg-red-50 dark:bg-red-950/20",
                              log.level === 'warning' && "bg-yellow-50 dark:bg-yellow-950/20",
                              log.level === 'success' && "bg-green-50 dark:bg-green-950/20",
                              log.level === 'info' && "bg-blue-50 dark:bg-blue-950/20"
                            )}
                          >
                            {getLogIcon(log.level)}
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  {log.timestamp.toLocaleTimeString()}
                                </span>
                                <span className="text-xs font-medium uppercase">
                                  [{log.level}]
                                </span>
                              </div>
                              <p className="text-sm break-all">{log.message}</p>
                              {log.details && (
                                <pre className="mt-1 text-xs text-muted-foreground overflow-x-auto">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                      <div ref={logsEndRef} />
                    </div>
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="documents" className="h-[480px] m-0">
                  <ScrollArea className="h-full">
                    <div className="p-4 space-y-4">
                      {!result?.extractedDocuments?.length ? (
                        <p className="text-muted-foreground text-center py-8">
                          No hay documentos extraídos aún...
                        </p>
                      ) : (
                        result.extractedDocuments.map((doc, index) => (
                          <Card key={index} className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold">{doc.type} #{index + 1}</h4>
                              <span className="text-sm text-muted-foreground">
                                Confianza: {(doc.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div className="space-y-2 text-sm">
                              {doc.data.numero && (
                                <p><span className="font-medium">Número:</span> {doc.data.numero}</p>
                              )}
                              {doc.data.fecha && (
                                <p><span className="font-medium">Fecha:</span> {doc.data.fecha}</p>
                              )}
                              {doc.data.emisor?.nombre && (
                                <p><span className="font-medium">Emisor:</span> {doc.data.emisor.nombre}</p>
                              )}
                              {doc.data.receptor?.nombre && (
                                <p><span className="font-medium">Receptor:</span> {doc.data.receptor.nombre}</p>
                              )}
                              {doc.data.total && (
                                <p><span className="font-medium">Total:</span> {doc.data.total} €</p>
                              )}
                            </div>
                          </Card>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
