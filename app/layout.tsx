import { Providers } from '@/components/providers';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';

export const metadata = {
  title: 'GESTAGENT - Sistema de Digitalización de Documentos Financieros',
  description: 'Plataforma integral para digitalización y gestión de documentos financieros con IA',
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
