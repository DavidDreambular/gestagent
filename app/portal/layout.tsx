import { Inter } from 'next/font/google';
import '../globals.css';
import { Metadata } from 'next';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Portal de Proveedores - GestAgent',
  description: 'Portal para proveedores de GestAgent',
};

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <div className="min-h-screen animated-gradient mesh-gradient">
          <header className="glass-card border-b border-white/20 relative z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center">
                  <div className="flex items-center space-x-3">
                    <img
                      src="/images/gestagent-logo-full.png"
                      alt="GestAgent Logo"
                      className="h-8 object-contain"
                    />
                    <div>
                      <p className="text-xs text-gray-600">
                        Portal de Proveedores
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">
                    Portal de Acceso
                  </span>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1">
            {children}
          </main>

          <footer className="glass-card border-t border-white/20 mt-auto relative z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="text-center text-sm text-gray-600">
                © 2024 GestAgent. Portal de Proveedores.
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
} 