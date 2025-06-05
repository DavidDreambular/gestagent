// Script para vincular documentos existentes con proveedores y clientes
// Este script analiza los documentos y los vincula con proveedores/clientes basándose en emisor/receptor

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface DocumentForLinking {
  job_id: string;
  emitter_name: string;
  receiver_name: string;
  processed_json: any;
  supplier_id: string | null;
  customer_id: string | null;
}

class DocumentLinker {
  /**
   * Ejecuta el proceso de vinculación de documentos
   */
  async linkDocuments() {
    console.log('🔗 [DocumentLinker] Iniciando vinculación de documentos...');

    try {
      // 1. Obtener documentos sin vincular
      const documents = await this.getUnlinkedDocuments();
      console.log(`📋 [DocumentLinker] Encontrados ${documents.length} documentos para vincular`);

      let linkedCount = 0;
      let errorCount = 0;

      // 2. Procesar cada documento
      for (const doc of documents) {
        try {
          const result = await this.linkDocument(doc);
          if (result.linked) {
            linkedCount++;
            console.log(`✅ [DocumentLinker] Documento ${doc.job_id} vinculado exitosamente`);
          } else {
            console.log(`⚠️ [DocumentLinker] Documento ${doc.job_id} no pudo ser vinculado: ${result.reason}`);
          }
        } catch (error) {
          errorCount++;
          console.error(`❌ [DocumentLinker] Error vinculando documento ${doc.job_id}:`, error);
        }
      }

      console.log(`🎉 [DocumentLinker] Proceso completado: ${linkedCount} vinculados, ${errorCount} errores`);
      return { linkedCount, errorCount, total: documents.length };

    } catch (error) {
      console.error('❌ [DocumentLinker] Error en el proceso:', error);
      throw error;
    }
  }

  /**
   * Obtiene documentos que no están vinculados
   */
  private async getUnlinkedDocuments(): Promise<DocumentForLinking[]> {
    const { data, error } = await supabase
      .from('documents')
      .select('job_id, emitter_name, receiver_name, processed_json, supplier_id, customer_id')
      .or('supplier_id.is.null,customer_id.is.null');

    if (error) {
      throw new Error(`Error obteniendo documentos: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Vincula un documento específico
   */
  private async linkDocument(doc: DocumentForLinking): Promise<{ linked: boolean; reason?: string }> {
    let supplier_id = doc.supplier_id;
    let customer_id = doc.customer_id;
    let hasChanges = false;

    // Intentar vincular proveedor si no está vinculado
    if (!supplier_id && doc.emitter_name) {
      const foundSupplier = await this.findSupplierByName(doc.emitter_name);
      if (foundSupplier) {
        supplier_id = foundSupplier.supplier_id;
        hasChanges = true;
        console.log(`🔍 [DocumentLinker] Proveedor encontrado: ${foundSupplier.name} para ${doc.emitter_name}`);
      }
    }

    // Intentar vincular cliente si no está vinculado
    if (!customer_id && doc.receiver_name) {
      const foundCustomer = await this.findCustomerByName(doc.receiver_name);
      if (foundCustomer) {
        customer_id = foundCustomer.customer_id;
        hasChanges = true;
        console.log(`🔍 [DocumentLinker] Cliente encontrado: ${foundCustomer.name} para ${doc.receiver_name}`);
      }
    }

    // Extraer datos adicionales del JSON procesado
    const additionalData = this.extractAdditionalData(doc.processed_json);

    // Actualizar documento si hay cambios
    if (hasChanges || additionalData.hasData) {
      const updateData: any = {};
      
      if (supplier_id) updateData.supplier_id = supplier_id;
      if (customer_id) updateData.customer_id = customer_id;
      if (additionalData.total_amount) updateData.total_amount = additionalData.total_amount;
      if (additionalData.tax_amount) updateData.tax_amount = additionalData.tax_amount;
      if (additionalData.document_date) updateData.document_date = additionalData.document_date;

      const { error } = await supabase
        .from('documents')
        .update(updateData)
        .eq('job_id', doc.job_id);

      if (error) {
        throw new Error(`Error actualizando documento: ${error.message}`);
      }

      return { linked: true };
    }

    return { 
      linked: false, 
      reason: `No se encontraron coincidencias para emisor: "${doc.emitter_name}" o receptor: "${doc.receiver_name}"` 
    };
  }

  /**
   * Busca proveedor por nombre con algoritmo de similitud
   */
  private async findSupplierByName(name: string): Promise<any> {
    if (!name || name.trim() === '') return null;

    const { data, error } = await supabase
      .from('suppliers')
      .select('supplier_id, name, nif_cif')
      .limit(100);

    if (error || !data) return null;

    // Buscar coincidencia exacta primero
    const exactMatch = data.find(supplier => 
      this.cleanName(supplier.name) === this.cleanName(name)
    );

    if (exactMatch) return exactMatch;

    // Buscar por similitud
    let bestMatch = null;
    let bestSimilarity = 0.8; // Umbral mínimo de similitud

    for (const supplier of data) {
      const similarity = this.calculateSimilarity(name, supplier.name);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = supplier;
      }
    }

    return bestMatch;
  }

  /**
   * Busca cliente por nombre con algoritmo de similitud
   */
  private async findCustomerByName(name: string): Promise<any> {
    if (!name || name.trim() === '') return null;

    const { data, error } = await supabase
      .from('customers')
      .select('customer_id, name, nif_cif')
      .limit(100);

    if (error || !data) return null;

    // Buscar coincidencia exacta primero
    const exactMatch = data.find(customer => 
      this.cleanName(customer.name) === this.cleanName(name)
    );

    if (exactMatch) return exactMatch;

    // Buscar por similitud
    let bestMatch = null;
    let bestSimilarity = 0.8; // Umbral mínimo de similitud

    for (const customer of data) {
      const similarity = this.calculateSimilarity(name, customer.name);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = customer;
      }
    }

    return bestMatch;
  }

  /**
   * Extrae datos adicionales del JSON procesado
   */
  private extractAdditionalData(processedJson: any): {
    total_amount?: number;
    tax_amount?: number;
    document_date?: string;
    hasData: boolean;
  } {
    if (!processedJson) return { hasData: false };

    const result: any = { hasData: false };

    // Extraer importe total
    if (processedJson.totals?.total_amount || processedJson.total_amount) {
      result.total_amount = parseFloat(processedJson.totals?.total_amount || processedJson.total_amount);
      result.hasData = true;
    }

    // Extraer importe de impuestos
    if (processedJson.totals?.tax_amount || processedJson.tax_amount) {
      result.tax_amount = parseFloat(processedJson.totals?.tax_amount || processedJson.tax_amount);
      result.hasData = true;
    }

    // Extraer fecha del documento
    if (processedJson.invoice_date || processedJson.document_date) {
      result.document_date = processedJson.invoice_date || processedJson.document_date;
      result.hasData = true;
    }

    return result;
  }

  /**
   * Limpia nombre para comparación
   */
  private cleanName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[.,;:\-\(\)]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Calcula similitud entre dos strings
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const clean1 = this.cleanName(str1);
    const clean2 = this.cleanName(str2);

    if (clean1 === clean2) return 1.0;

    // Verificar si uno contiene al otro
    if (clean1.includes(clean2) || clean2.includes(clean1)) {
      return 0.85;
    }

    // Distancia de Levenshtein
    const longer = clean1.length > clean2.length ? clean1 : clean2;
    const shorter = clean1.length > clean2.length ? clean2 : clean1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calcula distancia de Levenshtein
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
}

// Función para ejecutar el script
export async function linkDocuments() {
  const linker = new DocumentLinker();
  return await linker.linkDocuments();
}

// Si se ejecuta directamente
if (require.main === module) {
  linkDocuments()
    .then((result) => {
      console.log('🎉 Proceso completado:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
} 