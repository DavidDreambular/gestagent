import { Providers } from '@/components/providers';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';

// Importar el global error handler para manejar errores no capturados
import './global-error-handler';

export const metadata = {
  title: 'GestAgent - Sistema de Digitalización de Documentos Financieros',
  description: 'Plataforma integral para digitalización y gestión de documentos financieros con IA - GestAgent',
  keywords: 'gestión documentos, digitalización, facturas, IA, automatización, GestAgent',
  authors: [{ name: 'GestAgent Team' }],
  creator: 'GestAgent',
  publisher: 'GestAgent',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '512x512', type: 'image/png' },
      { url: '/images/gestagent-icon.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/favicon.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.png',
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'GestAgent - Gestión Inteligente de Documentos',
    description: 'Digitaliza y gestiona tus documentos financieros con IA',
    url: 'https://gestagent.app',
    siteName: 'GestAgent',
    images: [
      {
        url: '/images/gestagent-logo.png',
        width: 512,
        height: 512,
        alt: 'GestAgent Logo',
      },
    ],
    locale: 'es_ES',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GestAgent - Gestión Inteligente de Documentos',
    description: 'Digitaliza y gestiona tus documentos financieros con IA',
    images: ['/images/gestagent-logo.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <Providers>
          <NotificationProvider>
            {children}
            <Toaster />
          </NotificationProvider>
        </Providers>
      </body>
    </html>
  );
}
