/**
 * Servicio de Detección de Duplicados
 * 
 * Detecta documentos duplicados basándose en:
 * - Hash del archivo
 * - Similitud de contenido
 * - Metadata similar
 * - Nombres de archivo similares
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface DocumentMetadata {
  id: string;
  filename: string;
  size: number;
  uploadDate: string;
  uploadedBy: string;
  hash?: string;
  contentHash?: string;
  extractedText?: string;
}

export interface DuplicateMatch {
  document: DocumentMetadata;
  similarity: number;
  matchType: 'exact' | 'hash' | 'content' | 'filename' | 'metadata';
  confidence: number;
}

export interface DuplicateGroup {
  masterDocument: DocumentMetadata;
  duplicates: DuplicateMatch[];
  groupId: string;
  detectedAt: string;
  totalSimilarity: number;
}

export class DuplicateDetectionService {
  private static instance: DuplicateDetectionService;
  private duplicateGroups: Map<string, DuplicateGroup> = new Map();
  private documentHashes: Map<string, DocumentMetadata> = new Map();

  // Configuración de thresholds
  private readonly EXACT_MATCH_THRESHOLD = 100;
  private readonly HIGH_SIMILARITY_THRESHOLD = 95;
  private readonly MEDIUM_SIMILARITY_THRESHOLD = 80;
  private readonly LOW_SIMILARITY_THRESHOLD = 60;

  static getInstance(): DuplicateDetectionService {
    if (!DuplicateDetectionService.instance) {
      DuplicateDetectionService.instance = new DuplicateDetectionService();
    }
    return DuplicateDetectionService.instance;
  }

  /**
   * Detectar duplicados para un documento nuevo
   */
  async detectDuplicates(
    newDocument: DocumentMetadata,
    existingDocuments: DocumentMetadata[]
  ): Promise<DuplicateMatch[]> {
    console.log(`🔍 [Duplicate Detection] Analizando documento: ${newDocument.filename}`);

    const matches: DuplicateMatch[] = [];

    // Calcular hash del documento si no lo tiene
    if (!newDocument.hash && newDocument.id) {
      newDocument.hash = await this.calculateFileHash(newDocument.id);
    }

    for (const existingDoc of existingDocuments) {
      const match = await this.compareDocuments(newDocument, existingDoc);
      
      if (match && match.similarity >= this.LOW_SIMILARITY_THRESHOLD) {
        matches.push(match);
      }
    }

    // Ordenar por similitud descendente
    matches.sort((a, b) => b.similarity - a.similarity);

    if (matches.length > 0) {
      console.log(`🎯 [Duplicate Detection] Encontrados ${matches.length} posibles duplicados`);
      
      // Crear grupo de duplicados si hay matches significativos
      const significantMatches = matches.filter(m => m.similarity >= this.MEDIUM_SIMILARITY_THRESHOLD);
      if (significantMatches.length > 0) {
        await this.createDuplicateGroup(newDocument, significantMatches);
      }
    }

    return matches;
  }

  /**
   * Comparar dos documentos
   */
  private async compareDocuments(
    doc1: DocumentMetadata,
    doc2: DocumentMetadata
  ): Promise<DuplicateMatch | null> {
    let similarity = 0;
    let matchType: DuplicateMatch['matchType'] = 'metadata';
    let confidence = 0;

    // 1. Comparación exacta por hash
    if (doc1.hash && doc2.hash && doc1.hash === doc2.hash) {
      return {
        document: doc2,
        similarity: 100,
        matchType: 'exact',
        confidence: 100
      };
    }

    // 2. Comparación por tamaño y nombre
    const filenameScore = this.calculateFilenameSimilarity(doc1.filename, doc2.filename);
    const sizeScore = this.calculateSizeSimilarity(doc1.size, doc2.size);
    
    // 3. Comparación de contenido si está disponible
    let contentScore = 0;
    if (doc1.extractedText && doc2.extractedText) {
      contentScore = this.calculateContentSimilarity(doc1.extractedText, doc2.extractedText);
      matchType = 'content';
    }

    // 4. Comparación temporal (documentos subidos muy cerca en el tiempo)
    const timeScore = this.calculateTimeSimilarity(doc1.uploadDate, doc2.uploadDate);

    // 5. Comparación por usuario
    const userScore = doc1.uploadedBy === doc2.uploadedBy ? 20 : 0;

    // Calcular similitud ponderada
    if (contentScore > 0) {
      similarity = contentScore * 0.5 + filenameScore * 0.2 + sizeScore * 0.2 + timeScore * 0.1;
      matchType = 'content';
      confidence = contentScore;
    } else {
      similarity = filenameScore * 0.4 + sizeScore * 0.3 + timeScore * 0.2 + userScore * 0.1;
      matchType = filenameScore > sizeScore ? 'filename' : 'metadata';
      confidence = Math.max(filenameScore, sizeScore);
    }

    // Solo retornar si supera el threshold mínimo
    if (similarity >= this.LOW_SIMILARITY_THRESHOLD) {
      return {
        document: doc2,
        similarity: Math.round(similarity),
        matchType,
        confidence: Math.round(confidence)
      };
    }

    return null;
  }

  /**
   * Calcular similitud de nombres de archivo
   */
  private calculateFilenameSimilarity(filename1: string, filename2: string): number {
    const name1 = path.basename(filename1, path.extname(filename1)).toLowerCase();
    const name2 = path.basename(filename2, path.extname(filename2)).toLowerCase();

    // Similitud exacta
    if (name1 === name2) return 100;

    // Similitud de Levenshtein
    const distance = this.levenshteinDistance(name1, name2);
    const maxLength = Math.max(name1.length, name2.length);
    const similarity = ((maxLength - distance) / maxLength) * 100;

    // Bonus por patrones comunes
    let bonus = 0;
    
    // Números de factura similares
    const number1 = name1.match(/\d+/);
    const number2 = name2.match(/\d+/);
    if (number1 && number2 && number1[0] === number2[0]) {
      bonus += 20;
    }

    // Palabras clave comunes
    const keywords = ['factura', 'recibo', 'nomina', 'invoice', 'receipt'];
    for (const keyword of keywords) {
      if (name1.includes(keyword) && name2.includes(keyword)) {
        bonus += 10;
        break;
      }
    }

    return Math.min(similarity + bonus, 100);
  }

  /**
   * Calcular similitud de tamaño
   */
  private calculateSizeSimilarity(size1: number, size2: number): number {
    if (size1 === size2) return 100;

    const diff = Math.abs(size1 - size2);
    const avg = (size1 + size2) / 2;
    const percentDiff = (diff / avg) * 100;

    // Si la diferencia es menos del 1%, considerar muy similar
    if (percentDiff < 1) return 95;
    // Si la diferencia es menos del 5%, considerar similar
    if (percentDiff < 5) return 80;
    // Si la diferencia es menos del 10%, considerar algo similar
    if (percentDiff < 10) return 60;
    
    return Math.max(0, 100 - percentDiff);
  }

  /**
   * Calcular similitud de contenido
   */
  private calculateContentSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;

    // Normalizar textos
    const norm1 = this.normalizeText(text1);
    const norm2 = this.normalizeText(text2);

    if (norm1 === norm2) return 100;

    // Calcular similitud basada en n-gramas
    const ngrams1 = this.extractNGrams(norm1, 3);
    const ngrams2 = this.extractNGrams(norm2, 3);

    const intersection = new Set([...ngrams1].filter(x => ngrams2.has(x)));
    const union = new Set([...ngrams1, ...ngrams2]);

    const similarity = (intersection.size / union.size) * 100;
    return Math.round(similarity);
  }

  /**
   * Calcular similitud temporal
   */
  private calculateTimeSimilarity(date1: string, date2: string): number {
    const time1 = new Date(date1).getTime();
    const time2 = new Date(date2).getTime();
    
    const diffMs = Math.abs(time1 - time2);
    const diffMinutes = diffMs / (1000 * 60);

    // Documentos subidos en la misma hora
    if (diffMinutes < 60) return 80;
    // Documentos subidos el mismo día
    if (diffMinutes < 1440) return 60;
    // Documentos subidos en la misma semana
    if (diffMinutes < 10080) return 40;
    
    return 0;
  }

  /**
   * Crear grupo de duplicados
   */
  private async createDuplicateGroup(
    masterDocument: DocumentMetadata,
    duplicates: DuplicateMatch[]
  ): Promise<void> {
    const groupId = crypto.randomUUID();
    const totalSimilarity = duplicates.reduce((sum, dup) => sum + dup.similarity, 0) / duplicates.length;

    const group: DuplicateGroup = {
      masterDocument,
      duplicates,
      groupId,
      detectedAt: new Date().toISOString(),
      totalSimilarity: Math.round(totalSimilarity)
    };

    this.duplicateGroups.set(groupId, group);
    
    console.log(`📋 [Duplicate Detection] Grupo creado: ${groupId} con ${duplicates.length} duplicados`);
  }

  /**
   * Obtener todos los grupos de duplicados
   */
  getDuplicateGroups(): DuplicateGroup[] {
    return Array.from(this.duplicateGroups.values());
  }

  /**
   * Obtener grupo específico
   */
  getDuplicateGroup(groupId: string): DuplicateGroup | undefined {
    return this.duplicateGroups.get(groupId);
  }

  /**
   * Resolver grupo de duplicados
   */
  async resolveDuplicateGroup(
    groupId: string,
    action: 'merge' | 'delete' | 'ignore',
    resolvedBy: string
  ): Promise<boolean> {
    const group = this.duplicateGroups.get(groupId);
    
    if (!group) {
      console.error(`❌ [Duplicate Detection] Grupo no encontrado: ${groupId}`);
      return false;
    }

    console.log(`🔧 [Duplicate Detection] Resolviendo grupo ${groupId} con acción: ${action}`);

    switch (action) {
      case 'merge':
        // Implementar lógica de merge
        console.log(`🔀 [Duplicate Detection] Fusionando ${group.duplicates.length} documentos`);
        break;
      case 'delete':
        // Implementar lógica de eliminación
        console.log(`🗑️ [Duplicate Detection] Eliminando ${group.duplicates.length} duplicados`);
        break;
      case 'ignore':
        console.log(`👁️ [Duplicate Detection] Marcando grupo como no duplicado`);
        break;
    }

    // Remover grupo resuelto
    this.duplicateGroups.delete(groupId);
    return true;
  }

  /**
   * Calcular hash de archivo
   */
  private async calculateFileHash(filePath: string): Promise<string> {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    } catch (error) {
      console.error(`❌ [Duplicate Detection] Error calculando hash:`, error);
      return '';
    }
  }

  /**
   * Calcular distancia de Levenshtein
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Normalizar texto para comparación
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .trim();
  }

  /**
   * Extraer n-gramas de texto
   */
  private extractNGrams(text: string, n: number): Set<string> {
    const ngrams = new Set<string>();
    
    for (let i = 0; i <= text.length - n; i++) {
      ngrams.add(text.substr(i, n));
    }
    
    return ngrams;
  }

  /**
   * Limpiar grupos antiguos
   */
  cleanup(olderThanDays: number = 30): void {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    let cleaned = 0;

    for (const [groupId, group] of this.duplicateGroups) {
      const detectedDate = new Date(group.detectedAt);
      if (detectedDate < cutoffDate) {
        this.duplicateGroups.delete(groupId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 [Duplicate Detection] Limpiados ${cleaned} grupos antiguos`);
    }
  }

  /**
   * Buscar proveedor duplicado por NIF o nombre
   */
  async findDuplicateSupplier(nif: string | undefined, name: string): Promise<any | null> {
    console.log(`🔍 [Duplicate Detection] Buscando proveedor duplicado: NIF=${nif}, Nombre=${name}`);
    
    try {
      // Importar dinámicamente para evitar dependencias circulares
      const { dbAdapter } = await import('@/lib/db-adapter');
      
      if (nif) {
        // Buscar por NIF exacto primero
        const result = await dbAdapter.query(
          'SELECT * FROM suppliers WHERE nif_cif = $1 LIMIT 1',
          [nif]
        );
        
        if (result.rows && result.rows.length > 0) {
          console.log(`✅ [Duplicate Detection] Proveedor encontrado por NIF: ${nif}`);
          return result.rows[0];
        }
      }
      
      // Buscar por nombre similar
      const nameResult = await dbAdapter.query(
        `SELECT * FROM suppliers 
         WHERE LOWER(name) = LOWER($1) 
         OR LOWER(commercial_name) = LOWER($1) 
         LIMIT 1`,
        [name]
      );
      
      if (nameResult.rows && nameResult.rows.length > 0) {
        console.log(`✅ [Duplicate Detection] Proveedor encontrado por nombre: ${name}`);
        return nameResult.rows[0];
      }
      
      console.log(`❌ [Duplicate Detection] No se encontró proveedor duplicado`);
      return null;
    } catch (error) {
      console.error(`❌ [Duplicate Detection] Error buscando proveedor:`, error);
      return null;
    }
  }

  /**
   * Buscar cliente duplicado por NIF o nombre
   */
  async findDuplicateCustomer(nif: string | undefined, name: string): Promise<any | null> {
    console.log(`🔍 [Duplicate Detection] Buscando cliente duplicado: NIF=${nif}, Nombre=${name}`);
    
    try {
      // Importar dinámicamente para evitar dependencias circulares
      const { dbAdapter } = await import('@/lib/db-adapter');
      
      if (nif) {
        // Buscar por NIF exacto primero
        const result = await dbAdapter.query(
          'SELECT * FROM customers WHERE nif_cif = $1 LIMIT 1',
          [nif]
        );
        
        if (result.rows && result.rows.length > 0) {
          console.log(`✅ [Duplicate Detection] Cliente encontrado por NIF: ${nif}`);
          return result.rows[0];
        }
      }
      
      // Buscar por nombre similar
      const nameResult = await dbAdapter.query(
        `SELECT * FROM customers 
         WHERE LOWER(name) = LOWER($1) 
         OR LOWER(commercial_name) = LOWER($1) 
         LIMIT 1`,
        [name]
      );
      
      if (nameResult.rows && nameResult.rows.length > 0) {
        console.log(`✅ [Duplicate Detection] Cliente encontrado por nombre: ${name}`);
        return nameResult.rows[0];
      }
      
      console.log(`❌ [Duplicate Detection] No se encontró cliente duplicado`);
      return null;
    } catch (error) {
      console.error(`❌ [Duplicate Detection] Error buscando cliente:`, error);
      return null;
    }
  }
}

// Singleton export
export const duplicateDetectionService = DuplicateDetectionService.getInstance();