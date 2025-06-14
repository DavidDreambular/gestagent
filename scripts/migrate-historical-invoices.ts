#!/usr/bin/env ts-node

/**
 * Script de migración de datos históricos
 * Procesa documentos existentes para vincularlos con el nuevo sistema de entity matching
 * 
 * Uso:
 *   npx ts-node scripts/migrate-historical-invoices.ts
 *   npx ts-node scripts/migrate-historical-invoices.ts --limit 50 --dry-run
 */

import pgClient from '../lib/postgresql-client';
import { invoiceEntityLinkerService } from '../services/invoice-entity-linker.service';

interface MigrationOptions {
  limit?: number;
  dryRun?: boolean;
  batchSize?: number;
  verbose?: boolean;
}

interface MigrationStats {
  total_documents: number;
  processed_documents: number;
  successful_links: number;
  failed_links: number;
  new_suppliers: number;
  new_customers: number;
  errors: string[];
  processing_time_ms: number;
}

class HistoricalInvoiceMigrator {
  private options: MigrationOptions;
  private stats: MigrationStats;

  constructor(options: MigrationOptions = {}) {
    this.options = {
      limit: options.limit || 100,
      dryRun: options.dryRun || false,
      batchSize: options.batchSize || 10,
      verbose: options.verbose || false,
      ...options
    };

    this.stats = {
      total_documents: 0,
      processed_documents: 0,
      successful_links: 0,
      failed_links: 0,
      new_suppliers: 0,
      new_customers: 0,
      errors: [],
      processing_time_ms: 0
    };
  }

  /**
   * Obtener documentos que necesitan migración
   */
  private async getDocumentsToMigrate(): Promise<any[]> {
    try {
      const { data, error } = await pgClient.query(`
        SELECT 
          job_id, 
          document_type,
          upload_timestamp,
          emitter_name,
          receiver_name,
          processed_json,
          supplier_id,
          customer_id
        FROM documents 
        WHERE status = 'completed'
          AND processed_json IS NOT NULL 
          AND processed_json != '{}'
          AND (supplier_id IS NULL OR customer_id IS NULL)
        ORDER BY upload_timestamp DESC
        LIMIT $1
      `, [this.options.limit]);

      if (error) {
        throw new Error(`Error obteniendo documentos: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error obteniendo documentos a migrar:', error);
      throw error;
    }
  }

  /**
   * Procesar documento individual
   */
  private async processDocument(document: any): Promise<boolean> {
    try {
      if (this.options.verbose) {
        console.log(`📄 Procesando documento ${document.job_id} (${document.document_type})`);
      }

      // Ejecutar entity matching en el documento
      const linkingResult = await invoiceEntityLinkerService.linkDocumentToEntities(
        document.job_id,
        document.processed_json
      );

      if (linkingResult.success) {
        this.stats.successful_links += linkingResult.summary.successful_links;
        this.stats.new_suppliers += linkingResult.summary.new_entities_created;
        this.stats.new_customers += linkingResult.customer_links.filter((link: any) => link.created_new).length;

        if (this.options.verbose) {
          console.log(`  ✅ Vinculado: ${linkingResult.summary.successful_links}/${linkingResult.summary.total_invoices} facturas`);
          if (linkingResult.summary.new_entities_created > 0) {
            console.log(`  🆕 ${linkingResult.summary.new_entities_created} nuevas entidades creadas`);
          }
        }

        return true;
      } else {
        this.stats.failed_links++;
        const errorMsg = `Error procesando ${document.job_id}: ${linkingResult.errors.join(', ')}`;
        this.stats.errors.push(errorMsg);
        
        if (this.options.verbose) {
          console.log(`  ❌ ${errorMsg}`);
        }

        return false;
      }
    } catch (error) {
      this.stats.failed_links++;
      const errorMsg = `Error excepción en ${document.job_id}: ${error instanceof Error ? error.message : 'Error desconocido'}`;
      this.stats.errors.push(errorMsg);
      
      if (this.options.verbose) {
        console.log(`  💥 ${errorMsg}`);
      }

      return false;
    }
  }

  /**
   * Procesar documentos en lotes
   */
  private async processBatch(documents: any[]): Promise<void> {
    const batchSize = this.options.batchSize || 10;
    
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      
      console.log(`📦 Procesando lote ${Math.floor(i / batchSize) + 1} (${batch.length} documentos)`);

      // Procesar en paralelo dentro del lote
      const promises = batch.map(doc => this.processDocument(doc));
      await Promise.allSettled(promises);

      this.stats.processed_documents += batch.length;

      // Pequeña pausa entre lotes para no sobrecargar la base de datos
      if (i + batchSize < documents.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  /**
   * Ejecutar migración completa
   */
  public async run(): Promise<MigrationStats> {
    const startTime = Date.now();

    try {
      console.log('🚀 Iniciando migración de datos históricos...');
      console.log(`📋 Configuración:`, {
        limit: this.options.limit,
        dryRun: this.options.dryRun,
        batchSize: this.options.batchSize,
        verbose: this.options.verbose
      });

      // Obtener documentos a migrar
      console.log('\n📡 Obteniendo documentos a migrar...');
      const documents = await this.getDocumentsToMigrate();
      this.stats.total_documents = documents.length;

      if (documents.length === 0) {
        console.log('✅ No hay documentos que requieran migración');
        return this.stats;
      }

      console.log(`📊 Encontrados ${documents.length} documentos para migrar`);

      if (this.options.dryRun) {
        console.log('🔍 Modo DRY-RUN activado - no se realizarán cambios');
        console.log('📋 Documentos que serían procesados:');
        documents.forEach((doc, index) => {
          console.log(`  ${index + 1}. ${doc.job_id} - ${doc.document_type} - ${doc.emitter_name || 'Sin emisor'}`);
        });
        return this.stats;
      }

      // Procesar documentos
      console.log('\n⚙️ Iniciando procesamiento...');
      await this.processBatch(documents);

      this.stats.processing_time_ms = Date.now() - startTime;

      // Mostrar estadísticas finales
      console.log('\n📊 Migración completada:');
      console.log(`  📄 Total documentos: ${this.stats.total_documents}`);
      console.log(`  ✅ Procesados: ${this.stats.processed_documents}`);
      console.log(`  🔗 Vínculos exitosos: ${this.stats.successful_links}`);
      console.log(`  ❌ Vínculos fallidos: ${this.stats.failed_links}`);
      console.log(`  🏢 Nuevos proveedores: ${this.stats.new_suppliers}`);
      console.log(`  👥 Nuevos clientes: ${this.stats.new_customers}`);
      console.log(`  ⏱️ Tiempo total: ${this.stats.processing_time_ms}ms`);

      if (this.stats.errors.length > 0) {
        console.log(`\n⚠️ Errores encontrados (${this.stats.errors.length}):`);
        this.stats.errors.slice(0, 5).forEach(error => {
          console.log(`  - ${error}`);
        });
        if (this.stats.errors.length > 5) {
          console.log(`  ... y ${this.stats.errors.length - 5} errores más`);
        }
      }

      return this.stats;

    } catch (error) {
      console.error('💥 Error crítico en la migración:', error);
      this.stats.processing_time_ms = Date.now() - startTime;
      throw error;
    }
  }

  /**
   * Obtener estadísticas de calidad post-migración
   */
  public async getQualityStats(): Promise<any> {
    try {
      const { data } = await pgClient.query(`
        SELECT * FROM get_matching_quality_stats()
      `);

      const stats: any = {};
      data?.forEach((row: any) => {
        stats[row.metric_name] = {
          value: row.metric_value,
          description: row.description
        };
      });

      return stats;
    } catch (error) {
      console.warn('⚠️ No se pudieron obtener estadísticas de calidad:', error);
      return {};
    }
  }
}

// Función principal para ejecutar desde línea de comandos
async function main() {
  try {
    // Parsear argumentos
    const args = process.argv.slice(2);
    const options: MigrationOptions = {};

    for (let i = 0; i < args.length; i++) {
      switch (args[i]) {
        case '--limit':
          options.limit = parseInt(args[++i]) || 100;
          break;
        case '--dry-run':
          options.dryRun = true;
          break;
        case '--batch-size':
          options.batchSize = parseInt(args[++i]) || 10;
          break;
        case '--verbose':
          options.verbose = true;
          break;
        case '--help':
          console.log(`
Migración de datos históricos - Entity Matching System

Uso: npx ts-node scripts/migrate-historical-invoices.ts [opciones]

Opciones:
  --limit <n>        Máximo número de documentos a procesar (default: 100)
  --dry-run          Solo mostrar qué se procesaría, sin hacer cambios
  --batch-size <n>   Tamaño del lote para procesamiento (default: 10)
  --verbose          Mostrar detalles de cada documento procesado
  --help             Mostrar esta ayuda

Ejemplos:
  npx ts-node scripts/migrate-historical-invoices.ts
  npx ts-node scripts/migrate-historical-invoices.ts --limit 50 --verbose
  npx ts-node scripts/migrate-historical-invoices.ts --dry-run
          `);
          process.exit(0);
          break;
      }
    }

    // Crear migrador y ejecutar
    const migrator = new HistoricalInvoiceMigrator(options);
    const stats = await migrator.run();

    // Obtener estadísticas de calidad si no es dry-run
    if (!options.dryRun && stats.processed_documents > 0) {
      console.log('\n📈 Estadísticas de calidad del matching:');
      const qualityStats = await migrator.getQualityStats();
      Object.entries(qualityStats).forEach(([key, stat]: [string, any]) => {
        console.log(`  ${stat.description}: ${stat.value}${key.includes('rate') ? '%' : ''}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('💥 Error ejecutando migración:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

export { HistoricalInvoiceMigrator };
export type { MigrationOptions, MigrationStats };