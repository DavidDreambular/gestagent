import crypto from 'crypto';
import { postgresqlClient } from '@/lib/postgresql-client';

// Interfaces para detección de duplicados
export interface DocumentHash {
  exact_hash: string;
  fuzzy_hash: string;
  content_hash: string;
  metadata: DocumentHashMetadata;
}

export interface DocumentHashMetadata {
  provider_name?: string;
  provider_tax_id?: string;
  document_number?: string;
  document_date?: string;
  total_amount?: number;
  document_type?: string;
}

export interface DuplicateCheckResult {
  is_duplicate: boolean;
  exact_matches: DuplicateMatch[];
  fuzzy_matches: DuplicateMatch[];
  confidence_score: number;
  recommendations: string[];
}

export interface DuplicateMatch {
  job_id: string;
  document_type: string;
  provider_name?: string;
  document_date?: string;
  similarity_score: number;
  match_type: 'exact' | 'fuzzy' | 'content';
  matched_fields: string[];
  upload_timestamp: string;
}

export interface BulkDuplicateAnalysis {
  total_documents: number;
  duplicates_found: number;
  duplicate_groups: DuplicateGroup[];
  processing_time_ms: number;
}

export interface DuplicateGroup {
  primary_document: string; // job_id
  duplicates: string[];     // job_ids
  similarity_scores: number[];
  group_confidence: number;
}

/**
 * Servicio completo para detección de documentos duplicados
 * Utiliza múltiples algoritmos de hash y similitud
 */
export class DocumentDuplicateDetector {

  /**
   * Genera hashes para un documento
   */
  generateDocumentHash(documentData: any): DocumentHash {
    const metadata = this.extractMetadata(documentData);
    
    return {
      exact_hash: this.generateExactHash(metadata),
      fuzzy_hash: this.generateFuzzyHash(metadata),
      content_hash: this.generateContentHash(documentData),
      metadata
    };
  }

  /**
   * Verifica si un documento es duplicado
   */
  async checkForDuplicates(
    documentData: any, 
    includeContent = true
  ): Promise<DuplicateCheckResult> {
    try {
      const documentHash = this.generateDocumentHash(documentData);
      
      // Búsqueda de matches exactos
      const exactMatches = await this.findExactMatches(documentHash.exact_hash);
      
      // Búsqueda de matches fuzzy solo si no hay exactos
      const fuzzyMatches = exactMatches.length === 0 
        ? await this.findFuzzyMatches(documentHash)
        : [];
      
      // Análisis de contenido si está habilitado
      const contentMatches = includeContent && exactMatches.length === 0 && fuzzyMatches.length === 0
        ? await this.findContentMatches(documentHash.content_hash)
        : [];

      const allMatches = [...exactMatches, ...fuzzyMatches, ...contentMatches];
      const confidence = this.calculateConfidenceScore(exactMatches, fuzzyMatches, contentMatches);
      
      return {
        is_duplicate: allMatches.length > 0,
        exact_matches: exactMatches,
        fuzzy_matches: [...fuzzyMatches, ...contentMatches],
        confidence_score: confidence,
        recommendations: this.generateRecommendations(exactMatches, fuzzyMatches, contentMatches)
      };

    } catch (error) {
      console.error('❌ [Duplicates] Error verificando duplicados:', error);
      return {
        is_duplicate: false,
        exact_matches: [],
        fuzzy_matches: [],
        confidence_score: 0,
        recommendations: ['Error al verificar duplicados']
      };
    }
  }

  /**
   * Almacena hash de documento en la base de datos
   */
  async storeDocumentHash(jobId: string, documentHash: DocumentHash): Promise<boolean> {
    try {
      await postgresqlClient.query(
        `INSERT INTO document_hashes 
         (job_id, exact_hash, fuzzy_hash, content_hash, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (job_id) DO UPDATE SET
         exact_hash = EXCLUDED.exact_hash,
         fuzzy_hash = EXCLUDED.fuzzy_hash,
         content_hash = EXCLUDED.content_hash,
         metadata = EXCLUDED.metadata,
         updated_at = NOW()`,
        [
          jobId,
          documentHash.exact_hash,
          documentHash.fuzzy_hash,
          documentHash.content_hash,
          JSON.stringify(documentHash.metadata),
          new Date().toISOString()
        ]
      );
      
      return true;
    } catch (error) {
      console.error('❌ [Duplicates] Error almacenando hash:', error);
      return false;
    }
  }

  /**
   * Análisis masivo de duplicados en la base de datos
   */
  async analyzeBulkDuplicates(
    limit?: number,
    documentType?: string
  ): Promise<BulkDuplicateAnalysis> {
    const startTime = Date.now();
    
    try {
      // Obtener documentos para análisis
      let query = `
        SELECT d.job_id, d.document_type, d.processed_json, d.upload_timestamp,
               dh.exact_hash, dh.fuzzy_hash, dh.content_hash
        FROM documents d
        LEFT JOIN document_hashes dh ON d.job_id = dh.job_id
        WHERE d.status = 'completed'
      `;
      const params: any[] = [];
      
      if (documentType) {
        query += ` AND d.document_type = $${params.length + 1}`;
        params.push(documentType);
      }
      
      if (limit) {
        query += ` LIMIT $${params.length + 1}`;
        params.push(limit);
      }

      const result = await postgresqlClient.query(query, params);
      const documents = result.data || [];

      // Agrupar por hashes
      const duplicateGroups = this.groupDocumentsByHash(documents);
      
      const analysis: BulkDuplicateAnalysis = {
        total_documents: documents.length,
        duplicates_found: duplicateGroups.reduce((sum, group) => sum + group.duplicates.length, 0),
        duplicate_groups: duplicateGroups,
        processing_time_ms: Date.now() - startTime
      };

      console.log(`✅ [Duplicates] Análisis masivo completado: ${analysis.duplicates_found}/${analysis.total_documents} duplicados encontrados`);
      return analysis;

    } catch (error) {
      console.error('❌ [Duplicates] Error en análisis masivo:', error);
      return {
        total_documents: 0,
        duplicates_found: 0,
        duplicate_groups: [],
        processing_time_ms: Date.now() - startTime
      };
    }
  }

  // Métodos privados

  private extractMetadata(documentData: any): DocumentHashMetadata {
    // Extraer metadata normalizada del documento
    const processed = documentData.processed_json || documentData;
    
    return {
      provider_name: this.normalizeString(processed.supplier?.name || processed.emitter?.name || ''),
      provider_tax_id: this.normalizeString(processed.supplier?.tax_id || processed.emitter?.tax_id || ''),
      document_number: this.normalizeString(processed.invoice_number || processed.document_number || ''),
      document_date: this.normalizeDate(processed.invoice_date || processed.document_date || ''),
      total_amount: this.normalizeAmount(processed.total_amount || processed.total || 0),
      document_type: processed.document_type || 'unknown'
    };
  }

  private generateExactHash(metadata: DocumentHashMetadata): string {
    // Hash exacto: todos los campos deben coincidir exactamente
    const exactString = [
      metadata.provider_tax_id,
      metadata.document_number,
      metadata.document_date,
      metadata.total_amount?.toFixed(2)
    ].filter(Boolean).join('|');
    
    return crypto.createHash('sha256').update(exactString).digest('hex');
  }

  private generateFuzzyHash(metadata: DocumentHashMetadata): string {
    // Hash fuzzy: permite pequeñas variaciones
    const fuzzyString = [
      metadata.provider_name?.substring(0, 10), // Solo primeros 10 caracteres
      metadata.provider_tax_id,
      metadata.document_date,
      Math.round((metadata.total_amount || 0) * 100) // Redondear centavos
    ].filter(Boolean).join('|');
    
    return crypto.createHash('md5').update(fuzzyString).digest('hex');
  }

  private generateContentHash(documentData: any): string {
    // Hash de contenido: basado en estructura del JSON
    const contentKeys = Object.keys(documentData.processed_json || documentData)
      .sort()
      .slice(0, 20); // Primeros 20 campos más importantes
    
    const contentString = contentKeys.join(',');
    return crypto.createHash('sha1').update(contentString).digest('hex');
  }

  private async findExactMatches(exactHash: string): Promise<DuplicateMatch[]> {
    try {
      const result = await postgresqlClient.query(
        `SELECT d.job_id, d.document_type, d.processed_json, d.upload_timestamp
         FROM documents d
         JOIN document_hashes dh ON d.job_id = dh.job_id
         WHERE dh.exact_hash = $1
         ORDER BY d.upload_timestamp DESC`,
        [exactHash]
      );

      return (result.data || []).map(doc => ({
        job_id: doc.job_id,
        document_type: doc.document_type,
        provider_name: doc.processed_json?.supplier?.name,
        document_date: doc.processed_json?.invoice_date,
        similarity_score: 1.0,
        match_type: 'exact' as const,
        matched_fields: ['provider_tax_id', 'document_number', 'document_date', 'total_amount'],
        upload_timestamp: doc.upload_timestamp
      }));
    } catch (error) {
      console.error('❌ [Duplicates] Error buscando matches exactos:', error);
      return [];
    }
  }

  private async findFuzzyMatches(documentHash: DocumentHash): Promise<DuplicateMatch[]> {
    try {
      const { metadata } = documentHash;
      
      // Búsqueda por fuzzy hash
      const fuzzyResult = await postgresqlClient.query(
        `SELECT d.job_id, d.document_type, d.processed_json, d.upload_timestamp,
                dh.metadata
         FROM documents d
         JOIN document_hashes dh ON d.job_id = dh.job_id
         WHERE dh.fuzzy_hash = $1
         ORDER BY d.upload_timestamp DESC
         LIMIT 10`,
        [documentHash.fuzzy_hash]
      );

      // Búsqueda adicional por campos similares
      const fieldResult = await postgresqlClient.query(
        `SELECT d.job_id, d.document_type, d.processed_json, d.upload_timestamp
         FROM documents d
         WHERE d.processed_json->>'total_amount' = $1
         AND d.processed_json->'supplier'->>'tax_id' = $2
         AND ABS(EXTRACT(DAY FROM (d.processed_json->>'invoice_date')::date - $3::date)) <= 7
         ORDER BY d.upload_timestamp DESC
         LIMIT 5`,
        [
          metadata.total_amount?.toString(),
          metadata.provider_tax_id,
          metadata.document_date
        ]
      );

      const allMatches = [...(fuzzyResult.data || []), ...(fieldResult.data || [])];
      
      return allMatches.map(doc => {
        const similarity = this.calculateFieldSimilarity(metadata, doc.processed_json);
        const matchedFields = this.getMatchedFields(metadata, doc.processed_json);
        
        return {
          job_id: doc.job_id,
          document_type: doc.document_type,
          provider_name: doc.processed_json?.supplier?.name,
          document_date: doc.processed_json?.invoice_date,
          similarity_score: similarity,
          match_type: 'fuzzy' as const,
          matched_fields: matchedFields,
          upload_timestamp: doc.upload_timestamp
        };
      }).filter(match => match.similarity_score > 0.7);

    } catch (error) {
      console.error('❌ [Duplicates] Error buscando matches fuzzy:', error);
      return [];
    }
  }

  private async findContentMatches(contentHash: string): Promise<DuplicateMatch[]> {
    try {
      const result = await postgresqlClient.query(
        `SELECT d.job_id, d.document_type, d.processed_json, d.upload_timestamp
         FROM documents d
         JOIN document_hashes dh ON d.job_id = dh.job_id
         WHERE dh.content_hash = $1
         ORDER BY d.upload_timestamp DESC
         LIMIT 5`,
        [contentHash]
      );

      return (result.data || []).map(doc => ({
        job_id: doc.job_id,
        document_type: doc.document_type,
        provider_name: doc.processed_json?.supplier?.name,
        document_date: doc.processed_json?.invoice_date,
        similarity_score: 0.8,
        match_type: 'content' as const,
        matched_fields: ['document_structure'],
        upload_timestamp: doc.upload_timestamp
      }));
    } catch (error) {
      console.error('❌ [Duplicates] Error buscando matches de contenido:', error);
      return [];
    }
  }

  private calculateConfidenceScore(
    exactMatches: DuplicateMatch[],
    fuzzyMatches: DuplicateMatch[],
    contentMatches: DuplicateMatch[]
  ): number {
    if (exactMatches.length > 0) return 1.0;
    if (fuzzyMatches.length > 0) {
      const avgSimilarity = fuzzyMatches.reduce((sum, match) => sum + match.similarity_score, 0) / fuzzyMatches.length;
      return avgSimilarity * 0.9;
    }
    if (contentMatches.length > 0) return 0.5;
    return 0;
  }

  private generateRecommendations(
    exactMatches: DuplicateMatch[],
    fuzzyMatches: DuplicateMatch[],
    contentMatches: DuplicateMatch[]
  ): string[] {
    const recommendations: string[] = [];
    
    if (exactMatches.length > 0) {
      recommendations.push('⚠️ Documento duplicado exacto detectado. Revisar antes de procesar.');
      recommendations.push('Opciones: Omitir, Reemplazar o Mantener como versión.');
    } else if (fuzzyMatches.length > 0) {
      recommendations.push('🔍 Posible duplicado detectado con alta similitud.');
      recommendations.push('Revisar manualmente para confirmar duplicación.');
    } else if (contentMatches.length > 0) {
      recommendations.push('📄 Documento con estructura similar encontrado.');
      recommendations.push('Verificar si corresponde al mismo documento.');
    } else {
      recommendations.push('✅ No se detectaron duplicados. Proceder con normalidad.');
    }
    
    return recommendations;
  }

  private groupDocumentsByHash(documents: any[]): DuplicateGroup[] {
    const hashGroups: Map<string, any[]> = new Map();
    
    // Agrupar por exact_hash
    documents.forEach(doc => {
      if (doc.exact_hash) {
        const existing = hashGroups.get(doc.exact_hash) || [];
        existing.push(doc);
        hashGroups.set(doc.exact_hash, existing);
      }
    });

    // Convertir a DuplicateGroup solo grupos con más de 1 documento
    return Array.from(hashGroups.entries())
      .filter(([_, docs]) => docs.length > 1)
      .map(([hash, docs]) => {
        const sorted = docs.sort((a, b) => new Date(a.upload_timestamp).getTime() - new Date(b.upload_timestamp).getTime());
        return {
          primary_document: sorted[0].job_id,
          duplicates: sorted.slice(1).map(doc => doc.job_id),
          similarity_scores: sorted.slice(1).map(() => 1.0),
          group_confidence: 1.0
        };
      });
  }

  // Utilidades de normalización
  private normalizeString(str: string): string {
    return str.toString()
      .trim()
      .toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, ' ');
  }

  private normalizeDate(dateStr: string): string {
    try {
      return new Date(dateStr).toISOString().split('T')[0];
    } catch {
      return dateStr;
    }
  }

  private normalizeAmount(amount: any): number {
    const num = parseFloat(String(amount).replace(/[^\d.-]/g, ''));
    return isNaN(num) ? 0 : Math.round(num * 100) / 100;
  }

  private calculateFieldSimilarity(metadata1: DocumentHashMetadata, data2: any): number {
    const extracted2 = this.extractMetadata({ processed_json: data2 });
    
    let matches = 0;
    let total = 0;

    // Comparar cada campo con peso
    const comparisons = [
      { field: 'provider_tax_id', weight: 0.3 },
      { field: 'document_number', weight: 0.25 },
      { field: 'total_amount', weight: 0.25 },
      { field: 'document_date', weight: 0.2 }
    ];

    comparisons.forEach(({ field, weight }) => {
      total += weight;
      const val1 = (metadata1 as any)[field];
      const val2 = (extracted2 as any)[field];
      
      if (val1 && val2) {
        if (field === 'total_amount') {
          const diff = Math.abs(val1 - val2);
          matches += diff < 0.01 ? weight : diff < 1 ? weight * 0.8 : 0;
        } else if (val1 === val2) {
          matches += weight;
        } else if (typeof val1 === 'string' && typeof val2 === 'string') {
          const similarity = this.stringSimilarity(val1, val2);
          matches += similarity > 0.8 ? weight * similarity : 0;
        }
      }
    });

    return total > 0 ? matches / total : 0;
  }

  private getMatchedFields(metadata1: DocumentHashMetadata, data2: any): string[] {
    const extracted2 = this.extractMetadata({ processed_json: data2 });
    const matched: string[] = [];

    if (metadata1.provider_tax_id === extracted2.provider_tax_id) matched.push('provider_tax_id');
    if (metadata1.document_number === extracted2.document_number) matched.push('document_number');
    if (metadata1.document_date === extracted2.document_date) matched.push('document_date');
    if (Math.abs((metadata1.total_amount || 0) - (extracted2.total_amount || 0)) < 0.01) matched.push('total_amount');

    return matched;
  }

  private stringSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    
    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;

    const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));
    
    for (let i = 0; i <= len1; matrix[0][i] = i, i++);
    for (let j = 0; j <= len2; matrix[j][0] = j, j++);
    
    for (let j = 1; j <= len2; j++) {
      for (let i = 1; i <= len1; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j - 1][i] + 1,
          matrix[j][i - 1] + 1,
          matrix[j - 1][i - 1] + cost
        );
      }
    }
    
    const distance = matrix[len2][len1];
    return 1 - distance / Math.max(len1, len2);
  }
}

// Exportar instancia singleton
export const documentDuplicateDetector = new DocumentDuplicateDetector();

// Funciones de conveniencia
export const generateHash = (documentData: any) => 
  documentDuplicateDetector.generateDocumentHash(documentData);

export const checkDuplicates = (documentData: any, includeContent = true) => 
  documentDuplicateDetector.checkForDuplicates(documentData, includeContent);

export const storeHash = (jobId: string, documentHash: DocumentHash) => 
  documentDuplicateDetector.storeDocumentHash(jobId, documentHash);

export const analyzeBulkDuplicates = (limit?: number, documentType?: string) => 
  documentDuplicateDetector.analyzeBulkDuplicates(limit, documentType); 