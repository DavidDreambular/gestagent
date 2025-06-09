// API Route para configuración del sistema
// /app/api/configuration/route.ts
// Gestión de configuración de empresa, APIs y preferencias

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PostgreSQLClient } from '@/lib/postgresql-client';

const pgClient = new PostgreSQLClient();

// Tipos para la configuración
interface SystemConfiguration {
  company: {
    name: string;
    cif: string;
    address: string;
    phone: string;
    email: string;
    logo_url?: string;
  };
  apis: {
    mistral_api_key: string;
    openai_api_key: string;
    openrouter_api_key?: string;
    stripe_api_key?: string;
  };
  notifications: {
    email_enabled: boolean;
    push_enabled: boolean;
    vencimientos_dias: number;
    alertas_criticas: boolean;
  };
  backup: {
    auto_backup_enabled: boolean;
    backup_frequency_days: number;
    backup_retention_days: number;
    backup_location: string;
  };
  advanced: {
    debug_mode: boolean;
    api_rate_limit: number;
    max_file_size_mb: number;
    allowed_file_types: string[];
    ocr_language: string;
  };
}

// Configuración por defecto
const defaultConfig: SystemConfiguration = {
  company: {
    name: 'Mi Gestoría',
    cif: '',
    address: '',
    phone: '',
    email: ''
  },
  apis: {
    mistral_api_key: process.env.MISTRAL_API_KEY || '',
    openai_api_key: process.env.OPENAI_API_KEY || '',
    openrouter_api_key: process.env.OPENROUTER_API_KEY || '',
    stripe_api_key: process.env.STRIPE_API_KEY || ''
  },
  notifications: {
    email_enabled: true,
    push_enabled: true,
    vencimientos_dias: 30,
    alertas_criticas: true
  },
  backup: {
    auto_backup_enabled: false,
    backup_frequency_days: 7,
    backup_retention_days: 30,
    backup_location: 'local'
  },
  advanced: {
    debug_mode: process.env.NODE_ENV === 'development',
    api_rate_limit: 100,
    max_file_size_mb: 10,
    allowed_file_types: ['pdf', 'jpg', 'jpeg', 'png'],
    ocr_language: 'es'
  }
};

export const dynamic = 'force-dynamic';

// GET - Obtener configuración actual
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo usuarios con permisos específicos pueden ver configuración
    const userRole = session.user?.role || 'viewer';
    if (!['admin', 'supervisor'].includes(userRole)) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    try {
      // Intentar obtener configuración de PostgreSQL
      const configQuery = `
        SELECT config_data 
        FROM system_configuration 
        WHERE id = 1
      `;
      
      const result = await pgClient.query<{ config_data: SystemConfiguration }>(configQuery, []);

      if (result.data && result.data.length > 0) {
        const config = result.data[0].config_data;
        
        // Ocultar claves API para usuarios que no son admin
        if (userRole !== 'admin') {
          config.apis = {
            mistral_api_key: config.apis.mistral_api_key ? '***' : '',
            openai_api_key: config.apis.openai_api_key ? '***' : '',
            openrouter_api_key: config.apis.openrouter_api_key ? '***' : '',
            stripe_api_key: config.apis.stripe_api_key ? '***' : ''
          };
        }

        return NextResponse.json({
          success: true,
          data: config,
          source: 'database'
        });
      }
    } catch (error) {
      console.warn('Error obteniendo configuración de PostgreSQL:', error);
    }

    // Fallback a configuración por defecto
    const safeConfig = { ...defaultConfig };
    
    // Ocultar claves API para usuarios que no son admin
    if (userRole !== 'admin') {
      safeConfig.apis = {
        mistral_api_key: safeConfig.apis.mistral_api_key ? '***' : '',
        openai_api_key: safeConfig.apis.openai_api_key ? '***' : '',
        openrouter_api_key: safeConfig.apis.openrouter_api_key ? '***' : '',
        stripe_api_key: safeConfig.apis.stripe_api_key ? '***' : ''
      };
    }

    return NextResponse.json({
      success: true,
      data: safeConfig,
      source: 'default',
      message: 'Usando configuración por defecto'
    });

  } catch (error) {
    console.error('Error en GET /api/configuration:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Actualizar configuración
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo administradores pueden actualizar configuración
    const userRole = session.user?.role || 'viewer';
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Solo administradores pueden actualizar configuración' }, { status: 403 });
    }

    const { section, data } = await request.json();

    if (!section || !data) {
      return NextResponse.json(
        { error: 'Sección y datos son requeridos' },
        { status: 400 }
      );
    }

    // Validar secciones permitidas
    const allowedSections = ['company', 'apis', 'notifications', 'backup', 'advanced'];
    if (!allowedSections.includes(section)) {
      return NextResponse.json(
        { error: 'Sección no válida' },
        { status: 400 }
      );
    }

    try {
      // Obtener configuración actual
      let currentConfig = defaultConfig;
      const configQuery = `
        SELECT config_data 
        FROM system_configuration 
        WHERE id = 1
      `;
      
      const result = await pgClient.query<{ config_data: SystemConfiguration }>(configQuery, []);
      if (result.data && result.data.length > 0) {
        currentConfig = result.data[0].config_data;
      }

      // Actualizar la sección específica
      const updatedConfig = {
        ...currentConfig,
        [section]: { ...(currentConfig as any)[section], ...data }
      };

      // Guardar configuración actualizada
      const upsertQuery = `
        INSERT INTO system_configuration (id, config_data, updated_at)
        VALUES (1, $1, NOW())
        ON CONFLICT (id) 
        DO UPDATE SET 
          config_data = $1,
          updated_at = NOW()
      `;

      await pgClient.query(upsertQuery, [JSON.stringify(updatedConfig)]);

      console.log(`✅ [CONFIG] Sección ${section} actualizada correctamente`);

      return NextResponse.json({
        success: true,
        message: `Configuración de ${section} actualizada correctamente`,
        updated_section: section
      });

    } catch (postgresqlError) {
      console.error('Error de PostgreSQL:', postgresqlError);
      return NextResponse.json({
        success: false,
        message: 'Error guardando configuración en base de datos',
        fallback: true
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error en POST /api/configuration:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT - Restablecer configuración por defecto
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRole = session.user?.role || 'viewer';
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Solo administradores pueden restablecer configuración' }, { status: 403 });
    }

    try {
      const resetQuery = `
        INSERT INTO system_configuration (id, config_data, updated_at)
        VALUES (1, $1, NOW())
        ON CONFLICT (id) 
        DO UPDATE SET 
          config_data = $1,
          updated_at = NOW()
      `;

      await pgClient.query(resetQuery, [JSON.stringify(defaultConfig)]);

      return NextResponse.json({
        success: true,
        message: 'Configuración restablecida a valores por defecto',
        data: defaultConfig
      });

    } catch (postgresqlError) {
      console.error('Error restableciendo configuración:', postgresqlError);
      return NextResponse.json(
        { error: 'Error restableciendo configuración en base de datos' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error en PUT /api/configuration:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 