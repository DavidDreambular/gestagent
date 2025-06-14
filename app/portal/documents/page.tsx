'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  FileText, 
  Upload, 
  ArrowLeft,
  Search,
  Eye,
  Download,
  Clock,
  CheckCircle,
  AlertCircle,
  Filter
} from 'lucide-react'

interface Document {
  job_id: string
  document_type: string
  title: string
  status: string
  upload_timestamp: string
  processed_json: any
}

export default function PortalDocuments() {
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    checkAuthAndLoadDocuments()
    
    // Auto-actualizar cada 30 segundos para documentos en proceso
    const interval = setInterval(() => {
      const hasProcessingDocs = documents.some(doc => 
        doc.status === 'processing' || doc.status === 'pending'
      )
      if (hasProcessingDocs) {
        checkAuthAndLoadDocuments()
      }
    }, 30000)
    
    return () => clearInterval(interval)
  }, [documents])

  const checkAuthAndLoadDocuments = async () => {
    try {
      // Verificar autenticación
      const authResponse = await fetch('/api/portal/auth/profile', {
        credentials: 'include'
      })

      if (!authResponse.ok) {
        router.push('/portal/login')
        return
      }

      // Cargar documentos
      const docsResponse = await fetch('/api/portal/documents', {
        credentials: 'include'
      })

      if (docsResponse.ok) {
        const docsData = await docsResponse.json()
        setDocuments(docsData.documents || [])
      } else {
        setError('Error cargando documentos')
      }

    } catch (error) {
      console.error('Error:', error)
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'processed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'pending':
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-600 pulse-dot" />
      case 'error':
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600 pulse-dot" />
      default:
        return <FileText className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'processed':
        return 'bg-green-100 text-green-800'
      case 'pending':
      case 'processing':
        return 'bg-yellow-100 text-yellow-800'
      case 'error':
      case 'failed':
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
      error: 'Error',
      failed: 'Fallido',
      received: 'Recibido'
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

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.document_type.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando documentos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative z-10">
      {/* Header */}
      <header className="glass-card border-b border-white/20 fade-in">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                onClick={() => router.push('/portal/dashboard')}
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">
                Mis Documentos
              </h1>
            </div>
            
            <Button
              onClick={() => router.push('/portal/upload')}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 hover-lift ripple"
            >
              <Upload className="h-4 w-4 mr-2" />
              Subir Documento
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Filtros */}
          <Card className="mb-6 glass-card hover-lift fade-in">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar documentos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 focus-ring"
                  />
                </div>
                
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="all">Todos los estados</option>
                  <option value="pending">Pendientes</option>
                  <option value="processing">Procesando</option>
                  <option value="completed">Completados</option>
                  <option value="error">Con errores</option>
                </select>
                
                <div className="flex items-center text-sm text-gray-600">
                  <Filter className="h-4 w-4 mr-2" />
                  {filteredDocuments.length} de {documents.length} documentos
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de documentos */}
          {filteredDocuments.length === 0 ? (
            <Card className="glass-card fade-in">
              <CardContent className="py-12">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {documents.length === 0 ? 'No tienes documentos' : 'No se encontraron documentos'}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {documents.length === 0 
                      ? 'Sube tu primer documento para comenzar.' 
                      : 'Intenta ajustar los filtros de búsqueda.'
                    }
                  </p>
                  {documents.length === 0 && (
                    <Button 
                      onClick={() => router.push('/portal/upload')}
                      size="lg"
                    >
                      <Upload className="h-5 w-5 mr-2" />
                      Subir Primer Documento
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredDocuments.map((doc, index) => (
                <Card key={doc.job_id} className="glass-card hover-lift transition-all duration-300 fade-in" style={{animationDelay: `${index * 0.1}s`}}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-gray-100/50 rounded-lg hover-glow">
                          <FileText className="h-6 w-6 text-gray-600" />
                        </div>
                        
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {doc.title}
                          </h3>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-sm text-gray-500">
                              Tipo: {doc.document_type}
                            </span>
                            <span className="text-sm text-gray-500">
                              {formatDate(doc.upload_timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(doc.status)}
                          <Badge className={getStatusColor(doc.status)}>
                            {translateStatus(doc.status)}
                          </Badge>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/portal/documents/${doc.job_id}`)}
                          className="hover:scale-110 transition-all duration-200"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Progress indicator para documentos en proceso */}
                    {(doc.status === 'processing' || doc.status === 'pending') && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span>Procesando documento</span>
                          <span>...</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-1.5 rounded-full skeleton" style={{width: '60%'}}></div>
                        </div>
                      </div>
                    )}
                    
                    {doc.processed_json?.description && (
                      <div className="mt-3 text-sm text-gray-600">
                        {doc.processed_json.description}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}