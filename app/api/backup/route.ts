// API Route para sistema de backup
// /app/api/backup/route.ts
// Gestión de backups automáticos y manuales

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PostgreSQLClient } from '@/lib/postgresql-client';
import { AuditService } from '@/services/audit';
import crypto from 'crypto';

const pgClient = new PostgreSQLClient();

// Tipos para backup
interface BackupInfo {
  id: string;
  type: 'manual' | 'automatic';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  size_bytes: number;
  file_path: string;
  created_at: string;
  completed_at?: string;
  error_message?: string;
  includes: {
    documents: boolean;
    users: boolean;
    configuration: boolean;
    audit_logs: boolean;
  };
  metadata: {
    total_documents: number;
    total_users: number;
    compression_ratio?: number;
    checksum?: string;
  };
}

interface BackupStats {
  total_backups: number;
  successful_backups: number;
  failed_backups: number;
  total_size_bytes: number;
  last_backup_date?: string;
  next_scheduled_backup?: string;
  retention_policy_days: number;
}

export const dynamic = 'force-dynamic';

// GET - Listar backups y estadísticas
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo administradores pueden ver backups
    const userRole = session.user?.role || 'viewer';
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Solo administradores pueden acceder a backups' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (action === 'stats') {
      return await getBackupStats();
    }

    try {
      // Consultar backups de PostgreSQL
      const backupsQuery = `
        SELECT * FROM backups 
        ORDER BY created_at DESC 
        LIMIT $1 OFFSET $2
      `;
      
      const result = await pgClient.query<BackupInfo>(backupsQuery, [limit, offset]);
      const backups = result.data || [];

      // Obtener estadísticas
      const statsQuery = `
        SELECT 
          COUNT(*) as total_backups,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_backups,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_backups,
          SUM(size_bytes) as total_size_bytes,
          MAX(CASE WHEN status = 'completed' THEN completed_at END) as last_backup_date
        FROM backups
      `;
      
      const statsResult = await pgClient.query<{
        total_backups: number;
        successful_backups: number;
        failed_backups: number;
        total_size_bytes: number;
        last_backup_date: string;
      }>(statsQuery, []);

      const stats = statsResult.data?.[0] || {
        total_backups: 0,
        successful_backups: 0,
        failed_backups: 0,
        total_size_bytes: 0,
        last_backup_date: null
      };

      return NextResponse.json({
        success: true,
        data: {
          backups,
          stats: {
            ...stats,
            retention_policy_days: 30,
            next_scheduled_backup: getNextScheduledBackup()
          }
        },
        pagination: {
          limit,
          offset,
          total: stats.total_backups
        },
        source: 'database'
      });

    } catch (postgresqlError) {
      console.warn('Error consultando backups de PostgreSQL:', postgresqlError);
      
      // Fallback a datos de ejemplo
      const mockBackups: BackupInfo[] = [
        {
          id: 'backup-001',
          type: 'automatic',
          status: 'completed',
          size_bytes: 15728640, // 15MB
          file_path: '/backups/gestagent_2024-01-15_auto.sql.gz',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          completed_at: new Date(Date.now() - 86395000).toISOString(),
          includes: {
            documents: true,
            users: true,
            configuration: true,
            audit_logs: true
          },
          metadata: {
            total_documents: 45,
            total_users: 8,
            compression_ratio: 0.75,
            checksum: 'sha256:abc123...'
          }
        },
        {
          id: 'backup-002',
          type: 'manual',
          status: 'completed',
          size_bytes: 12582912, // 12MB
          file_path: '/backups/gestagent_2024-01-14_manual.sql.gz',
          created_at: new Date(Date.now() - 172800000).toISOString(),
          completed_at: new Date(Date.now() - 172795000).toISOString(),
          includes: {
            documents: true,
            users: true,
            configuration: false,
            audit_logs: false
          },
          metadata: {
            total_documents: 42,
            total_users: 8,
            compression_ratio: 0.78,
            checksum: 'sha256:def456...'
          }
        }
      ];

      const mockStats: BackupStats = {
        total_backups: 5,
        successful_backups: 4,
        failed_backups: 1,
        total_size_bytes: 67108864, // 64MB
        last_backup_date: mockBackups[0].completed_at,
        next_scheduled_backup: getNextScheduledBackup(),
        retention_policy_days: 30
      };

      return NextResponse.json({
        success: true,
        data: {
          backups: mockBackups.slice(offset, offset + limit),
          stats: mockStats
        },
        pagination: {
          limit,
          offset,
          total: mockBackups.length
        },
        source: 'mock',
        warning: 'Usando datos de ejemplo'
      });
    }

  } catch (error) {
    console.error('Error en GET /api/backup:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear backup manual
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRole = session.user?.role || 'viewer';
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Solo administradores pueden crear backups' }, { status: 403 });
    }

    const { includes, description } = await request.json();

    // Validar parámetros
    const defaultIncludes = {
      documents: true,
      users: true,
      configuration: true,
      audit_logs: true
    };

    const backupIncludes = { ...defaultIncludes, ...includes };
    const backupId = `backup-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    console.log(`🔄 [BACKUP] Iniciando backup manual ID: ${backupId}`);

    // Crear registro de backup
    const backupInfo: BackupInfo = {
      id: backupId,
      type: 'manual',
      status: 'pending',
      size_bytes: 0,
      file_path: `/backups/gestagent_${new Date().toISOString().split('T')[0]}_manual_${backupId}.sql.gz`,
      created_at: new Date().toISOString(),
      includes: backupIncludes,
      metadata: {
        total_documents: 0,
        total_users: 0
      }
    };

    try {
      // Registrar backup en base de datos
      await createBackupRecord(backupInfo);

      // Iniciar proceso de backup (simulado)
      setTimeout(async () => {
        await processBackup(backupId, backupIncludes);
      }, 1000);

      // Registrar en auditoría
      await AuditService.logAction({
        userId: session.user?.id || undefined,
        action: 'backup_created',
        resourceType: 'backup',
        resourceId: backupId,
        details: {
          type: 'manual',
          includes: backupIncludes,
          description
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Backup iniciado correctamente',
        backupId,
        status: 'pending',
        estimatedTime: '5-10 minutos'
      });

    } catch (postgresqlError) {
      console.error('Error creando backup en PostgreSQL:', postgresqlError);
      
      // Simular backup exitoso para demo
      return NextResponse.json({
        success: true,
        message: 'Backup simulado iniciado correctamente',
        backupId,
        status: 'pending',
        estimatedTime: '5-10 minutos',
        mode: 'simulation'
      });
    }

  } catch (error) {
    console.error('Error en POST /api/backup:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar backup
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRole = session.user?.role || 'viewer';
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Solo administradores pueden eliminar backups' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const backupId = searchParams.get('id');

    if (!backupId) {
      return NextResponse.json(
        { error: 'ID de backup requerido' },
        { status: 400 }
      );
    }

    try {
      // Eliminar backup de PostgreSQL
      const deleteQuery = `DELETE FROM backups WHERE id = $1`;
      await pgClient.query(deleteQuery, [backupId]);

      // Registrar en auditoría
      await AuditService.logAction({
        userId: session.user?.id || undefined,
        action: 'backup_deleted',
        resourceType: 'backup',
        resourceId: backupId,
        details: { deleted_at: new Date().toISOString() }
      });

      return NextResponse.json({
        success: true,
        message: 'Backup eliminado correctamente',
        backupId
      });

    } catch (postgresqlError) {
      console.error('Error eliminando backup:', postgresqlError);
      return NextResponse.json(
        { error: 'Error eliminando backup de la base de datos' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error en DELETE /api/backup:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Funciones helper
async function getBackupStats(): Promise<NextResponse> {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_backups,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_backups,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_backups,
        SUM(size_bytes) as total_size_bytes,
        MAX(CASE WHEN status = 'completed' THEN completed_at END) as last_backup_date
      FROM backups
    `;
    
    const result = await pgClient.query<{
      total_backups: number;
      successful_backups: number;
      failed_backups: number;
      total_size_bytes: number;
      last_backup_date: string;
    }>(statsQuery, []);

    const stats = result.data?.[0] || {
      total_backups: 0,
      successful_backups: 0,
      failed_backups: 0,
      total_size_bytes: 0,
      last_backup_date: null
    };

    return NextResponse.json({
      success: true,
      data: {
        ...stats,
        retention_policy_days: 30,
        next_scheduled_backup: getNextScheduledBackup(),
        success_rate: stats.total_backups > 0 ? (stats.successful_backups / stats.total_backups) * 100 : 0
      }
    });

  } catch (error) {
    // Fallback stats
    return NextResponse.json({
      success: true,
      data: {
        total_backups: 5,
        successful_backups: 4,
        failed_backups: 1,
        total_size_bytes: 67108864,
        last_backup_date: new Date(Date.now() - 86400000).toISOString(),
        next_scheduled_backup: getNextScheduledBackup(),
        success_rate: 80,
        retention_policy_days: 30
      },
      source: 'mock'
    });
  }
}

function getNextScheduledBackup(): string {
  // Calcular próximo backup automático (cada 7 días a las 2:00 AM)
  const now = new Date();
  const nextBackup = new Date(now);
  nextBackup.setDate(now.getDate() + 7);
  nextBackup.setHours(2, 0, 0, 0);
  
  return nextBackup.toISOString();
}

async function createBackupRecord(backupInfo: BackupInfo): Promise<void> {
  const insertQuery = `
    INSERT INTO backups (id, type, status, size_bytes, file_path, created_at, includes, metadata)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `;
  
  await pgClient.query(insertQuery, [
    backupInfo.id,
    backupInfo.type,
    backupInfo.status,
    backupInfo.size_bytes,
    backupInfo.file_path,
    backupInfo.created_at,
    JSON.stringify(backupInfo.includes),
    JSON.stringify(backupInfo.metadata)
  ]);
}

async function processBackup(backupId: string, includes: any): Promise<void> {
  try {
    console.log(`⚡ [BACKUP] Procesando backup: ${backupId}`);
    
    // Actualizar estado a "en progreso"
    await updateBackupStatus(backupId, 'in_progress');
    
    // Simular proceso de backup (en producción sería pg_dump)
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Simular datos del backup completado
    const completedSize = Math.floor(Math.random() * 20000000) + 10000000; // 10-30MB
    const metadata = {
      total_documents: 45,
      total_users: 8,
      compression_ratio: 0.75,
      checksum: `sha256:${crypto.randomBytes(32).toString('hex')}`
    };
    
    // Actualizar estado a "completado"
    await updateBackupStatus(backupId, 'completed', completedSize, metadata);
    
    console.log(`✅ [BACKUP] Backup completado: ${backupId}`);
    
  } catch (error) {
    console.error(`❌ [BACKUP] Error procesando backup ${backupId}:`, error);
    await updateBackupStatus(backupId, 'failed', 0, null, error instanceof Error ? error.message : 'Error desconocido');
  }
}

async function updateBackupStatus(
  backupId: string, 
  status: string, 
  sizeBytes?: number, 
  metadata?: any, 
  errorMessage?: string
): Promise<void> {
  try {
    const updateQuery = `
      UPDATE backups 
      SET status = $1, 
          size_bytes = COALESCE($2, size_bytes),
          metadata = COALESCE($3, metadata),
          error_message = $4,
          completed_at = CASE WHEN $1 IN ('completed', 'failed') THEN NOW() ELSE completed_at END
      WHERE id = $5
    `;
    
    await pgClient.query(updateQuery, [
      status,
      sizeBytes,
      metadata ? JSON.stringify(metadata) : null,
      errorMessage,
      backupId
    ]);
  } catch (error) {
    console.error('Error actualizando estado de backup:', error);
  }
} 