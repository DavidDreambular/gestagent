'use client';

// Página de documentación interactiva de la API
// /app/api/docs/page.tsx

import { useEffect, useRef } from 'react';
import Head from 'next/head';

export default function ApiDocsPage() {
  const swaggerUIRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Cargar Swagger UI solo en el cliente
    if (typeof window !== 'undefined' && swaggerUIRef.current) {
      // Cargar SwaggerUI dinámicamente
      import('swagger-ui-dist/swagger-ui-bundle.js')
        .then((SwaggerUIBundle) => {
          SwaggerUIBundle.default({
            url: '/api/v1/openapi',
            dom_id: '#swagger-ui',
            presets: [
              SwaggerUIBundle.default.presets.apis,
              SwaggerUIBundle.default.presets.standalone
            ],
            layout: 'StandaloneLayout',
            deepLinking: true,
            showExtensions: true,
            showCommonExtensions: true,
            tryItOutEnabled: true,
            requestInterceptor: (request: any) => {
              // Agregar headers automáticamente si están en localStorage
              const apiKey = localStorage.getItem('gestagent_api_key');
              if (apiKey) {
                request.headers['X-API-Key'] = apiKey;
              }
              return request;
            },
            responseInterceptor: (response: any) => {
              // Log de respuestas para debugging
              console.log('API Response:', response);
              return response;
            },
            onComplete: () => {
              console.log('✅ [SWAGGER] UI loaded successfully');
              
              // Personalizar la interfaz
              const observer = new MutationObserver(() => {
                const title = document.querySelector('.title');
                if (title && !title.querySelector('.custom-logo')) {
                  const logo = document.createElement('div');
                  logo.className = 'custom-logo';
                  logo.innerHTML = `
                    <h1 style="color: #0891b2; margin: 0; font-size: 2rem;">🤖 GestAgent API</h1>
                    <p style="color: #64748b; margin: 0.5rem 0 0 0;">
                      Documentación interactiva de la API de digitalización inteligente
                    </p>
                  `;
                  title.appendChild(logo);
                }
              });
              observer.observe(document.body, { childList: true, subtree: true });
            },
            docExpansion: 'list',
            filter: true,
            syntaxHighlight: {
              activate: true,
              theme: 'arta'
            },
            plugins: [
              // Plugin personalizado para mejorar la experiencia
              () => ({
                statePlugins: {
                  spec: {
                    wrapSelectors: {
                      allowTryItOutFor: () => () => true
                    }
                  }
                }
              })
            ]
          });
        })
        .catch((error) => {
          console.error('❌ [SWAGGER] Error loading Swagger UI:', error);
          
          // Mostrar mensaje de error
          if (swaggerUIRef.current) {
            swaggerUIRef.current.innerHTML = `
              <div style="padding: 2rem; text-align: center; background: #fee2e2; border: 1px solid #fecaca; border-radius: 0.5rem; margin: 2rem;">
                <h2 style="color: #dc2626; margin-bottom: 1rem;">Error cargando documentación</h2>
                <p style="color: #991b1b;">No se pudo cargar Swagger UI. Por favor, recarga la página.</p>
                <button 
                  onclick="window.location.reload()" 
                  style="
                    background: #dc2626; 
                    color: white; 
                    border: none; 
                    padding: 0.5rem 1rem; 
                    border-radius: 0.25rem; 
                    cursor: pointer; 
                    margin-top: 1rem;
                  "
                >
                  Recargar página
                </button>
              </div>
            `;
          }
        });
    }

    // Cargar CSS de Swagger UI
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css';
    document.head.appendChild(link);

    // Agregar estilos personalizados
    const style = document.createElement('style');
    style.textContent = `
      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      }
      
      .swagger-ui .topbar {
        background-color: #0891b2;
        border-bottom: 3px solid #0369a1;
      }
      
      .swagger-ui .topbar .download-url-wrapper {
        display: none;
      }
      
      .swagger-ui .info .title {
        color: #0f172a;
      }
      
      .swagger-ui .scheme-container {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 0.5rem;
        padding: 1rem;
        margin: 1rem 0;
      }
      
      .swagger-ui .opblock-tag {
        border-bottom: 2px solid #e2e8f0;
        margin-bottom: 1rem;
      }
      
      .swagger-ui .opblock.opblock-get .opblock-summary {
        border-left: 4px solid #10b981;
      }
      
      .swagger-ui .opblock.opblock-post .opblock-summary {
        border-left: 4px solid #3b82f6;
      }
      
      .swagger-ui .opblock.opblock-put .opblock-summary {
        border-left: 4px solid #f59e0b;
      }
      
      .swagger-ui .opblock.opblock-delete .opblock-summary {
        border-left: 4px solid #ef4444;
      }
      
      .custom-header {
        background: linear-gradient(135deg, #0891b2 0%, #0369a1 100%);
        color: white;
        padding: 2rem;
        text-align: center;
        margin-bottom: 2rem;
      }
      
      .api-key-input {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: white;
        padding: 0.5rem;
        border-radius: 0.25rem;
        margin: 1rem;
      }
      
      .api-key-input::placeholder {
        color: rgba(255, 255, 255, 0.7);
      }
    `;
    document.head.appendChild(style);

    return () => {
      // Cleanup
      document.head.removeChild(link);
      document.head.removeChild(style);
    };
  }, []);

  const handleApiKeyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const apiKey = event.target.value;
    if (apiKey) {
      localStorage.setItem('gestagent_api_key', apiKey);
    } else {
      localStorage.removeItem('gestagent_api_key');
    }
  };

  return (
    <>
      <Head>
        <title>GestAgent API Documentation</title>
        <meta name="description" content="Documentación interactiva de la API de GestAgent para digitalización inteligente de documentos" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <div className="custom-header">
        <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 'bold' }}>
          🤖 GestAgent API
        </h1>
        <p style={{ margin: '1rem 0', fontSize: '1.1rem', opacity: 0.9 }}>
          Documentación interactiva para la API de digitalización inteligente de documentos
        </p>
        
        <div style={{ marginTop: '1.5rem' }}>
          <input
            type="text"
            placeholder="Tu API Key (opcional - para probar endpoints)"
            className="api-key-input"
            onChange={handleApiKeyChange}
            style={{
              minWidth: '300px',
              maxWidth: '500px',
              width: '100%'
            }}
          />
          <p style={{ fontSize: '0.9rem', opacity: 0.8, margin: '0.5rem 0 0 0' }}>
            💡 Ingresa tu API key para probar los endpoints directamente desde esta documentación
          </p>
        </div>
      </div>

      <div 
        id="swagger-ui" 
        ref={swaggerUIRef}
        style={{ 
          minHeight: '600px',
          padding: '0 1rem 2rem 1rem'
        }}
      >
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
          <p>Cargando documentación de la API...</p>
        </div>
      </div>

      <footer style={{
        background: '#f8fafc',
        borderTop: '1px solid #e2e8f0',
        padding: '2rem',
        textAlign: 'center',
        color: '#64748b'
      }}>
        <p style={{ margin: 0 }}>
          GestAgent API v1.0 - Documentación generada automáticamente
        </p>
        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
          ¿Necesitas ayuda? Contacta con nuestro{' '}
          <a 
            href="mailto:api@gestagent.com" 
            style={{ color: '#0891b2', textDecoration: 'none' }}
          >
            equipo de soporte
          </a>
        </p>
      </footer>
    </>
  );
}