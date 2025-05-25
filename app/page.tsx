// app/page.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileText, BarChart, Shield, Zap } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">GESTAGENT</h1>
            </div>
            <nav className="flex space-x-8">
              <Link href="/auth/login" className="text-gray-500 hover:text-gray-900">
                Iniciar Sesión
              </Link>
              <Button asChild>
                <Link href="/auth/login">Comenzar</Link>
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
              <span className="block">Digitaliza tus</span>
              <span className="block text-blue-600">documentos financieros</span>
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              Sistema integral para digitalizar, procesar y gestionar facturas, nóminas y documentos financieros 
              utilizando inteligencia artificial avanzada.
            </p>
            <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
              <div className="rounded-md shadow">
                <Button asChild size="lg">
                  <Link href="/auth/login">
                    Comenzar ahora
                  </Link>
                </Button>
              </div>
              <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
                <Button variant="outline" size="lg" asChild>
                  <Link href="#features">
                    Conocer más
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div id="features" className="py-12 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="lg:text-center">
              <h2 className="text-base text-blue-600 font-semibold tracking-wide uppercase">Características</h2>
              <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                Todo lo que necesitas para gestionar tus documentos
              </p>
            </div>

            <div className="mt-10">
              <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
                <div className="relative">
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                    <FileText className="h-6 w-6" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Procesamiento Automático</p>
                  <p className="mt-2 ml-16 text-base text-gray-500">
                    Extrae datos de PDFs automáticamente usando Mistral OCR y valida con GPT-4o para máxima precisión.
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                    <BarChart className="h-6 w-6" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Reportes Avanzados</p>
                  <p className="mt-2 ml-16 text-base text-gray-500">
                    Genera reportes detallados y análisis estadísticos para optimizar tu gestión financiera.
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                    <Shield className="h-6 w-6" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Seguridad Avanzada</p>
                  <p className="mt-2 ml-16 text-base text-gray-500">
                    Protección de datos con autenticación robusta y control de acceso basado en roles.
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                    <Zap className="h-6 w-6" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Integración Fácil</p>
                  <p className="mt-2 ml-16 text-base text-gray-500">
                    Conecta con tus sistemas contables existentes y exporta datos en múltiples formatos.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-base text-gray-400">
            © 2025 GESTAGENT. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}