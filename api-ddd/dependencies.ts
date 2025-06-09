// Configuración de dependencias para el sistema DDD
// Actualizado para usar servicios PostgreSQL reales en modo producción

// Importar servicios PostgreSQL reales
import { postgreSQLSuppliersCustomersService } from '../services/postgresql-suppliers-customers.service';
import { postgreSQLNotificationService } from '../services/postgresql-notification.service';

// Importar repositorios PostgreSQL
import { PostgreSQLAuditLogRepository } from '../infrastructure/repositories/postgresql-audit-log.repository';
import { PostgreSQLDocumentRepository } from '../infrastructure/repositories/postgresql-document.repository';

// Importar servicios de procesamiento (mantener existentes)
import { DocumentProcessorMistralEnhanced } from '../services/document-processor-mistral-enhanced';

// 🚀 CONFIGURACIÓN DE PRODUCCIÓN POSTGRESQL
export const dependencies = {
  // Repositorios de datos
  auditLogRepository: new PostgreSQLAuditLogRepository(),
  documentRepository: new PostgreSQLDocumentRepository(),
  
  // Servicios de negocio
  documentProcessor: new DocumentProcessorMistralEnhanced(),
  
  // Servicios PostgreSQL reales
  suppliersCustomersService: postgreSQLSuppliersCustomersService,
  notificationService: postgreSQLNotificationService,
  
  // Configuración del entorno
  config: {
    environment: process.env.NODE_ENV || 'development',
    database: {
      connectionString: process.env.POSTGRES_CONNECTION_STRING || '',
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DATABASE || 'gestagent_db',
      user: process.env.POSTGRES_USER || 'gestagent_user',
      password: process.env.POSTGRES_PASSWORD || ''
    },
    apis: {
      mistralApiKey: process.env.MISTRAL_API_KEY || '',
      openaiApiKey: process.env.OPENAI_API_KEY || ''
    },
    upload: {
      directory: process.env.UPLOAD_DIR || './uploads',
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800') // 50MB default
    },
    auth: {
      nextAuthUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      nextAuthSecret: process.env.NEXTAUTH_SECRET || 'development-secret-key'
    }
  }
};

// 🔧 INICIALIZACIÓN DE SERVICIOS POSTGRESQL
export async function initializeServices(): Promise<void> {
  try {
    console.log('🚀 [Dependencies] Inicializando servicios PostgreSQL...');
    
    // Inicializar servicios de base de datos
    await dependencies.suppliersCustomersService.initializeTables();
    await dependencies.notificationService.initializeTable();
    
    console.log('✅ [Dependencies] Servicios PostgreSQL inicializados correctamente');
    
    // Enviar notificación de sistema iniciado
    await dependencies.notificationService.sendNotification({
      user_id: 'system',
      type: 'success',
      title: 'Sistema iniciado',
      message: 'GestAgent PostgreSQL se ha iniciado correctamente'
    });
    
  } catch (error) {
    console.error('❌ [Dependencies] Error inicializando servicios:', error);
    
    // Enviar notificación de error crítico
    try {
      await dependencies.notificationService.sendNotification({
        user_id: 'system',
        type: 'error',
        title: 'Error crítico de inicialización',
        message: `Error iniciando servicios PostgreSQL: ${(error as Error).message}`
      });
    } catch (notificationError) {
      console.error('❌ [Dependencies] Error enviando notificación de error:', notificationError);
    }
    
    throw error;
  }
}

// 📊 MÉTRICAS Y MONITOREO
export async function getSystemHealth(): Promise<any> {
  try {
    console.log('🔍 [Dependencies] Verificando salud del sistema...');
    
    // Obtener estadísticas de servicios
    const [suppliersStats, notificationStats] = await Promise.all([
      dependencies.suppliersCustomersService.getSuppliersStats(),
      dependencies.notificationService.getNotificationStats()
    ]);
    
    const systemHealth = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: dependencies.config.environment,
      database: {
        connected: true, // TODO: verificar conexión real
        type: 'postgresql'
      },
      services: {
        suppliers: {
          active: suppliersStats.active || 0,
          total: suppliersStats.total || 0
        },
        notifications: {
          total: notificationStats.total || 0,
          unread: notificationStats.unread || 0
        }
      },
      apis: {
        mistral: !!dependencies.config.apis.mistralApiKey,
        openai: !!dependencies.config.apis.openaiApiKey
      }
    };
    
    console.log('✅ [Dependencies] Sistema funcionando correctamente');
    return systemHealth;
    
  } catch (error) {
    console.error('❌ [Dependencies] Error verificando salud del sistema:', error);
    
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: (error as Error).message,
      environment: dependencies.config.environment
    };
  }
}

// 🧹 LIMPIEZA Y MANTENIMIENTO
export async function performMaintenance(): Promise<void> {
  try {
    console.log('🧹 [Dependencies] Iniciando tareas de mantenimiento...');
    
    // Limpiar notificaciones expiradas
    const deletedNotifications = await dependencies.notificationService.deleteExpiredNotifications();
    
    console.log(`🧹 [Dependencies] Mantenimiento completado:`);
    console.log(`   - ${deletedNotifications} notificaciones expiradas eliminadas`);
    
    // Enviar notificación de mantenimiento completado
    await dependencies.notificationService.sendNotification({
      user_id: 'system',
      type: 'info',
      title: 'Mantenimiento completado',
      message: `Tareas de mantenimiento finalizadas. ${deletedNotifications} notificaciones eliminadas.`
    });
    
  } catch (error) {
    console.error('❌ [Dependencies] Error en mantenimiento:', error);
    throw error;
  }
}

// Exportar configuración por defecto
export default dependencies;

// Exportar instancias individuales para compatibilidad
export const documentRepository = dependencies.documentRepository;
export const auditLogRepository = dependencies.auditLogRepository;
export const documentProcessor = dependencies.documentProcessor;
export const suppliersCustomersService = dependencies.suppliersCustomersService;
export const notificationService = dependencies.notificationService;

// Tipos para TypeScript
export type Dependencies = typeof dependencies;
export type SystemConfig = typeof dependencies.config; 