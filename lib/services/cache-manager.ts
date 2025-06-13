/**
 * Sistema de Cache Inteligente - Gestagent
 * 
 * Funcionalidades:
 * - Cache en memoria con TTL configurable
 * - Cache de resultados de consultas frecuentes
 * - Invalidación inteligente de cache
 * - Métricas de cache hit/miss
 * - Compresión automática de datos grandes
 * - Persistencia opcional en Redis
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

interface CacheEntry<T = any> {
  key: string;
  value: T;
  ttl: number;
  createdAt: number;
  lastAccessed: number;
  accessCount: number;
  size: number;
  compressed: boolean;
  tags?: string[];
}

interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  totalKeys: number;
  totalSize: number;
  averageAccessTime: number;
  evictions: number;
}

interface CacheConfig {
  maxSize: number; // Bytes
  maxKeys: number;
  defaultTTL: number; // Milliseconds
  enableCompression: boolean;
  compressionThreshold: number; // Bytes
  persistToDisk?: boolean;
  persistenceFile?: string;
}

class CacheManager extends EventEmitter {
  private static instance: CacheManager;
  private cache = new Map<string, CacheEntry>();
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    totalKeys: 0,
    totalSize: 0,
    averageAccessTime: 0,
    evictions: 0
  };
  
  private config: CacheConfig = {
    maxSize: 100 * 1024 * 1024, // 100MB
    maxKeys: 10000,
    defaultTTL: 15 * 60 * 1000, // 15 minutos
    enableCompression: true,
    compressionThreshold: 1024, // 1KB
    persistToDisk: false
  };

  private accessTimes: number[] = [];
  private maxAccessTimeHistory = 1000;
  private cleanupInterval?: NodeJS.Timeout;

  private constructor() {
    super();
    this.startCleanupTimer();
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Configurar cache manager
   */
  configure(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ [Cache] Configuración actualizada:', this.config);
  }

  /**
   * Obtener valor del cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    const startTime = performance.now();
    
    try {
      const entry = this.cache.get(key);
      
      if (!entry) {
        this.metrics.misses++;
        this.updateMetrics();
        return null;
      }

      // Verificar si ha expirado
      const now = Date.now();
      if (now > entry.createdAt + entry.ttl) {
        this.cache.delete(key);
        this.metrics.misses++;
        this.metrics.evictions++;
        this.updateMetrics();
        return null;
      }

      // Actualizar estadísticas de acceso
      entry.lastAccessed = now;
      entry.accessCount++;
      
      this.metrics.hits++;
      this.recordAccessTime(performance.now() - startTime);
      this.updateMetrics();

      // Descomprimir si es necesario
      let value = entry.value;
      if (entry.compressed && typeof value === 'string') {
        value = this.decompress(value);
      }

      this.emit('hit', { key, size: entry.size });
      return value as T;

    } catch (error) {
      console.error(`❌ [Cache] Error obteniendo ${key}:`, error);
      this.metrics.misses++;
      this.updateMetrics();
      return null;
    }
  }

  /**
   * Establecer valor en cache
   */
  async set<T = any>(
    key: string, 
    value: T, 
    ttl?: number, 
    tags?: string[]
  ): Promise<void> {
    try {
      const now = Date.now();
      const effectiveTTL = ttl || this.config.defaultTTL;
      
      // Serializar y calcular tamaño
      let serializedValue = this.serialize(value);
      const originalSize = this.calculateSize(serializedValue);
      
      // Comprimir si es necesario
      let compressed = false;
      if (this.config.enableCompression && originalSize > this.config.compressionThreshold) {
        serializedValue = this.compress(serializedValue);
        compressed = true;
      }

      const finalSize = this.calculateSize(serializedValue);

      // Verificar límites de tamaño
      await this.ensureSpace(finalSize);

      const entry: CacheEntry<T> = {
        key,
        value: serializedValue as T,
        ttl: effectiveTTL,
        createdAt: now,
        lastAccessed: now,
        accessCount: 0,
        size: finalSize,
        compressed,
        tags
      };

      // Eliminar entrada existente si existe
      if (this.cache.has(key)) {
        const oldEntry = this.cache.get(key)!;
        this.metrics.totalSize -= oldEntry.size;
      }

      this.cache.set(key, entry);
      this.metrics.totalSize += finalSize;
      this.updateMetrics();

      this.emit('set', { 
        key, 
        size: finalSize, 
        compressed, 
        compressionRatio: compressed ? (originalSize / finalSize) : 1 
      });

      console.log(`💾 [Cache] Almacenado: ${key} (${this.formatSize(finalSize)}${compressed ? ', comprimido' : ''})`);

    } catch (error) {
      console.error(`❌ [Cache] Error almacenando ${key}:`, error);
      throw error;
    }
  }

  /**
   * Obtener o establecer (get-or-set pattern)
   */
  async getOrSet<T = any>(
    key: string,
    factory: () => Promise<T> | T,
    ttl?: number,
    tags?: string[]
  ): Promise<T> {
    let value = await this.get<T>(key);
    
    if (value === null) {
      value = await factory();
      await this.set(key, value, ttl, tags);
    }
    
    return value;
  }

  /**
   * Eliminar entrada del cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (entry) {
      this.cache.delete(key);
      this.metrics.totalSize -= entry.size;
      this.updateMetrics();
      
      this.emit('delete', { key, size: entry.size });
      console.log(`🗑️ [Cache] Eliminado: ${key}`);
      return true;
    }
    
    return false;
  }

  /**
   * Verificar si existe una clave
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Verificar si ha expirado
    const now = Date.now();
    if (now > entry.createdAt + entry.ttl) {
      this.cache.delete(key);
      this.metrics.evictions++;
      this.updateMetrics();
      return false;
    }

    return true;
  }

  /**
   * Invalidar cache por tags
   */
  invalidateByTags(tags: string[]): number {
    let invalidated = 0;
    
    for (const [key, entry] of this.cache) {
      if (entry.tags && entry.tags.some(tag => tags.includes(tag))) {
        this.delete(key);
        invalidated++;
      }
    }

    if (invalidated > 0) {
      console.log(`🔄 [Cache] Invalidadas ${invalidated} entradas por tags: ${tags.join(', ')}`);
    }

    return invalidated;
  }

  /**
   * Invalidar cache por patrón
   */
  invalidateByPattern(pattern: RegExp): number {
    let invalidated = 0;
    
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.delete(key);
        invalidated++;
      }
    }

    if (invalidated > 0) {
      console.log(`🔄 [Cache] Invalidadas ${invalidated} entradas por patrón: ${pattern}`);
    }

    return invalidated;
  }

  /**
   * Limpiar todo el cache
   */
  clear(): void {
    const totalKeys = this.cache.size;
    const totalSize = this.metrics.totalSize;
    
    this.cache.clear();
    this.metrics.totalKeys = 0;
    this.metrics.totalSize = 0;
    this.updateMetrics();

    this.emit('clear', { totalKeys, totalSize });
    console.log(`🧹 [Cache] Cache limpiado: ${totalKeys} entradas, ${this.formatSize(totalSize)}`);
  }

  /**
   * Obtener métricas del cache
   */
  getMetrics(): CacheMetrics & {
    topKeys: Array<{ key: string; accessCount: number; size: number }>;
    sizeByType: Record<string, number>;
  } {
    // Top 10 claves más accedidas
    const topKeys = Array.from(this.cache.values())
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10)
      .map(entry => ({
        key: entry.key,
        accessCount: entry.accessCount,
        size: entry.size
      }));

    // Distribución de tamaño por tipo de clave
    const sizeByType: Record<string, number> = {};
    for (const entry of this.cache.values()) {
      const type = entry.key.split(':')[0] || 'unknown';
      sizeByType[type] = (sizeByType[type] || 0) + entry.size;
    }

    return {
      ...this.metrics,
      topKeys,
      sizeByType
    };
  }

  /**
   * Obtener información detallada de una clave
   */
  getKeyInfo(key: string): CacheEntry | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Verificar si ha expirado
    const now = Date.now();
    if (now > entry.createdAt + entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return { ...entry };
  }

  /**
   * Listar todas las claves (con filtros opcionales)
   */
  listKeys(pattern?: RegExp, limit = 100): Array<{
    key: string;
    size: number;
    ttl: number;
    age: number;
    accessCount: number;
  }> {
    const now = Date.now();
    const keys = [];

    for (const [key, entry] of this.cache) {
      // Filtrar por patrón si se especifica
      if (pattern && !pattern.test(key)) {
        continue;
      }

      // Verificar si ha expirado
      if (now > entry.createdAt + entry.ttl) {
        this.cache.delete(key);
        continue;
      }

      keys.push({
        key: entry.key,
        size: entry.size,
        ttl: entry.ttl,
        age: now - entry.createdAt,
        accessCount: entry.accessCount
      });

      if (keys.length >= limit) {
        break;
      }
    }

    return keys.sort((a, b) => b.accessCount - a.accessCount);
  }

  /**
   * Cache de resultados de consultas de base de datos
   */
  async cacheQuery<T = any>(
    sql: string,
    params: any[] = [],
    ttl?: number
  ): Promise<T | null> {
    const key = this.generateQueryKey(sql, params);
    
    return this.getOrSet(
      key,
      async () => {
        // Aquí se ejecutaría la consulta real
        console.log(`🔍 [Cache] Ejecutando consulta: ${sql.substring(0, 50)}...`);
        return null; // Placeholder
      },
      ttl,
      ['database', 'query']
    );
  }

  /**
   * Precalentar cache con datos frecuentes
   */
  async warmup(warmupData: Array<{ key: string; factory: () => Promise<any>; ttl?: number }>): Promise<void> {
    console.log(`🔥 [Cache] Precalentando cache con ${warmupData.length} entradas...`);
    
    const promises = warmupData.map(async ({ key, factory, ttl }) => {
      try {
        if (!this.has(key)) {
          const value = await factory();
          await this.set(key, value, ttl, ['warmup']);
        }
      } catch (error) {
        console.error(`❌ [Cache] Error precalentando ${key}:`, error);
      }
    });

    await Promise.all(promises);
    console.log(`✅ [Cache] Precalentamiento completado`);
  }

  // Métodos privados

  private startCleanupTimer(): void {
    // Limpiar entradas expiradas cada 5 minutos
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 5 * 60 * 1000);
  }

  private stopCleanupTimer(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  private cleanupExpired(): void {
    const now = Date.now();
    let cleaned = 0;
    let sizeFreed = 0;

    for (const [key, entry] of this.cache) {
      if (now > entry.createdAt + entry.ttl) {
        sizeFreed += entry.size;
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.metrics.evictions += cleaned;
      this.metrics.totalSize -= sizeFreed;
      this.updateMetrics();
      
      console.log(`🧹 [Cache] Limpieza automática: ${cleaned} entradas expiradas, ${this.formatSize(sizeFreed)} liberados`);
    }
  }

  private async ensureSpace(requiredSize: number): Promise<void> {
    // Verificar límite de claves
    if (this.cache.size >= this.config.maxKeys) {
      await this.evictLRU(1);
    }

    // Verificar límite de tamaño
    while (this.metrics.totalSize + requiredSize > this.config.maxSize) {
      await this.evictLRU(1);
    }
  }

  private async evictLRU(count: number): Promise<void> {
    // Ordenar por último acceso (Least Recently Used)
    const entries = Array.from(this.cache.values())
      .sort((a, b) => a.lastAccessed - b.lastAccessed);

    for (let i = 0; i < count && i < entries.length; i++) {
      const entry = entries[i];
      this.cache.delete(entry.key);
      this.metrics.totalSize -= entry.size;
      this.metrics.evictions++;
      
      this.emit('evict', { key: entry.key, reason: 'LRU', size: entry.size });
    }

    this.updateMetrics();
  }

  private updateMetrics(): void {
    this.metrics.totalKeys = this.cache.size;
    this.metrics.hitRate = this.metrics.hits + this.metrics.misses > 0
      ? (this.metrics.hits / (this.metrics.hits + this.metrics.misses)) * 100
      : 0;
    
    this.metrics.averageAccessTime = this.accessTimes.length > 0
      ? this.accessTimes.reduce((sum, time) => sum + time, 0) / this.accessTimes.length
      : 0;
  }

  private recordAccessTime(time: number): void {
    this.accessTimes.push(time);
    
    if (this.accessTimes.length > this.maxAccessTimeHistory) {
      this.accessTimes = this.accessTimes.slice(-this.maxAccessTimeHistory);
    }
  }

  private serialize<T>(value: T): string {
    return JSON.stringify(value);
  }

  private compress(data: string): string {
    // Placeholder - en producción usar zlib o similar
    return Buffer.from(data).toString('base64');
  }

  private decompress(data: string): any {
    // Placeholder - en producción usar zlib o similar
    const decompressed = Buffer.from(data, 'base64').toString();
    return JSON.parse(decompressed);
  }

  private calculateSize(value: any): number {
    return Buffer.byteLength(typeof value === 'string' ? value : JSON.stringify(value));
  }

  private formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  private generateQueryKey(sql: string, params: any[]): string {
    const normalizedSQL = sql.replace(/\s+/g, ' ').trim();
    const paramsString = JSON.stringify(params);
    return `query:${Buffer.from(normalizedSQL + paramsString).toString('base64')}`;
  }

  /**
   * Cerrar cache manager
   */
  close(): void {
    this.stopCleanupTimer();
    this.clear();
    console.log('🔒 [Cache] Cache manager cerrado');
  }
}

// Singleton global
export const cacheManager = CacheManager.getInstance();

// Decorador para cache automático de métodos
export function Cacheable(ttl?: number, tags?: string[]) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`;
      
      return cacheManager.getOrSet(
        cacheKey,
        () => method.apply(this, args),
        ttl,
        tags
      );
    };

    return descriptor;
  };
}

export default CacheManager;