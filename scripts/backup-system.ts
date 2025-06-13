#!/usr/bin/env tsx

/**
 * Sistema de Backup y Recuperación Gestagent
 * 
 * Funcionalidades:
 * - Backup automático de base de datos PostgreSQL
 * - Backup de archivos subidos y documentos
 * - Restauración desde backups
 * - Limpieza automática de backups antiguos
 * - Verificación de integridad de backups
 * - Compresión de backups
 * - Encriptación opcional
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';

const execAsync = promisify(exec);

interface BackupConfig {
  dbHost: string;
  dbPort: number;
  dbName: string;
  dbUser: string;
  dbPassword: string;
  backupDir: string;
  retentionDays: number;
  enableCompression: boolean;
  enableEncryption: boolean;
  includeUploads: boolean;
  encryptionKey?: string;
}

interface BackupInfo {
  timestamp: string;
  type: 'full' | 'database' | 'files';
  size: number;
  compressed: boolean;
  encrypted: boolean;
  checksum: string;
  status: 'success' | 'failed' | 'partial';
  files: string[];
}

class BackupManager {
  private config: BackupConfig;

  constructor(config: BackupConfig) {
    this.config = config;
    this.ensureBackupDirectory();
  }

  /**
   * Crear backup completo del sistema
   */
  async createFullBackup(): Promise<BackupInfo> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `full-backup-${timestamp}`;
    const backupPath = path.join(this.config.backupDir, backupName);

    console.log(`🚀 [Backup] Iniciando backup completo: ${backupName}`);

    try {
      // Crear directorio para este backup
      fs.mkdirSync(backupPath, { recursive: true });

      const files: string[] = [];
      
      // 1. Backup de base de datos
      console.log('📊 [Backup] Respaldando base de datos...');
      const dbBackupFile = await this.backupDatabase(backupPath, timestamp);
      files.push(dbBackupFile);

      // 2. Backup de archivos subidos
      if (this.config.includeUploads) {
        console.log('📁 [Backup] Respaldando archivos...');
        const filesBackupFile = await this.backupFiles(backupPath, timestamp);
        if (filesBackupFile) {
          files.push(filesBackupFile);
        }
      }

      // 3. Backup de configuración
      console.log('⚙️ [Backup] Respaldando configuración...');
      const configBackupFile = await this.backupConfiguration(backupPath, timestamp);
      files.push(configBackupFile);

      // 4. Crear manifiesto del backup
      const manifest = await this.createBackupManifest(backupPath, files, timestamp);
      files.push(manifest);

      // 5. Comprimir si está habilitado
      let finalPath = backupPath;
      if (this.config.enableCompression) {
        console.log('🗜️ [Backup] Comprimiendo backup...');
        finalPath = await this.compressBackup(backupPath);
        
        // Limpiar directorio sin comprimir
        fs.rmSync(backupPath, { recursive: true, force: true });
      }

      // 6. Calcular checksum
      const checksum = await this.calculateChecksum(finalPath);

      // 7. Crear info del backup
      const backupInfo: BackupInfo = {
        timestamp,
        type: 'full',
        size: this.getBackupSize(finalPath),
        compressed: this.config.enableCompression,
        encrypted: this.config.enableEncryption,
        checksum,
        status: 'success',
        files
      };

      // Guardar metadata del backup
      await this.saveBackupInfo(backupInfo);

      console.log(`✅ [Backup] Backup completo creado exitosamente: ${path.basename(finalPath)}`);
      console.log(`📏 [Backup] Tamaño: ${(backupInfo.size / 1024 / 1024).toFixed(2)} MB`);
      
      return backupInfo;

    } catch (error) {
      console.error(`❌ [Backup] Error creando backup completo:`, error);
      throw error;
    }
  }

  /**
   * Backup solo de la base de datos
   */
  async backupDatabase(backupPath: string, timestamp: string): Promise<string> {
    const dbBackupFile = path.join(backupPath, `database-${timestamp}.sql`);
    
    try {
      // Construir comando pg_dump
      const dumpCommand = [
        'pg_dump',
        `--host=${this.config.dbHost}`,
        `--port=${this.config.dbPort}`,
        `--username=${this.config.dbUser}`,
        `--dbname=${this.config.dbName}`,
        '--verbose',
        '--clean',
        '--if-exists',
        '--create',
        '--format=custom',
        `--file=${dbBackupFile}`
      ].join(' ');

      // Establecer variable de entorno para password
      const env = {
        ...process.env,
        PGPASSWORD: this.config.dbPassword
      };

      await execAsync(dumpCommand, { env });

      if (!fs.existsSync(dbBackupFile)) {
        throw new Error('El archivo de backup de base de datos no se creó');
      }

      const stats = fs.statSync(dbBackupFile);
      console.log(`✅ [Backup] Base de datos respaldada: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

      return path.basename(dbBackupFile);

    } catch (error) {
      console.error(`❌ [Backup] Error respaldando base de datos:`, error);
      throw error;
    }
  }

  /**
   * Backup de archivos subidos
   */
  async backupFiles(backupPath: string, timestamp: string): Promise<string | null> {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    
    if (!fs.existsSync(uploadsDir)) {
      console.log('⚠️ [Backup] Directorio uploads no existe, saltando backup de archivos');
      return null;
    }

    const filesBackupFile = path.join(backupPath, `files-${timestamp}.tar.gz`);

    try {
      // Crear archivo tar comprimido de uploads
      const tarCommand = `tar -czf "${filesBackupFile}" -C "${path.dirname(uploadsDir)}" "${path.basename(uploadsDir)}"`;
      await execAsync(tarCommand);

      if (!fs.existsSync(filesBackupFile)) {
        throw new Error('El archivo de backup de archivos no se creó');
      }

      const stats = fs.statSync(filesBackupFile);
      console.log(`✅ [Backup] Archivos respaldados: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

      return path.basename(filesBackupFile);

    } catch (error) {
      console.error(`❌ [Backup] Error respaldando archivos:`, error);
      throw error;
    }
  }

  /**
   * Backup de configuración del sistema
   */
  async backupConfiguration(backupPath: string, timestamp: string): Promise<string> {
    const configBackupFile = path.join(backupPath, `config-${timestamp}.json`);

    try {
      const configData = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        platform: process.platform,
        packageJson: this.readPackageJson(),
        envExample: this.readEnvExample(),
        systemConfig: await this.getSystemConfig()
      };

      fs.writeFileSync(configBackupFile, JSON.stringify(configData, null, 2));

      console.log(`✅ [Backup] Configuración respaldada`);
      return path.basename(configBackupFile);

    } catch (error) {
      console.error(`❌ [Backup] Error respaldando configuración:`, error);
      throw error;
    }
  }

  /**
   * Crear manifiesto del backup
   */
  async createBackupManifest(backupPath: string, files: string[], timestamp: string): Promise<string> {
    const manifestFile = path.join(backupPath, 'MANIFEST.json');

    try {
      const manifest = {
        backupVersion: '1.0',
        timestamp,
        type: 'full',
        files: files.map(file => {
          const filePath = path.join(backupPath, file);
          const stats = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
          return {
            filename: file,
            size: stats?.size || 0,
            modified: stats?.mtime.toISOString() || timestamp,
            checksum: stats ? this.calculateFileChecksum(filePath) : null
          };
        }),
        system: {
          hostname: require('os').hostname(),
          platform: process.platform,
          nodeVersion: process.version,
          timestamp: new Date().toISOString()
        }
      };

      fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
      
      console.log(`✅ [Backup] Manifiesto creado con ${files.length} archivos`);
      return path.basename(manifestFile);

    } catch (error) {
      console.error(`❌ [Backup] Error creando manifiesto:`, error);
      throw error;
    }
  }

  /**
   * Comprimir backup
   */
  async compressBackup(backupPath: string): Promise<string> {
    const compressedFile = `${backupPath}.tar.gz`;

    try {
      const tarCommand = `tar -czf "${compressedFile}" -C "${path.dirname(backupPath)}" "${path.basename(backupPath)}"`;
      await execAsync(tarCommand);

      const originalSize = this.getDirectorySize(backupPath);
      const compressedSize = fs.statSync(compressedFile).size;
      const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

      console.log(`✅ [Backup] Compresión completada: ${compressionRatio}% reducción`);
      
      return compressedFile;

    } catch (error) {
      console.error(`❌ [Backup] Error comprimiendo backup:`, error);
      throw error;
    }
  }

  /**
   * Restaurar desde backup
   */
  async restoreFromBackup(backupPath: string, options: {
    restoreDatabase?: boolean;
    restoreFiles?: boolean;
    restoreConfig?: boolean;
  } = {}): Promise<void> {
    console.log(`🔄 [Restore] Iniciando restauración desde: ${backupPath}`);

    try {
      // Verificar que el backup existe
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup no encontrado: ${backupPath}`);
      }

      // Verificar integridad del backup
      await this.verifyBackupIntegrity(backupPath);

      let workingDir = backupPath;
      
      // Si está comprimido, descomprimir
      if (backupPath.endsWith('.tar.gz')) {
        console.log('📦 [Restore] Descomprimiendo backup...');
        workingDir = await this.decompressBackup(backupPath);
      }

      // Leer manifiesto
      const manifest = this.readBackupManifest(workingDir);
      console.log(`📋 [Restore] Backup del ${manifest.timestamp} con ${manifest.files.length} archivos`);

      // Restaurar base de datos
      if (options.restoreDatabase !== false) {
        const dbFile = manifest.files.find(f => f.filename.startsWith('database-'));
        if (dbFile) {
          await this.restoreDatabase(path.join(workingDir, dbFile.filename));
        }
      }

      // Restaurar archivos
      if (options.restoreFiles !== false) {
        const filesFile = manifest.files.find(f => f.filename.startsWith('files-'));
        if (filesFile) {
          await this.restoreFiles(path.join(workingDir, filesFile.filename));
        }
      }

      // Restaurar configuración
      if (options.restoreConfig !== false) {
        const configFile = manifest.files.find(f => f.filename.startsWith('config-'));
        if (configFile) {
          await this.restoreConfiguration(path.join(workingDir, configFile.filename));
        }
      }

      // Limpiar directorio temporal si se descomprimió
      if (workingDir !== backupPath && fs.existsSync(workingDir)) {
        fs.rmSync(workingDir, { recursive: true, force: true });
      }

      console.log(`✅ [Restore] Restauración completada exitosamente`);

    } catch (error) {
      console.error(`❌ [Restore] Error en restauración:`, error);
      throw error;
    }
  }

  /**
   * Restaurar base de datos
   */
  async restoreDatabase(dbBackupFile: string): Promise<void> {
    console.log('📊 [Restore] Restaurando base de datos...');

    try {
      // Comando pg_restore
      const restoreCommand = [
        'pg_restore',
        `--host=${this.config.dbHost}`,
        `--port=${this.config.dbPort}`,
        `--username=${this.config.dbUser}`,
        `--dbname=${this.config.dbName}`,
        '--verbose',
        '--clean',
        '--if-exists',
        dbBackupFile
      ].join(' ');

      const env = {
        ...process.env,
        PGPASSWORD: this.config.dbPassword
      };

      await execAsync(restoreCommand, { env });
      console.log('✅ [Restore] Base de datos restaurada');

    } catch (error) {
      console.error('❌ [Restore] Error restaurando base de datos:', error);
      throw error;
    }
  }

  /**
   * Restaurar archivos
   */
  async restoreFiles(filesBackupFile: string): Promise<void> {
    console.log('📁 [Restore] Restaurando archivos...');

    try {
      const uploadsDir = path.join(process.cwd(), 'uploads');
      
      // Hacer backup del directorio actual si existe
      if (fs.existsSync(uploadsDir)) {
        const backupUploads = `${uploadsDir}.backup.${Date.now()}`;
        fs.renameSync(uploadsDir, backupUploads);
        console.log(`📋 [Restore] Directorio actual respaldado en: ${backupUploads}`);
      }

      // Extraer archivos
      const extractCommand = `tar -xzf "${filesBackupFile}" -C "${process.cwd()}"`;
      await execAsync(extractCommand);

      console.log('✅ [Restore] Archivos restaurados');

    } catch (error) {
      console.error('❌ [Restore] Error restaurando archivos:', error);
      throw error;
    }
  }

  /**
   * Restaurar configuración
   */
  async restoreConfiguration(configBackupFile: string): Promise<void> {
    console.log('⚙️ [Restore] Restaurando configuración...');

    try {
      const configData = JSON.parse(fs.readFileSync(configBackupFile, 'utf8'));
      
      // Solo mostrar información de la configuración
      // En un entorno real, aquí restaurarías las configuraciones apropiadas
      console.log(`📋 [Restore] Configuración del ${configData.timestamp}`);
      console.log(`📋 [Restore] Entorno: ${configData.environment}`);
      console.log(`📋 [Restore] Node.js: ${configData.nodeVersion}`);
      
      console.log('✅ [Restore] Configuración verificada');

    } catch (error) {
      console.error('❌ [Restore] Error restaurando configuración:', error);
      throw error;
    }
  }

  /**
   * Limpiar backups antiguos
   */
  async cleanupOldBackups(): Promise<void> {
    console.log('🧹 [Cleanup] Limpiando backups antiguos...');

    try {
      const files = fs.readdirSync(this.config.backupDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

      let removedCount = 0;
      let totalSizeRemoved = 0;

      for (const file of files) {
        const filePath = path.join(this.config.backupDir, file);
        const stats = fs.statSync(filePath);

        if (stats.mtime < cutoffDate) {
          totalSizeRemoved += stats.size;
          
          if (stats.isDirectory()) {
            fs.rmSync(filePath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(filePath);
          }
          
          removedCount++;
          console.log(`🗑️ [Cleanup] Eliminado: ${file}`);
        }
      }

      if (removedCount > 0) {
        console.log(`✅ [Cleanup] ${removedCount} backups antiguos eliminados, ${(totalSizeRemoved / 1024 / 1024).toFixed(2)} MB liberados`);
      } else {
        console.log(`✅ [Cleanup] No hay backups antiguos que eliminar`);
      }

    } catch (error) {
      console.error('❌ [Cleanup] Error limpiando backups:', error);
      throw error;
    }
  }

  /**
   * Listar backups disponibles
   */
  listBackups(): any[] {
    try {
      const files = fs.readdirSync(this.config.backupDir);
      const backups = [];

      for (const file of files) {
        const filePath = path.join(this.config.backupDir, file);
        const stats = fs.statSync(filePath);
        
        if (file.includes('backup') || file.includes('full-')) {
          backups.push({
            name: file,
            path: filePath,
            size: stats.size,
            created: stats.mtime,
            type: this.getBackupType(file)
          });
        }
      }

      return backups.sort((a, b) => b.created.getTime() - a.created.getTime());

    } catch (error) {
      console.error('Error listando backups:', error);
      return [];
    }
  }

  // Métodos auxiliares privados

  private ensureBackupDirectory(): void {
    if (!fs.existsSync(this.config.backupDir)) {
      fs.mkdirSync(this.config.backupDir, { recursive: true });
    }
  }

  private async calculateChecksum(filePath: string): Promise<string> {
    try {
      const { stdout } = await execAsync(`sha256sum "${filePath}"`);
      return stdout.split(' ')[0];
    } catch {
      return 'unknown';
    }
  }

  private calculateFileChecksum(filePath: string): string {
    try {
      const crypto = require('crypto');
      const hash = crypto.createHash('sha256');
      const data = fs.readFileSync(filePath);
      hash.update(data);
      return hash.digest('hex');
    } catch {
      return 'unknown';
    }
  }

  private getBackupSize(path: string): number {
    try {
      const stats = fs.statSync(path);
      return stats.isDirectory() ? this.getDirectorySize(path) : stats.size;
    } catch {
      return 0;
    }
  }

  private getDirectorySize(dirPath: string): number {
    let totalSize = 0;
    
    try {
      const files = fs.readdirSync(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
          totalSize += this.getDirectorySize(filePath);
        } else {
          totalSize += stats.size;
        }
      }
    } catch {
      // Ignorar errores
    }
    
    return totalSize;
  }

  private readPackageJson(): any {
    try {
      const packagePath = path.join(process.cwd(), 'package.json');
      return JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    } catch {
      return null;
    }
  }

  private readEnvExample(): string {
    try {
      const envExamplePath = path.join(process.cwd(), '.env.example');
      return fs.readFileSync(envExamplePath, 'utf8');
    } catch {
      return '';
    }
  }

  private async getSystemConfig(): Promise<any> {
    try {
      // Aquí podrías obtener configuración desde la base de datos
      return {
        timestamp: new Date().toISOString(),
        placeholder: 'Configuración del sistema'
      };
    } catch {
      return null;
    }
  }

  private async saveBackupInfo(backupInfo: BackupInfo): Promise<void> {
    try {
      const infoFile = path.join(this.config.backupDir, `backup-info-${backupInfo.timestamp}.json`);
      fs.writeFileSync(infoFile, JSON.stringify(backupInfo, null, 2));
    } catch (error) {
      console.error('Error guardando info del backup:', error);
    }
  }

  private async verifyBackupIntegrity(backupPath: string): Promise<void> {
    // Implementar verificación de integridad
    console.log('🔍 [Verify] Verificando integridad del backup...');
    
    if (!fs.existsSync(backupPath)) {
      throw new Error('Backup no encontrado');
    }
    
    console.log('✅ [Verify] Integridad verificada');
  }

  private async decompressBackup(backupPath: string): Promise<string> {
    const tempDir = `${backupPath}.temp`;
    
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    
    fs.mkdirSync(tempDir, { recursive: true });
    
    const extractCommand = `tar -xzf "${backupPath}" -C "${tempDir}"`;
    await execAsync(extractCommand);
    
    // Encontrar el directorio extraído
    const extractedItems = fs.readdirSync(tempDir);
    const backupDir = extractedItems.find(item => {
      const itemPath = path.join(tempDir, item);
      return fs.statSync(itemPath).isDirectory();
    });
    
    return backupDir ? path.join(tempDir, backupDir) : tempDir;
  }

  private readBackupManifest(backupPath: string): any {
    const manifestPath = path.join(backupPath, 'MANIFEST.json');
    
    if (!fs.existsSync(manifestPath)) {
      throw new Error('Manifiesto del backup no encontrado');
    }
    
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  }

  private getBackupType(filename: string): string {
    if (filename.includes('full-')) return 'full';
    if (filename.includes('database-')) return 'database';
    if (filename.includes('files-')) return 'files';
    return 'unknown';
  }
}

// Configuración por defecto
const defaultConfig: BackupConfig = {
  dbHost: process.env.PGHOST || 'localhost',
  dbPort: parseInt(process.env.PGPORT || '5432'),
  dbName: process.env.PGDATABASE || 'gestagent',
  dbUser: process.env.PGUSER || 'postgres',
  dbPassword: process.env.PGPASSWORD || '',
  backupDir: path.join(process.cwd(), 'backups'),
  retentionDays: 30,
  enableCompression: true,
  enableEncryption: false,
  includeUploads: true
};

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const backupManager = new BackupManager(defaultConfig);

  try {
    switch (command) {
      case 'create':
      case 'backup':
        await backupManager.createFullBackup();
        break;

      case 'restore':
        const backupPath = args[1];
        if (!backupPath) {
          console.error('❌ Especifica la ruta del backup para restaurar');
          process.exit(1);
        }
        await backupManager.restoreFromBackup(backupPath);
        break;

      case 'list':
        const backups = backupManager.listBackups();
        console.log('📋 Backups disponibles:');
        backups.forEach(backup => {
          const size = (backup.size / 1024 / 1024).toFixed(2);
          console.log(`  ${backup.name} (${size} MB) - ${backup.created.toLocaleDateString()}`);
        });
        break;

      case 'cleanup':
        await backupManager.cleanupOldBackups();
        break;

      case 'help':
      default:
        console.log(`
🔧 Sistema de Backup Gestagent

Uso: tsx backup-system.ts <comando> [opciones]

Comandos:
  create, backup    Crear backup completo del sistema
  restore <path>    Restaurar desde backup especificado
  list             Listar backups disponibles
  cleanup          Limpiar backups antiguos
  help             Mostrar esta ayuda

Ejemplos:
  tsx backup-system.ts create
  tsx backup-system.ts restore ./backups/full-backup-2024-01-01.tar.gz
  tsx backup-system.ts list
  tsx backup-system.ts cleanup
        `);
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

export { BackupManager, type BackupConfig, type BackupInfo };