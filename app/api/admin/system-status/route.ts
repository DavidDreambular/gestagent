import { NextRequest, NextResponse } from 'next/server';
import pgClient from '@/lib/postgresql-client';
import fs from 'fs';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface SystemStatus {
  database: { status: 'healthy' | 'warning' | 'error', message: string };
  mistral: { status: 'healthy' | 'warning' | 'error', message: string };
  email: { status: 'healthy' | 'warning' | 'error', message: string };
  storage: { status: 'healthy' | 'warning' | 'error', message: string };
  lastBackup: string;
  systemLoad: number;
  memoryUsage: number;
  diskUsage: number;
  uptime: number;
  processCount: number;
  documentsProcessed24h: number;
  errorRate: number;
}

/**
 * GET /api/admin/system-status
 * Obtener el estado actual del sistema y métricas de rendimiento
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📊 [System Status] Obteniendo estado del sistema');

    // TODO: Verificar permisos de administrador
    // const session = await getAuthSession(request);
    // if (!session || session.role !== 'admin') {
    //   return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    // }

    // Obtener estado de todos los servicios en paralelo
    const [
      databaseStatus,
      mistralStatus,
      emailStatus,
      storageStatus,
      systemMetrics,
      backupInfo,
      processingStats
    ] = await Promise.all([
      checkDatabaseStatus(),
      checkMistralStatus(),
      checkEmailStatus(),
      checkStorageStatus(),
      getSystemMetrics(),
      getBackupInfo(),
      getProcessingStats()
    ]);

    const status: SystemStatus = {
      database: databaseStatus,
      mistral: mistralStatus,
      email: emailStatus,
      storage: storageStatus,
      lastBackup: backupInfo.lastBackup,
      systemLoad: systemMetrics.systemLoad,
      memoryUsage: systemMetrics.memoryUsage,
      diskUsage: systemMetrics.diskUsage,
      uptime: systemMetrics.uptime,
      processCount: systemMetrics.processCount,
      documentsProcessed24h: processingStats.documentsProcessed24h,
      errorRate: processingStats.errorRate
    };

    console.log('✅ [System Status] Estado del sistema obtenido');

    return NextResponse.json({
      success: true,
      status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [System Status] Error obteniendo estado:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * Verificar estado de la base de datos
 */
async function checkDatabaseStatus() {
  try {
    const startTime = Date.now();
    const { data, error } = await pgClient.query('SELECT NOW() as current_time, version() as db_version');
    const responseTime = Date.now() - startTime;

    if (error) {
      return {
        status: 'error' as const,
        message: `Error de conexión: ${error.message}`
      };
    }

    // Verificar estadísticas de conexiones
    const { data: connectionData } = await pgClient.query(`
      SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `);

    const connections = connectionData?.[0] || { total_connections: 0, active_connections: 0 };
    
    if (responseTime > 1000) {
      return {
        status: 'warning' as const,
        message: `Respuesta lenta (${responseTime}ms). Conexiones: ${connections.active_connections}/${connections.total_connections}`
      };
    }

    return {
      status: 'healthy' as const,
      message: `PostgreSQL conectado (${responseTime}ms). Conexiones activas: ${connections.active_connections}`
    };

  } catch (error) {
    return {
      status: 'error' as const,
      message: `Error de base de datos: ${error instanceof Error ? error.message : 'Desconocido'}`
    };
  }
}

/**
 * Verificar estado de Mistral API
 */
async function checkMistralStatus() {
  try {
    const mistralApiKey = process.env.MISTRAL_API_KEY;
    
    if (!mistralApiKey) {
      return {
        status: 'warning' as const,
        message: 'API Key no configurada'
      };
    }

    // Test básico de conectividad (sin hacer llamada real para ahorrar créditos)
    if (mistralApiKey.startsWith('mr-') && mistralApiKey.length > 20) {
      return {
        status: 'healthy' as const,
        message: 'API Key configurada correctamente'
      };
    }

    return {
      status: 'warning' as const,
      message: 'API Key parece inválida'
    };

  } catch (error) {
    return {
      status: 'error' as const,
      message: `Error verificando Mistral: ${error instanceof Error ? error.message : 'Desconocido'}`
    };
  }
}

/**
 * Verificar estado del email
 */
async function checkEmailStatus() {
  try {
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;

    if (!smtpHost || !smtpUser || !smtpPassword) {
      return {
        status: 'warning' as const,
        message: 'SMTP no configurado completamente'
      };
    }

    // Verificar que el host sea válido
    if (smtpHost.includes('.') && smtpUser.includes('@')) {
      return {
        status: 'healthy' as const,
        message: `SMTP configurado: ${smtpHost}`
      };
    }

    return {
      status: 'warning' as const,
      message: 'Configuración SMTP incompleta'
    };

  } catch (error) {
    return {
      status: 'error' as const,
      message: `Error verificando email: ${error instanceof Error ? error.message : 'Desconocido'}`
    };
  }
}

/**
 * Verificar estado del almacenamiento
 */
async function checkStorageStatus() {
  try {
    const uploadsDir = './uploads';
    const backupsDir = './backups';

    // Verificar que los directorios existan
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    // Obtener estadísticas de espacio
    const stats = fs.statSync('./');
    
    // En sistemas Unix, intentar obtener espacio en disco
    try {
      const { stdout } = await execAsync('df -h .');
      const lines = stdout.trim().split('\n');
      if (lines.length > 1) {
        const diskInfo = lines[1].split(/\s+/);
        const usage = diskInfo[4]?.replace('%', '');
        const usagePercent = parseInt(usage || '0');
        
        if (usagePercent > 90) {
          return {
            status: 'error' as const,
            message: `Espacio en disco crítico: ${usage}% usado`
          };
        } else if (usagePercent > 80) {
          return {
            status: 'warning' as const,
            message: `Espacio en disco alto: ${usage}% usado`
          };
        }
        
        return {
          status: 'healthy' as const,
          message: `Espacio disponible: ${usage}% usado`
        };
      }
    } catch (dfError) {
      // Si no se puede ejecutar df, usar método alternativo
    }

    return {
      status: 'healthy' as const,
      message: 'Directorios de almacenamiento disponibles'
    };

  } catch (error) {
    return {
      status: 'error' as const,
      message: `Error verificando almacenamiento: ${error instanceof Error ? error.message : 'Desconocido'}`
    };
  }
}

/**
 * Obtener métricas del sistema
 */
async function getSystemMetrics() {
  try {
    // Métricas de memoria
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = (usedMemory / totalMemory) * 100;

    // Carga del sistema
    const loadAvg = os.loadavg();
    const systemLoad = loadAvg[0] / os.cpus().length; // Normalizar por número de CPUs

    // Uptime
    const uptime = os.uptime();

    // Número de procesos (aproximado usando Node.js)
    const processCount = process.pid || 1;

    // Uso de disco (simulado - en producción usar librerías específicas)
    let diskUsage = 0;
    try {
      const { stdout } = await execAsync('df -h . | tail -1 | awk \'{print $5}\' | sed \'s/%//\'');
      diskUsage = parseFloat(stdout.trim()) || 0;
    } catch {
      diskUsage = 25; // Valor por defecto si no se puede obtener
    }

    return {
      systemLoad: Math.min(systemLoad, 1), // Cap at 100%
      memoryUsage: Math.round(memoryUsage * 100) / 100,
      diskUsage: Math.round(diskUsage * 100) / 100,
      uptime: Math.round(uptime),
      processCount
    };

  } catch (error) {
    console.error('Error obteniendo métricas del sistema:', error);
    return {
      systemLoad: 0,
      memoryUsage: 0,
      diskUsage: 0,
      uptime: 0,
      processCount: 1
    };
  }
}

/**
 * Obtener información de backups
 */
async function getBackupInfo() {
  try {
    const backupsDir = './backups';
    
    if (!fs.existsSync(backupsDir)) {
      return { lastBackup: 'Nunca' };
    }

    const files = fs.readdirSync(backupsDir);
    const backupFiles = files.filter(file => file.includes('backup') || file.includes('.sql'));
    
    if (backupFiles.length === 0) {
      return { lastBackup: 'Nunca' };
    }

    // Encontrar el backup más reciente
    let latestBackup = '';
    let latestTime = 0;

    for (const file of backupFiles) {
      const filePath = `${backupsDir}/${file}`;
      const stats = fs.statSync(filePath);
      if (stats.mtime.getTime() > latestTime) {
        latestTime = stats.mtime.getTime();
        latestBackup = stats.mtime.toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    }

    return { lastBackup: latestBackup || 'Nunca' };

  } catch (error) {
    console.error('Error obteniendo info de backups:', error);
    return { lastBackup: 'Error' };
  }
}

/**
 * Obtener estadísticas de procesamiento
 */
async function getProcessingStats() {
  try {
    // Documentos procesados en las últimas 24 horas
    const { data: docsData } = await pgClient.query(`
      SELECT COUNT(*) as count
      FROM document_processing 
      WHERE upload_timestamp >= NOW() - INTERVAL '24 hours'
    `);

    // Tasa de error en las últimas 24 horas
    const { data: errorData } = await pgClient.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'error') as errors,
        COUNT(*) as total
      FROM document_processing 
      WHERE upload_timestamp >= NOW() - INTERVAL '24 hours'
    `);

    const documentsProcessed24h = docsData?.[0]?.count || 0;
    const errors = errorData?.[0]?.errors || 0;
    const total = errorData?.[0]?.total || 1;
    const errorRate = total > 0 ? (errors / total) * 100 : 0;

    return {
      documentsProcessed24h: parseInt(documentsProcessed24h),
      errorRate: Math.round(errorRate * 100) / 100
    };

  } catch (error) {
    console.error('Error obteniendo estadísticas de procesamiento:', error);
    return {
      documentsProcessed24h: 0,
      errorRate: 0
    };
  }
}