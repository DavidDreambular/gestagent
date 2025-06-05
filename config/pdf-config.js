// Configuración de PDF.js para Next.js
// Este archivo configura el worker de PDF.js para funcionar correctamente en Next.js

import { config } from './next.config.js';

// Añadir configuración para PDF.js worker
export const pdfWorkerConfig = {
  webpack: (config, { isServer }) => {
    // Configurar alias para pdf.worker
    config.resolve.alias.canvas = false;
    
    if (!isServer) {
      // Cliente: usar CDN
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        stream: false,
        zlib: false,
      };
    }
    
    // Configurar el worker de PDF.js
    config.module.rules.push({
      test: /pdf\.worker\.(min\.)?js$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/chunks/[name].[hash][ext]',
      },
    });
    
    return config;
  },
};

// Configuración para copiar archivos estáticos de PDF.js
export const pdfStaticFiles = {
  // Los archivos cmaps son necesarios para algunos PDFs con caracteres especiales
  cmaps: {
    source: 'node_modules/pdfjs-dist/cmaps',
    destination: 'public/pdf-cmaps'
  },
  // Fuentes estándar para PDFs
  standardFonts: {
    source: 'node_modules/pdfjs-dist/standard_fonts',
    destination: 'public/pdf-fonts'
  }
};

// URLs para los recursos de PDF.js
export const pdfResourceUrls = {
  workerSrc: process.env.NODE_ENV === 'production'
    ? 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
    : '/pdf.worker.js',
  cmapUrl: process.env.NODE_ENV === 'production'
    ? 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/'
    : '/pdf-cmaps/',
  standardFontDataUrl: process.env.NODE_ENV === 'production'
    ? 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/'
    : '/pdf-fonts/'
};
