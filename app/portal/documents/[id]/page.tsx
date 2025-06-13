'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  ArrowLeft,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Download,
  RefreshCw,
  Calendar,
  User,
  Building2,
  Hash,
  FileType,
  MessageSquare
} from 'lucide-react'

interface DocumentDetail {
  job_id: string
  document_type: string
  file_path: string
  status: string
  upload_timestamp: string
  processed_json: any
  processing_log?: any[]
}

interface ProcessingStep {
  step: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  timestamp?: string
  message?: string
  details?: any
}

export default function DocumentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const documentId = params.id as string

  const [document, setDocument] = useState<DocumentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (documentId) {
      loadDocumentDetail()
    }
  }, [documentId])

  const loadDocumentDetail = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(`/api/portal/documents/${documentId}`, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setDocument(data.document)
      } else if (response.status === 404) {
        setError('Documento no encontrado')
      } else {
        setError('Error cargando el documento')
      }

    } catch (error) {
      console.error('Error:', error)
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const refreshDocument = async () => {
    setRefreshing(true)
    await loadDocumentDetail()
    setRefreshing(false)
  }

  const getProcessingSteps = (): ProcessingStep[] => {
    if (!document) return []

    const steps: ProcessingStep[] = [
      {
        step: 'Archivo recibido',
        status: 'completed',
        timestamp: document.upload_timestamp,
        message: 'El archivo se ha subido correctamente'
      }
    ]

    switch (document.status) {
      case 'pending':
        steps.push({
          step: 'En cola de procesamiento',
          status: 'pending',
          message: 'El documento está esperando ser procesado'
        })
        break
      
      case 'processing':
        steps.push({
          step: 'Procesando documento',
          status: 'processing',
          message: 'Extrayendo información del documento...'
        })
        break
      
      case 'completed':
      case 'processed':
        steps.push(
          {
            step: 'Documento procesado',
            status: 'completed',
            message: 'La información ha sido extraída exitosamente'
          },
          {
            step: 'Datos validados',
            status: 'completed',
            message: 'Los datos han sido validados y están listos'
          }
        )
        break
      
      case 'error':
        steps.push({
          step: 'Error en procesamiento',
          status: 'error',
          message: 'Ha ocurrido un error durante el procesamiento'
        })
        break
    }

    return steps
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'processing':
        return <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      default:
        return <FileText className="h-5 w-5 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'processed':
        return 'bg-green-100 text-green-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'error':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const translateStatus = (status: string) => {
    const translations: Record<string, string> = {
      pending: 'Pendiente',
      processing: 'Procesando',
      completed: 'Completado',
      processed: 'Procesado',
      error: 'Error'
    }
    return translations[status] || status
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando documento...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <Button
                variant="ghost"
                onClick={() => router.push('/portal/documents')}
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">
                Detalle del Documento
              </h1>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        </main>
      </div>
    )
  }

  if (!document) {
    return null
  }

  const processingSteps = getProcessingSteps()
  const extractedData = document.processed_json || {}

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                onClick={() => router.push('/portal/documents')}
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Mis Documentos
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">
                Detalle del Documento
              </h1>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={refreshDocument}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          
          {/* Estado General */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  {extractedData.document_number || document.job_id}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(document.status)}
                  <Badge className={getStatusColor(document.status)}>
                    {translateStatus(document.status)}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center space-x-3">
                  <FileType className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Tipo</p>
                    <p className="font-medium">{document.document_type}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Subido</p>
                    <p className="font-medium">{formatDate(document.upload_timestamp)}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Hash className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">ID del Trabajo</p>
                    <p className="font-medium text-xs">{document.job_id}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Proveedor</p>
                    <p className="font-medium">{extractedData.supplier?.name || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Progreso de Procesamiento */}
            <Card>
              <CardHeader>
                <CardTitle>Progreso de Procesamiento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {processingSteps.map((step, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {step.status === 'completed' && (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        )}
                        {step.status === 'processing' && (
                          <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
                        )}
                        {step.status === 'pending' && (
                          <Clock className="h-5 w-5 text-gray-400" />
                        )}
                        {step.status === 'error' && (
                          <AlertCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <p className={`font-medium ${
                          step.status === 'completed' ? 'text-green-900' :
                          step.status === 'processing' ? 'text-blue-900' :
                          step.status === 'error' ? 'text-red-900' :
                          'text-gray-500'
                        }`}>
                          {step.step}
                        </p>
                        {step.message && (
                          <p className="text-sm text-gray-600 mt-1">
                            {step.message}
                          </p>
                        )}
                        {step.timestamp && (
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(step.timestamp)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Datos Extraídos */}
            <Card>
              <CardHeader>
                <CardTitle>Información del Documento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {extractedData.document_number && (
                    <div>
                      <p className="text-sm text-gray-500">Número de Documento</p>
                      <p className="font-medium">{extractedData.document_number}</p>
                    </div>
                  )}
                  
                  {extractedData.description && (
                    <div>
                      <p className="text-sm text-gray-500">Descripción</p>
                      <p className="font-medium">{extractedData.description}</p>
                    </div>
                  )}
                  
                  {extractedData.file_name && (
                    <div>
                      <p className="text-sm text-gray-500">Nombre del Archivo</p>
                      <p className="font-medium">{extractedData.file_name}</p>
                    </div>
                  )}
                  
                  {extractedData.file_size && (
                    <div>
                      <p className="text-sm text-gray-500">Tamaño del Archivo</p>
                      <p className="font-medium">
                        {(extractedData.file_size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  )}

                  {extractedData.uploaded_by && (
                    <div>
                      <p className="text-sm text-gray-500">Subido por</p>
                      <p className="font-medium">{extractedData.uploaded_by}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Información del Proveedor */}
          {extractedData.supplier && (
            <Card>
              <CardHeader>
                <CardTitle>Información del Proveedor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Nombre</p>
                    <p className="font-medium">{extractedData.supplier.name}</p>
                  </div>
                  {extractedData.supplier.id && (
                    <div>
                      <p className="text-sm text-gray-500">ID del Proveedor</p>
                      <p className="font-medium">{extractedData.supplier.id}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Acciones */}
          <Card>
            <CardHeader>
              <CardTitle>Acciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" disabled>
                  <Download className="h-4 w-4 mr-2" />
                  Descargar Original
                </Button>
                
                {document.status === 'error' && (
                  <Button variant="outline" onClick={refreshDocument}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reintentar Procesamiento
                  </Button>
                )}
                
                <Button 
                  variant="outline"
                  onClick={() => router.push('/portal/upload')}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Subir Nuevo Documento
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}