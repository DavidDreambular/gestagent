/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js', 'pdfjs-dist', 'canvas']
  },
  images: {
    domains: ['localhost'],
  },
  webpack: (config, { isServer }) => {
    // Configuración específica para el servidor
    if (isServer) {
      // En el servidor, evitar imports de pdfjs-dist que causan problemas con DOMMatrix
      config.externals = config.externals || [];
      config.externals.push('pdfjs-dist', 'canvas');
    } else {
      // Cliente: configurar fallbacks
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        stream: false,
        zlib: false,
        canvas: false,
        'pdfjs-dist': false
      };
    }
    
    // Configurar el worker de PDF.js solo en cliente
    if (!isServer) {
      config.module.rules.push({
        test: /pdf\.worker\.(min\.)?js$/,
        type: 'asset/resource',
        generator: {
          filename: 'static/chunks/[name].[hash][ext]',
        },
      });
    }
    
    // Resolver canvas como false para evitar problemas con PDF.js
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false
    };
    
    return config;
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, user-id' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
