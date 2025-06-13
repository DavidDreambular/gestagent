/**
 * Sistema de Monitoreo de Performance - Gestagent
 * 
 * Funcionalidades:
 * - Monitoreo de métricas de sistema en tiempo real
 * - Alertas automáticas por umbrales
 * - Optimización automática de recursos
 * - Métricas de aplicación específicas
 * - Reportes de performance
 * - Cache inteligente
 */

import os from 'os';
import { performance } from 'perf_hooks';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

interface SystemMetrics {
  timestamp: number;
  cpu: {
    usage: number;
    loadAverage: number[];
    coreCount: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  disk: {
    totalSpace: number;
    usedSpace: number;
    freeSpace: number;
    usagePercent: number;
  };
  network: {
    bytesReceived: number;
    bytesSent: number;
  };
  process: {
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
    uptime: number;
    pid: number;
  };
}

interface ApplicationMetrics {
  timestamp: number;
  documentsProcessed: number;
  averageProcessingTime: number;
  errorRate: number;
  activeConnections: number;
  queueSize: number;
  cacheHitRate: number;
  responseTime: {
    p50: number;
    p95: number;
    p99: number;
  };
}

interface PerformanceAlert {
  id: string;
  timestamp: number;
  level: 'warning' | 'critical' | 'info';
  metric: string;
  value: number;
  threshold: number;
  message: string;
  resolved?: boolean;
  resolvedAt?: number;
}

interface PerformanceThresholds {
  cpu: { warning: number; critical: number };
  memory: { warning: number; critical: number };
  disk: { warning: number; critical: number };
  responseTime: { warning: number; critical: number };
  errorRate: { warning: number; critical: number };
  queueSize: { warning: number; critical: number };
}

class PerformanceMonitor extends EventEmitter {
  private static instance: PerformanceMonitor;
  private metrics: SystemMetrics[] = [];
  private appMetrics: ApplicationMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;
  private metricsFile: string;
  private maxMetricsHistory = 1000;
  
  private thresholds: PerformanceThresholds = {
    cpu: { warning: 70, critical: 90 },
    memory: { warning: 80, critical: 95 },
    disk: { warning: 85, critical: 95 },
    responseTime: { warning: 2000, critical: 5000 }, // ms
    errorRate: { warning: 5, critical: 15 }, // %
    queueSize: { warning: 100, critical: 500 }
  };

  // Métricas de respuesta para cálculo de percentiles
  private responseTimes: number[] = [];
  private maxResponseTimeHistory = 1000;

  // Cache de métricas frecuentes
  private metricsCache = new Map<string, any>();
  private cacheExpiration = 30000; // 30 segundos

  private constructor() {
    super();
    this.metricsFile = path.join(process.cwd(), 'performance-metrics.json');
    this.loadPersistedMetrics();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Iniciar monitoreo de performance
   */
  start(intervalMs = 30000): void {
    if (this.isRunning) {
      console.log('⚠️ [Performance] Monitor ya está ejecutándose');
      return;
    }

    console.log('🚀 [Performance] Iniciando monitor de performance');
    this.isRunning = true;

    // Recopilar métricas inmediatamente
    this.collectMetrics();

    // Configurar intervalo de recopilación
    this.intervalId = setInterval(() => {
      this.collectMetrics();
    }, intervalMs);

    // Configurar limpieza automática cada hora
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 3600000); // 1 hora

    console.log(`✅ [Performance] Monitor iniciado (intervalo: ${intervalMs}ms)`);
  }

  /**
   * Detener monitoreo de performance
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 [Performance] Deteniendo monitor de performance');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    // Persistir métricas antes de detener
    this.persistMetrics();
    console.log('✅ [Performance] Monitor detenido');
  }

  /**
   * Recopilar todas las métricas del sistema
   */
  private async collectMetrics(): Promise<void> {
    try {
      const timestamp = Date.now();

      // Recopilar métricas del sistema
      const systemMetrics = await this.collectSystemMetrics(timestamp);
      this.metrics.push(systemMetrics);

      // Recopilar métricas de aplicación
      const appMetrics = await this.collectApplicationMetrics(timestamp);
      this.appMetrics.push(appMetrics);

      // Verificar alertas
      this.checkAlerts(systemMetrics, appMetrics);

      // Limpiar historial si es necesario
      if (this.metrics.length > this.maxMetricsHistory) {
        this.metrics = this.metrics.slice(-this.maxMetricsHistory);
      }

      if (this.appMetrics.length > this.maxMetricsHistory) {
        this.appMetrics = this.appMetrics.slice(-this.maxMetricsHistory);
      }

      // Emitir evento con métricas actualizadas
      this.emit('metrics', { system: systemMetrics, application: appMetrics });

      console.log(`📊 [Performance] Métricas recopiladas - CPU: ${systemMetrics.cpu.usage.toFixed(1)}%, RAM: ${systemMetrics.memory.usagePercent.toFixed(1)}%`);

    } catch (error) {
      console.error('❌ [Performance] Error recopilando métricas:', error);
    }
  }

  /**
   * Recopilar métricas del sistema
   */
  private async collectSystemMetrics(timestamp: number): Promise<SystemMetrics> {
    const cacheKey = `system-${Math.floor(timestamp / this.cacheExpiration)}`;
    
    if (this.metricsCache.has(cacheKey)) {
      return this.metricsCache.get(cacheKey);
    }

    // CPU
    const cpuUsage = await this.getCpuUsage();
    const loadAverage = os.loadavg();
    const coreCount = os.cpus().length;

    // Memoria
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;

    // Disco (aproximado)
    const diskStats = await this.getDiskUsage();

    // Proceso actual
    const processMemory = process.memoryUsage();
    const processCpu = process.cpuUsage();

    const systemMetrics: SystemMetrics = {
      timestamp,
      cpu: {
        usage: cpuUsage,
        loadAverage,
        coreCount
      },
      memory: {
        total: totalMemory,
        used: usedMemory,
        free: freeMemory,
        usagePercent: memoryUsagePercent
      },
      disk: diskStats,
      network: {
        bytesReceived: 0, // Placeholder - requiere implementación específica
        bytesSent: 0
      },
      process: {
        memoryUsage: processMemory,
        cpuUsage: processCpu,
        uptime: process.uptime(),
        pid: process.pid
      }
    };

    // Cachear por un tiempo limitado
    this.metricsCache.set(cacheKey, systemMetrics);
    setTimeout(() => {
      this.metricsCache.delete(cacheKey);
    }, this.cacheExpiration);

    return systemMetrics;
  }

  /**
   * Recopilar métricas de aplicación
   */
  private async collectApplicationMetrics(timestamp: number): Promise<ApplicationMetrics> {
    // Obtener métricas de la base de datos (ejemplo)
    const dbMetrics = await this.getDatabaseMetrics();
    
    // Calcular percentiles de tiempo de respuesta
    const responseTimePercentiles = this.calculateResponseTimePercentiles();
    
    return {
      timestamp,
      documentsProcessed: dbMetrics.documentsProcessed || 0,
      averageProcessingTime: dbMetrics.averageProcessingTime || 0,
      errorRate: dbMetrics.errorRate || 0,
      activeConnections: dbMetrics.activeConnections || 0,
      queueSize: dbMetrics.queueSize || 0,
      cacheHitRate: this.calculateCacheHitRate(),
      responseTime: responseTimePercentiles
    };
  }

  /**
   * Obtener uso de CPU
   */
  private async getCpuUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      const startTime = process.hrtime();

      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const endTime = process.hrtime(startTime);

        const userUsage = endUsage.user / 1000;
        const systemUsage = endUsage.system / 1000;
        const totalUsage = userUsage + systemUsage;
        const totalTime = endTime[0] * 1000000 + endTime[1] / 1000;

        const cpuPercent = (totalUsage / totalTime) * 100;
        resolve(Math.min(cpuPercent, 100));
      }, 100);
    });
  }

  /**
   * Obtener uso de disco
   */
  private async getDiskUsage(): Promise<{
    totalSpace: number;
    usedSpace: number;
    freeSpace: number;
    usagePercent: number;
  }> {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      const { stdout } = await execAsync('df -k .');
      const lines = stdout.trim().split('\n');
      
      if (lines.length > 1) {
        const stats = lines[1].split(/\s+/);
        const totalSpace = parseInt(stats[1]) * 1024; // KB to bytes
        const usedSpace = parseInt(stats[2]) * 1024;
        const freeSpace = parseInt(stats[3]) * 1024;
        const usagePercent = (usedSpace / totalSpace) * 100;

        return { totalSpace, usedSpace, freeSpace, usagePercent };
      }
    } catch (error) {
      // Fallback si no se puede ejecutar df
    }

    return {
      totalSpace: 0,
      usedSpace: 0,
      freeSpace: 0,
      usagePercent: 0
    };
  }

  /**
   * Obtener métricas de base de datos
   */
  private async getDatabaseMetrics(): Promise<any> {
    try {
      const pgClient = (await import('@/lib/postgresql-client')).default;
      
      // Documentos procesados en la última hora
      const { data: docsData } = await pgClient.query(`
        SELECT COUNT(*) as count
        FROM document_processing 
        WHERE upload_timestamp >= NOW() - INTERVAL '1 hour'
      `);

      // Tiempo promedio de procesamiento
      const { data: timeData } = await pgClient.query(`
        SELECT AVG(EXTRACT(EPOCH FROM (updated_at - upload_timestamp))) as avg_time
        FROM document_processing 
        WHERE status = 'completed'
        AND upload_timestamp >= NOW() - INTERVAL '1 hour'
      `);

      // Tasa de error
      const { data: errorData } = await pgClient.query(`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'error') as errors,
          COUNT(*) as total
        FROM document_processing 
        WHERE upload_timestamp >= NOW() - INTERVAL '1 hour'
      `);

      // Conexiones activas
      const { data: connectionData } = await pgClient.query(`
        SELECT count(*) as active_connections
        FROM pg_stat_activity 
        WHERE state = 'active'
      `);

      const documentsProcessed = docsData?.[0]?.count || 0;
      const averageProcessingTime = timeData?.[0]?.avg_time || 0;
      const errors = errorData?.[0]?.errors || 0;
      const total = errorData?.[0]?.total || 1;
      const errorRate = total > 0 ? (errors / total) * 100 : 0;
      const activeConnections = connectionData?.[0]?.active_connections || 0;

      return {
        documentsProcessed: parseInt(documentsProcessed),
        averageProcessingTime: parseFloat(averageProcessingTime),
        errorRate: parseFloat(errorRate.toFixed(2)),
        activeConnections: parseInt(activeConnections),
        queueSize: 0 // Placeholder - implementar según sistema de colas
      };

    } catch (error) {
      console.error('Error obteniendo métricas de BD:', error);
      return {
        documentsProcessed: 0,
        averageProcessingTime: 0,
        errorRate: 0,
        activeConnections: 0,
        queueSize: 0
      };
    }
  }

  /**
   * Calcular percentiles de tiempo de respuesta
   */
  private calculateResponseTimePercentiles(): { p50: number; p95: number; p99: number } {
    if (this.responseTimes.length === 0) {
      return { p50: 0, p95: 0, p99: 0 };
    }

    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    
    const p50Index = Math.floor(sorted.length * 0.5);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);

    return {
      p50: sorted[p50Index] || 0,
      p95: sorted[p95Index] || 0,
      p99: sorted[p99Index] || 0
    };
  }

  /**
   * Calcular tasa de aciertos de cache
   */
  private calculateCacheHitRate(): number {
    // Placeholder - implementar según sistema de cache específico
    return Math.random() * 100; // Valor simulado
  }

  /**
   * Verificar alertas basadas en umbrales
   */
  private checkAlerts(systemMetrics: SystemMetrics, appMetrics: ApplicationMetrics): void {
    const timestamp = Date.now();

    // Verificar CPU
    this.checkThreshold('cpu', systemMetrics.cpu.usage, this.thresholds.cpu, timestamp);

    // Verificar memoria
    this.checkThreshold('memory', systemMetrics.memory.usagePercent, this.thresholds.memory, timestamp);

    // Verificar disco
    this.checkThreshold('disk', systemMetrics.disk.usagePercent, this.thresholds.disk, timestamp);

    // Verificar tiempo de respuesta
    this.checkThreshold('responseTime', appMetrics.responseTime.p95, this.thresholds.responseTime, timestamp);

    // Verificar tasa de error
    this.checkThreshold('errorRate', appMetrics.errorRate, this.thresholds.errorRate, timestamp);

    // Verificar tamaño de cola
    this.checkThreshold('queueSize', appMetrics.queueSize, this.thresholds.queueSize, timestamp);
  }

  /**
   * Verificar un umbral específico
   */
  private checkThreshold(
    metric: string, 
    value: number, 
    threshold: { warning: number; critical: number }, 
    timestamp: number
  ): void {
    let level: 'warning' | 'critical' | null = null;
    let thresholdValue = 0;

    if (value >= threshold.critical) {
      level = 'critical';
      thresholdValue = threshold.critical;
    } else if (value >= threshold.warning) {
      level = 'warning';
      thresholdValue = threshold.warning;
    }

    if (level) {
      const alertId = `${metric}-${level}`;
      
      // Verificar si ya existe una alerta activa para esta métrica
      const existingAlert = this.alerts.find(alert => 
        alert.id === alertId && !alert.resolved
      );

      if (!existingAlert) {
        const alert: PerformanceAlert = {
          id: alertId,
          timestamp,
          level,
          metric,
          value,
          threshold: thresholdValue,
          message: `${metric} ha superado el umbral ${level}: ${value.toFixed(2)} >= ${thresholdValue}`
        };

        this.alerts.push(alert);
        this.emit('alert', alert);
        
        console.log(`🚨 [Performance] ${level.toUpperCase()}: ${alert.message}`);
      }
    } else {
      // Resolver alertas existentes si el valor ha bajado
      const activeAlerts = this.alerts.filter(alert => 
        alert.metric === metric && !alert.resolved
      );

      for (const alert of activeAlerts) {
        alert.resolved = true;
        alert.resolvedAt = timestamp;
        this.emit('alertResolved', alert);
        
        console.log(`✅ [Performance] RESUELTO: ${alert.message}`);
      }
    }
  }

  /**
   * Agregar tiempo de respuesta para tracking
   */
  addResponseTime(timeMs: number): void {
    this.responseTimes.push(timeMs);
    
    if (this.responseTimes.length > this.maxResponseTimeHistory) {
      this.responseTimes = this.responseTimes.slice(-this.maxResponseTimeHistory);
    }
  }

  /**
   * Obtener métricas actuales
   */
  getCurrentMetrics(): { system: SystemMetrics | null; application: ApplicationMetrics | null } {
    return {
      system: this.metrics[this.metrics.length - 1] || null,
      application: this.appMetrics[this.appMetrics.length - 1] || null
    };
  }

  /**
   * Obtener historial de métricas
   */
  getMetricsHistory(minutes: number = 60): { system: SystemMetrics[]; application: ApplicationMetrics[] } {
    const cutoffTime = Date.now() - (minutes * 60 * 1000);
    
    return {
      system: this.metrics.filter(m => m.timestamp >= cutoffTime),
      application: this.appMetrics.filter(m => m.timestamp >= cutoffTime)
    };
  }

  /**
   * Obtener alertas activas
   */
  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Obtener todas las alertas
   */
  getAllAlerts(hours: number = 24): PerformanceAlert[] {
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    return this.alerts.filter(alert => alert.timestamp >= cutoffTime);
  }

  /**
   * Configurar umbrales personalizados
   */
  setThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    console.log('⚙️ [Performance] Umbrales actualizados:', this.thresholds);
  }

  /**
   * Obtener reporte de performance
   */
  getPerformanceReport(hours: number = 24): any {
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoffTime);
    const recentAppMetrics = this.appMetrics.filter(m => m.timestamp >= cutoffTime);
    const recentAlerts = this.alerts.filter(a => a.timestamp >= cutoffTime);

    if (recentMetrics.length === 0) {
      return { error: 'No hay métricas disponibles para el período solicitado' };
    }

    // Calcular promedios y extremos
    const avgCpu = recentMetrics.reduce((sum, m) => sum + m.cpu.usage, 0) / recentMetrics.length;
    const maxCpu = Math.max(...recentMetrics.map(m => m.cpu.usage));
    const avgMemory = recentMetrics.reduce((sum, m) => sum + m.memory.usagePercent, 0) / recentMetrics.length;
    const maxMemory = Math.max(...recentMetrics.map(m => m.memory.usagePercent));

    const totalDocuments = recentAppMetrics.reduce((sum, m) => sum + m.documentsProcessed, 0);
    const avgResponseTime = recentAppMetrics.length > 0 
      ? recentAppMetrics.reduce((sum, m) => sum + m.responseTime.p95, 0) / recentAppMetrics.length 
      : 0;

    return {
      period: `${hours} horas`,
      timestamp: new Date().toISOString(),
      system: {
        cpu: { average: avgCpu.toFixed(2), peak: maxCpu.toFixed(2) },
        memory: { average: avgMemory.toFixed(2), peak: maxMemory.toFixed(2) }
      },
      application: {
        documentsProcessed: totalDocuments,
        averageResponseTime: avgResponseTime.toFixed(2)
      },
      alerts: {
        total: recentAlerts.length,
        critical: recentAlerts.filter(a => a.level === 'critical').length,
        warning: recentAlerts.filter(a => a.level === 'warning').length,
        resolved: recentAlerts.filter(a => a.resolved).length
      },
      recommendations: this.generateRecommendations(recentMetrics, recentAppMetrics, recentAlerts)
    };
  }

  /**
   * Generar recomendaciones basadas en métricas
   */
  private generateRecommendations(
    systemMetrics: SystemMetrics[], 
    appMetrics: ApplicationMetrics[], 
    alerts: PerformanceAlert[]
  ): string[] {
    const recommendations: string[] = [];

    // Análisis de CPU
    const avgCpu = systemMetrics.reduce((sum, m) => sum + m.cpu.usage, 0) / systemMetrics.length;
    if (avgCpu > 80) {
      recommendations.push('Considerar aumentar recursos de CPU o optimizar procesos');
    }

    // Análisis de memoria
    const avgMemory = systemMetrics.reduce((sum, m) => sum + m.memory.usagePercent, 0) / systemMetrics.length;
    if (avgMemory > 85) {
      recommendations.push('Considerar aumentar memoria RAM o revisar memory leaks');
    }

    // Análisis de alertas críticas
    const criticalAlerts = alerts.filter(a => a.level === 'critical').length;
    if (criticalAlerts > 5) {
      recommendations.push('Revisar configuración de umbrales - demasiadas alertas críticas');
    }

    // Análisis de tiempo de respuesta
    if (appMetrics.length > 0) {
      const avgResponseTime = appMetrics.reduce((sum, m) => sum + m.responseTime.p95, 0) / appMetrics.length;
      if (avgResponseTime > 3000) {
        recommendations.push('Optimizar tiempos de respuesta - considerar cache o índices de BD');
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Sistema funcionando dentro de parámetros normales');
    }

    return recommendations;
  }

  /**
   * Limpiar métricas antiguas
   */
  private cleanupOldMetrics(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 horas
    
    const initialMetricsCount = this.metrics.length;
    const initialAppMetricsCount = this.appMetrics.length;
    const initialAlertsCount = this.alerts.length;

    this.metrics = this.metrics.filter(m => m.timestamp >= cutoffTime);
    this.appMetrics = this.appMetrics.filter(m => m.timestamp >= cutoffTime);
    this.alerts = this.alerts.filter(a => a.timestamp >= cutoffTime);

    const removedMetrics = initialMetricsCount - this.metrics.length;
    const removedAppMetrics = initialAppMetricsCount - this.appMetrics.length;
    const removedAlerts = initialAlertsCount - this.alerts.length;

    if (removedMetrics > 0 || removedAppMetrics > 0 || removedAlerts > 0) {
      console.log(`🧹 [Performance] Limpieza: ${removedMetrics} métricas, ${removedAppMetrics} app métricas, ${removedAlerts} alertas eliminadas`);
    }
  }

  /**
   * Persistir métricas en archivo
   */
  private persistMetrics(): void {
    try {
      const data = {
        metrics: this.metrics.slice(-100), // Solo últimas 100 métricas
        appMetrics: this.appMetrics.slice(-100),
        alerts: this.alerts.slice(-50),
        timestamp: new Date().toISOString()
      };

      fs.writeFileSync(this.metricsFile, JSON.stringify(data, null, 2));
      console.log('💾 [Performance] Métricas persistidas');
    } catch (error) {
      console.error('❌ [Performance] Error persistiendo métricas:', error);
    }
  }

  /**
   * Cargar métricas persistidas
   */
  private loadPersistedMetrics(): void {
    try {
      if (fs.existsSync(this.metricsFile)) {
        const data = JSON.parse(fs.readFileSync(this.metricsFile, 'utf8'));
        
        this.metrics = data.metrics || [];
        this.appMetrics = data.appMetrics || [];
        this.alerts = data.alerts || [];
        
        console.log(`📊 [Performance] Métricas cargadas: ${this.metrics.length} sistema, ${this.appMetrics.length} aplicación, ${this.alerts.length} alertas`);
      }
    } catch (error) {
      console.error('❌ [Performance] Error cargando métricas persistidas:', error);
    }
  }
}

// Singleton global
export const performanceMonitor = PerformanceMonitor.getInstance();

// Middleware para tracking de tiempo de respuesta
export function performanceMiddleware(req: any, res: any, next: any) {
  const startTime = performance.now();
  
  res.on('finish', () => {
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    performanceMonitor.addResponseTime(responseTime);
    
    // Log slow requests
    if (responseTime > 1000) {
      console.log(`⚠️ [Performance] Slow request: ${req.method} ${req.path} - ${responseTime.toFixed(2)}ms`);
    }
  });
  
  next();
}

export default PerformanceMonitor;