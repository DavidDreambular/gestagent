'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  ArrowLeft,
  Bell,
  Mail,
  Calendar,
  FileText,
  AlertTriangle,
  CheckCircle,
  Settings,
  Save,
  Loader2
} from 'lucide-react'

interface NotificationPreferences {
  emailNotifications: boolean
  weeklyReports: boolean
  documentUploadNotifications: boolean
  documentProcessedNotifications: boolean
  errorNotifications: boolean
}

export default function PortalSettings() {
  const router = useRouter()
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailNotifications: true,
    weeklyReports: true,
    documentUploadNotifications: true,
    documentProcessedNotifications: true,
    errorNotifications: true
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  useEffect(() => {
    checkAuthAndLoadPreferences()
  }, [])

  const checkAuthAndLoadPreferences = async () => {
    try {
      // Verificar autenticación
      const authResponse = await fetch('/api/portal/auth/profile', {
        credentials: 'include'
      })

      if (!authResponse.ok) {
        router.push('/portal/login')
        return
      }

      // Cargar preferencias
      const prefsResponse = await fetch('/api/portal/notifications/preferences', {
        credentials: 'include'
      })

      if (prefsResponse.ok) {
        const data = await prefsResponse.json()
        setPreferences(data.preferences)
      }

    } catch (error) {
      console.error('Error loading preferences:', error)
      setMessage({
        type: 'error',
        text: 'Error cargando las preferencias'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSavePreferences = async () => {
    try {
      setSaving(true)
      setMessage(null)

      const response = await fetch('/api/portal/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(preferences)
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({
          type: 'success',
          text: 'Preferencias guardadas correctamente'
        })
        
        // Actualizar estado con la respuesta del servidor
        setPreferences(data.preferences)
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Error guardando las preferencias'
        })
      }

    } catch (error) {
      console.error('Error saving preferences:', error)
      setMessage({
        type: 'error',
        text: 'Error de conexión. Inténtalo de nuevo.'
      })
    } finally {
      setSaving(false)
    }
  }

  const handlePreferenceChange = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow border-b">
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
                Configuración
              </h1>
            </div>
            
            <div className="flex items-center">
              <Settings className="h-5 w-5 text-gray-400 mr-2" />
              <span className="text-sm text-gray-600">Portal de Proveedores</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {message && (
            <Alert 
              variant={message.type === 'error' ? 'destructive' : 'default'}
              className="mb-6"
            >
              {message.type === 'success' ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          {/* Configuración de Notificaciones */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Preferencias de Notificaciones
              </CardTitle>
              <p className="text-sm text-gray-600">
                Configura cómo y cuándo quieres recibir notificaciones sobre tus documentos.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Notificaciones por Email */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <div>
                    <h3 className="font-medium text-gray-900">Notificaciones por Email</h3>
                    <p className="text-sm text-gray-600">
                      Recibe emails cuando ocurran eventos importantes
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.emailNotifications}
                  onCheckedChange={(value) => handlePreferenceChange('emailNotifications', value)}
                />
              </div>

              {/* Configuraciones específicas de email */}
              {preferences.emailNotifications && (
                <div className="pl-8 space-y-4">
                  
                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-4 w-4 text-green-600" />
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Documentos Subidos</h4>
                        <p className="text-xs text-gray-500">
                          Email de confirmación cuando subas un documento
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={preferences.documentUploadNotifications}
                      onCheckedChange={(value) => handlePreferenceChange('documentUploadNotifications', value)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Documentos Procesados</h4>
                        <p className="text-xs text-gray-500">
                          Email cuando un documento termine de procesarse
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={preferences.documentProcessedNotifications}
                      onCheckedChange={(value) => handlePreferenceChange('documentProcessedNotifications', value)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Errores</h4>
                        <p className="text-xs text-gray-500">
                          Email cuando ocurra un error procesando documentos
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={preferences.errorNotifications}
                      onCheckedChange={(value) => handlePreferenceChange('errorNotifications', value)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-4 w-4 text-purple-600" />
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Reporte Semanal</h4>
                        <p className="text-xs text-gray-500">
                          Resumen semanal de tu actividad enviado los lunes
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={preferences.weeklyReports}
                      onCheckedChange={(value) => handlePreferenceChange('weeklyReports', value)}
                    />
                  </div>
                </div>
              )}

              {/* Botón de guardar */}
              <div className="flex justify-between items-center pt-6 border-t">
                <p className="text-sm text-gray-500">
                  Los cambios se aplicarán inmediatamente
                </p>
                <Button 
                  onClick={handleSavePreferences}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Guardar Preferencias
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Información adicional */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Información sobre Notificaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm text-gray-600">
                <div className="flex items-start space-x-3">
                  <Mail className="h-4 w-4 mt-0.5 text-blue-600" />
                  <div>
                    <p className="font-medium">Notificaciones por Email</p>
                    <p>Los emails se envían desde el sistema automáticamente. Revisa tu carpeta de spam si no los recibes.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Calendar className="h-4 w-4 mt-0.5 text-purple-600" />
                  <div>
                    <p className="font-medium">Reportes Semanales</p>
                    <p>Se envían los lunes por la mañana con un resumen de tu actividad de la semana anterior.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Bell className="h-4 w-4 mt-0.5 text-yellow-600" />
                  <div>
                    <p className="font-medium">Notificaciones en el Portal</p>
                    <p>Todas las notificaciones también aparecen en tu dashboard del portal, independientemente de la configuración de email.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}