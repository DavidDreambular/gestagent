// Servicio de configuración del sistema
// /services/configuration.service.ts

import { postgresqlClient } from '@/lib/postgresql-client';

export interface SystemConfiguration {
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

interface ConfigurationAuditLog {
  timestamp: string;
  user_id: string;
  section: string;
  action: string;
  old_value?: any;
  new_value?: any;
  metadata?: any;
}

class ConfigurationService {
  private configurationCache: SystemConfiguration | null = null;
  private cacheTimestamp: number = 0;
  private cacheTTL = 5 * 60 * 1000; // 5 minutos

  /**
   * Obtiene la configuración por defecto del sistema
   */
  private getDefaultConfiguration(): SystemConfiguration {
    return {
      company: {
        name: 'GestAgent',
        cif: '',
        address: '',
        phone: '',
        email: '',
        logo_url: ''
      },
      apis: {
        mistral_api_key: '',
        openai_api_key: '',
        openrouter_api_key: '',
        stripe_api_key: ''
      },
      notifications: {
        email_enabled: true,
        push_enabled: false,
        vencimientos_dias: 7,
        alertas_criticas: true
      },
      backup: {
        auto_backup_enabled: true,
        backup_frequency_days: 1,
        backup_retention_days: 30,
        backup_location: 'local'
      },
      advanced: {
        debug_mode: false,
        api_rate_limit: 100,
        max_file_size_mb: 50,
        allowed_file_types: ['pdf', 'jpg', 'jpeg', 'png'],
        ocr_language: 'es'
      }
    };
  }

  /**
   * Obtiene la configuración completa del sistema
   */
  async getConfiguration(): Promise<SystemConfiguration> {
    try {
      // Verificar cache
      if (this.configurationCache && 
          Date.now() - this.cacheTimestamp < this.cacheTTL) {
        console.log('🔄 [CONFIG] Usando configuración desde cache');
        return this.configurationCache;
      }

      console.log('🔍 [CONFIG] Cargando configuración desde base de datos...');

      // Cargar desde base de datos
      const result = await postgresqlClient.query(`
        SELECT section, data 
        FROM system_configuration 
        WHERE active = true
      `);

      const configuration = this.getDefaultConfiguration();

      // Mergear configuración de la base de datos
      if (result && result.data && Array.isArray(result.data)) {
        for (const row of result.data) {
          const { section, data } = row as { section: string; data: any };
          try {
            // Los datos ya vienen parseados desde PostgreSQL JSONB
            const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
            (configuration as any)[section] = {
              ...(configuration as any)[section],
              ...parsedData
            };
          } catch (error) {
            console.error(`❌ [CONFIG] Error parseando sección ${section}:`, error);
          }
        }
      }

      // Actualizar cache
      this.configurationCache = configuration;
      this.cacheTimestamp = Date.now();

      console.log('✅ [CONFIG] Configuración cargada correctamente');
      return configuration;

    } catch (error) {
      console.error('❌ [CONFIG] Error cargando configuración:', error);
      
      // Retornar configuración por defecto en caso de error
      const defaultConfig = this.getDefaultConfiguration();
      this.configurationCache = defaultConfig;
      this.cacheTimestamp = Date.now();
      
      return defaultConfig;
    }
  }

  /**
   * Actualiza una sección específica de la configuración
   */
  async updateConfigurationSection(
    section: keyof SystemConfiguration,
    data: any,
    userId: string
  ): Promise<boolean> {
    try {
      console.log(`🔧 [CONFIG] Actualizando sección ${section}...`);

      // Obtener configuración actual para auditoría
      const currentConfig = await this.getConfiguration();
      const oldValue = currentConfig[section];

      // Mergear nuevos datos con existentes
      const updatedData = {
        ...oldValue,
        ...data
      };

      // Actualizar en base de datos
      await postgresqlClient.query(`
        INSERT INTO system_configuration 
        (section, data, updated_at, updated_by, active)
        VALUES ($1, $2, NOW(), $3, true)
        ON CONFLICT (section, active) 
        DO UPDATE SET 
          data = EXCLUDED.data,
          updated_at = NOW(),
          updated_by = EXCLUDED.updated_by
      `, [section, JSON.stringify(updatedData), userId]);

      // Invalidar cache
      this.invalidateCache();

      // Registrar auditoría
      await this.logConfigurationChange({
        timestamp: new Date().toISOString(),
        user_id: userId,
        section,
        action: 'update',
        old_value: oldValue,
        new_value: updatedData
      });

      console.log(`✅ [CONFIG] Sección ${section} actualizada correctamente`);
      return true;

    } catch (error) {
      console.error(`❌ [CONFIG] Error actualizando sección ${section}:`, error);
      return false;
    }
  }

  /**
   * Restablece la configuración a valores por defecto
   */
  async resetConfiguration(userId: string): Promise<SystemConfiguration> {
    try {
      console.log('🔄 [CONFIG] Restableciendo configuración a valores por defecto...');

      // Obtener configuración actual para auditoría
      const currentConfig = await this.getConfiguration();
      const defaultConfig = this.getDefaultConfiguration();

      // Limpiar configuración actual
      await postgresqlClient.query(`
        UPDATE system_configuration 
        SET active = false, updated_at = NOW(), updated_by = $1
        WHERE active = true
      `, [userId]);

      // Insertar configuración por defecto
      for (const [section, data] of Object.entries(defaultConfig)) {
        await postgresqlClient.query(`
          INSERT INTO system_configuration 
          (section, data, updated_at, updated_by, active)
          VALUES ($1, $2, NOW(), $3, true)
        `, [section, JSON.stringify(data), userId]);
      }

      // Invalidar cache
      this.invalidateCache();

      // Registrar auditoría
      await this.logConfigurationChange({
        timestamp: new Date().toISOString(),
        user_id: userId,
        section: 'all',
        action: 'reset',
        old_value: currentConfig,
        new_value: defaultConfig,
        metadata: { reason: 'manual_reset' }
      });

      console.log('✅ [CONFIG] Configuración restablecida correctamente');
      return defaultConfig;

    } catch (error) {
      console.error('❌ [CONFIG] Error restableciendo configuración:', error);
      throw error;
    }
  }

  /**
   * Obtiene el historial de cambios de configuración
   */
  async getConfigurationHistory(limit: number = 50): Promise<ConfigurationAuditLog[]> {
    try {
      const result = await postgresqlClient.query(`
        SELECT * FROM configuration_audit_logs 
        ORDER BY timestamp DESC 
        LIMIT $1
      `, [limit]);

      if (!result.data) return [];

      return result.data.map((row: any) => ({
        timestamp: row.timestamp,
        user_id: row.user_id,
        section: row.section,
        action: row.action,
        old_value: row.old_value || null,
        new_value: row.new_value || null,
        metadata: row.metadata || null
      }));

    } catch (error) {
      console.error('❌ [CONFIG] Error obteniendo historial:', error);
      return [];
    }
  }

  /**
   * Valida una sección de configuración
   */
  validateConfigurationSection(section: keyof SystemConfiguration, data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (section) {
      case 'company':
        if (data.cif && !/^[A-Z]\d{8}$/.test(data.cif)) {
          errors.push('El CIF debe tener el formato correcto (ej: A12345678)');
        }
        if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
          errors.push('El email debe tener un formato válido');
        }
        break;

      case 'apis':
        if (data.mistral_api_key && data.mistral_api_key.length < 10) {
          errors.push('La API key de Mistral parece demasiado corta');
        }
        if (data.openai_api_key && !data.openai_api_key.startsWith('sk-')) {
          errors.push('La API key de OpenAI debe comenzar con "sk-"');
        }
        break;

      case 'backup':
        if (data.backup_frequency_days && (data.backup_frequency_days < 1 || data.backup_frequency_days > 365)) {
          errors.push('La frecuencia de backup debe estar entre 1 y 365 días');
        }
        if (data.backup_retention_days && (data.backup_retention_days < 1 || data.backup_retention_days > 365)) {
          errors.push('La retención de backup debe estar entre 1 y 365 días');
        }
        break;

      case 'advanced':
        if (data.max_file_size_mb && (data.max_file_size_mb < 1 || data.max_file_size_mb > 500)) {
          errors.push('El tamaño máximo de archivo debe estar entre 1MB y 500MB');
        }
        if (data.api_rate_limit && (data.api_rate_limit < 10 || data.api_rate_limit > 10000)) {
          errors.push('El límite de rate debe estar entre 10 y 10000 requests');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Exporta la configuración completa
   */
  async exportConfiguration(): Promise<{ configuration: SystemConfiguration; metadata: any }> {
    try {
      const configuration = await this.getConfiguration();
      const metadata = {
        exported_at: new Date().toISOString(),
        version: '1.0',
        system: 'GestAgent',
        source: 'configuration_export'
      };

      return { configuration, metadata };

    } catch (error) {
      console.error('❌ [CONFIG] Error exportando configuración:', error);
      throw error;
    }
  }

  /**
   * Importa configuración desde archivo
   */
  async importConfiguration(
    configData: { configuration: SystemConfiguration; metadata?: any },
    userId: string,
    options: { overwrite?: boolean; validate?: boolean } = {}
  ): Promise<boolean> {
    try {
      const { configuration } = configData;
      const { overwrite = false, validate = true } = options;

      console.log('📥 [CONFIG] Importando configuración...');

      // Validar configuración si se solicita
      if (validate) {
        for (const [section, data] of Object.entries(configuration)) {
          const validation = this.validateConfigurationSection(section as keyof SystemConfiguration, data);
          if (!validation.valid) {
            throw new Error(`Errores en sección ${section}: ${validation.errors.join(', ')}`);
          }
        }
      }

      // Respaldar configuración actual si no se va a sobrescribir
      if (!overwrite) {
        const currentConfig = await this.getConfiguration();
        await this.logConfigurationChange({
          timestamp: new Date().toISOString(),
          user_id: userId,
          section: 'all',
          action: 'backup_before_import',
          old_value: currentConfig,
          new_value: null,
          metadata: { reason: 'import_backup' }
        });
      }

      // Importar cada sección
      for (const [section, data] of Object.entries(configuration)) {
        await this.updateConfigurationSection(section as keyof SystemConfiguration, data, userId);
      }

      // Registrar importación
      await this.logConfigurationChange({
        timestamp: new Date().toISOString(),
        user_id: userId,
        section: 'all',
        action: 'import',
        old_value: null,
        new_value: configuration,
        metadata: { 
          source: 'import', 
          overwrite,
          validate,
          imported_metadata: configData.metadata 
        }
      });

      console.log('✅ [CONFIG] Configuración importada correctamente');
      return true;

    } catch (error) {
      console.error('❌ [CONFIG] Error importando configuración:', error);
      throw error;
    }
  }

  /**
   * Registra un cambio de configuración en la auditoría
   */
  private async logConfigurationChange(log: ConfigurationAuditLog): Promise<void> {
    try {
      await postgresqlClient.query(`
        INSERT INTO configuration_audit_logs 
        (timestamp, user_id, section, action, old_value, new_value, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        log.timestamp,
        log.user_id,
        log.section,
        log.action,
        log.old_value ? JSON.stringify(log.old_value) : null,
        log.new_value ? JSON.stringify(log.new_value) : null,
        log.metadata ? JSON.stringify(log.metadata) : null
      ]);

    } catch (error) {
      console.error('❌ [CONFIG] Error registrando auditoría:', error);
      // No lanzar error para no interrumpir el flujo principal
    }
  }

  /**
   * Invalida el cache de configuración
   */
  private invalidateCache(): void {
    this.configurationCache = null;
    this.cacheTimestamp = 0;
    console.log('🗑️ [CONFIG] Cache de configuración invalidado');
  }

  /**
   * Inicializa las tablas de configuración si no existen
   */
  async initializeConfigurationTables(): Promise<void> {
    try {
      console.log('🏗️ [CONFIG] Verificando tablas de configuración en PostgreSQL...');

      // Verificar si las tablas existen
      const tablesExist = await postgresqlClient.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('system_configuration', 'configuration_audit_logs')
      `);

      if (!tablesExist.data || tablesExist.data.length < 2) {
        console.log('⚠️  [CONFIG] Tablas de configuración no encontradas');
        console.log('📋 [CONFIG] Por favor ejecute: node scripts/create-configuration-tables-postgresql.js');
        
        // Intentar crear las tablas básicas como fallback
        await this.createBasicTables();
      } else {
        console.log('✅ [CONFIG] Tablas de configuración encontradas en PostgreSQL');
      }

    } catch (error) {
      console.error('❌ [CONFIG] Error verificando tablas:', error);
      // No lanzar error para permitir que la aplicación continúe
    }
  }

  /**
   * Crea las tablas básicas como fallback
   */
  private async createBasicTables(): Promise<void> {
    try {
      await postgresqlClient.query(`
        CREATE TABLE IF NOT EXISTS system_configuration (
          id SERIAL PRIMARY KEY,
          section VARCHAR(50) NOT NULL,
          data JSONB NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_by VARCHAR(100) NOT NULL,
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      await postgresqlClient.query(`
        CREATE TABLE IF NOT EXISTS configuration_audit_logs (
          id SERIAL PRIMARY KEY,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          user_id VARCHAR(100) NOT NULL,
          section VARCHAR(50) NOT NULL,
          action VARCHAR(50) NOT NULL,
          old_value JSONB,
          new_value JSONB,
          metadata JSONB
        )
      `);

      console.log('✅ [CONFIG] Tablas básicas de configuración creadas');

    } catch (error) {
      console.error('❌ [CONFIG] Error creando tablas básicas:', error);
    }
  }
}

// Instancia singleton del servicio
export const configurationService = new ConfigurationService();

// Inicializar tablas al importar el módulo
configurationService.initializeConfigurationTables().catch(console.error);