import { NextRequest, NextResponse } from 'next/server';
import pgClient from '@/lib/postgresql-client';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';

interface SystemConfig {
  mistralApiKey: string;
  mistralModel: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  enableNotifications: boolean;
  maxFileSize: number;
  sessionTimeout: number;
  enableAuditLog: boolean;
  maxConcurrentProcessing: number;
  enableAutoBackup: boolean;
  backupFrequency: string;
}

/**
 * GET /api/admin/configuration
 * Obtener la configuración actual del sistema
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔧 [Admin Config] Obteniendo configuración del sistema');

    // TODO: Verificar permisos de administrador
    // const session = await getAuthSession(request);
    // if (!session || session.role !== 'admin') {
    //   return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    // }

    // Obtener configuración desde la base de datos
    const { data: configData, error: configError } = await pgClient.query(
      'SELECT config_key, config_value FROM system_config WHERE active = true'
    );

    if (configError) {
      console.error('❌ [Admin Config] Error obteniendo configuración:', configError);
      // Devolver configuración por defecto si no existe en BD
      return NextResponse.json({
        success: true,
        config: getDefaultConfig()
      });
    }

    // Convertir array de configuración a objeto
    const config: any = {};
    configData?.forEach((row: any) => {
      const key = row.config_key;
      let value = row.config_value;
      
      // Parsear valores según el tipo
      try {
        value = JSON.parse(value);
      } catch {
        // Si no es JSON válido, mantener como string
      }
      
      config[key] = value;
    });

    // Fusionar con configuración por defecto
    const finalConfig = { ...getDefaultConfig(), ...config };

    console.log('✅ [Admin Config] Configuración obtenida exitosamente');

    return NextResponse.json({
      success: true,
      config: finalConfig
    });

  } catch (error) {
    console.error('❌ [Admin Config] Error interno:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/configuration
 * Guardar configuración del sistema
 */
export async function POST(request: NextRequest) {
  try {
    console.log('💾 [Admin Config] Guardando configuración del sistema');

    // TODO: Verificar permisos de administrador
    // const session = await getAuthSession(request);
    // if (!session || session.role !== 'admin') {
    //   return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    // }

    const { config } = await request.json();

    if (!config) {
      return NextResponse.json(
        { success: false, error: 'Configuración requerida' },
        { status: 400 }
      );
    }

    // Validar configuración
    const validationResult = validateConfig(config);
    if (!validationResult.valid) {
      return NextResponse.json(
        { success: false, error: validationResult.error },
        { status: 400 }
      );
    }

    // Crear tabla de configuración si no existe
    await ensureConfigTable();

    // Guardar cada configuración en la base de datos
    for (const [key, value] of Object.entries(config)) {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      
      await pgClient.query(`
        INSERT INTO system_config (config_key, config_value, updated_at, active)
        VALUES ($1, $2, NOW(), true)
        ON CONFLICT (config_key) 
        DO UPDATE SET 
          config_value = EXCLUDED.config_value,
          updated_at = NOW()
      `, [key, stringValue]);
    }

    // Escribir configuración crítica a variables de entorno
    await updateEnvironmentFile(config);

    // Registrar en audit logs
    try {
      await pgClient.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          'admin', // TODO: obtener del session
          'UPDATE',
          'system_config',
          'global',
          JSON.stringify({
            updated_keys: Object.keys(config),
            updated_by: 'admin_panel'
          })
        ]
      );
    } catch (auditError) {
      console.log('Audit log not available:', auditError);
    }

    console.log('✅ [Admin Config] Configuración guardada exitosamente');

    return NextResponse.json({
      success: true,
      message: 'Configuración guardada correctamente'
    });

  } catch (error) {
    console.error('❌ [Admin Config] Error guardando configuración:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * Crear tabla de configuración si no existe
 */
async function ensureConfigTable() {
  try {
    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS system_config (
        id SERIAL PRIMARY KEY,
        config_key VARCHAR(255) UNIQUE NOT NULL,
        config_value TEXT NOT NULL,
        description TEXT,
        config_type VARCHAR(50) DEFAULT 'string',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        active BOOLEAN DEFAULT true
      )
    `);

    // Crear índice para búsquedas rápidas
    await pgClient.query(`
      CREATE INDEX IF NOT EXISTS idx_system_config_key_active 
      ON system_config (config_key, active)
    `);

  } catch (error) {
    console.error('Error creando tabla de configuración:', error);
  }
}

/**
 * Configuración por defecto del sistema
 */
function getDefaultConfig(): SystemConfig {
  return {
    mistralApiKey: process.env.MISTRAL_API_KEY || '',
    mistralModel: 'mistral-large-latest',
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: parseInt(process.env.SMTP_PORT || '587'),
    smtpUser: process.env.SMTP_USER || '',
    smtpPassword: process.env.SMTP_PASSWORD || '',
    enableNotifications: true,
    maxFileSize: 10,
    sessionTimeout: 24,
    enableAuditLog: true,
    maxConcurrentProcessing: 5,
    enableAutoBackup: false,
    backupFrequency: 'daily'
  };
}

/**
 * Validar configuración
 */
function validateConfig(config: any) {
  // Validaciones básicas
  if (config.maxFileSize && (config.maxFileSize < 1 || config.maxFileSize > 100)) {
    return { valid: false, error: 'El tamaño máximo de archivo debe estar entre 1 y 100 MB' };
  }

  if (config.sessionTimeout && (config.sessionTimeout < 1 || config.sessionTimeout > 168)) {
    return { valid: false, error: 'El timeout de sesión debe estar entre 1 y 168 horas' };
  }

  if (config.maxConcurrentProcessing && (config.maxConcurrentProcessing < 1 || config.maxConcurrentProcessing > 20)) {
    return { valid: false, error: 'El procesamiento concurrente debe estar entre 1 y 20' };
  }

  if (config.smtpPort && (config.smtpPort < 1 || config.smtpPort > 65535)) {
    return { valid: false, error: 'El puerto SMTP debe estar entre 1 y 65535' };
  }

  return { valid: true };
}

/**
 * Actualizar archivo de variables de entorno
 */
async function updateEnvironmentFile(config: any) {
  try {
    const envFile = path.join(process.cwd(), '.env.local');
    let envContent = '';

    // Leer archivo existente si existe
    try {
      envContent = fs.readFileSync(envFile, 'utf8');
    } catch {
      // Archivo no existe, empezar con contenido vacío
    }

    // Mapeo de configuración a variables de entorno
    const envMapping: Record<string, string> = {
      mistralApiKey: 'MISTRAL_API_KEY',
      smtpHost: 'SMTP_HOST',
      smtpPort: 'SMTP_PORT',
      smtpUser: 'SMTP_USER',
      smtpPassword: 'SMTP_PASSWORD'
    };

    // Actualizar variables de entorno críticas
    for (const [configKey, envKey] of Object.entries(envMapping)) {
      if (config[configKey] !== undefined && config[configKey] !== '') {
        const value = config[configKey];
        const envLine = `${envKey}=${value}`;
        
        // Reemplazar si existe, agregar si no existe
        const regex = new RegExp(`^${envKey}=.*$`, 'm');
        if (regex.test(envContent)) {
          envContent = envContent.replace(regex, envLine);
        } else {
          envContent += `\n${envLine}`;
        }
      }
    }

    // Escribir archivo actualizado
    fs.writeFileSync(envFile, envContent.trim() + '\n');
    console.log('✅ [Admin Config] Variables de entorno actualizadas');

  } catch (error) {
    console.error('❌ [Admin Config] Error actualizando .env.local:', error);
    // No fallar si no se puede actualizar el archivo
  }
}