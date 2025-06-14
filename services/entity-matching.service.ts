/**
 * Entity Matching Service
 * Sistema inteligente para conectar automáticamente facturas procesadas 
 * con proveedores y clientes registrados en la base de datos
 * 
 * Features:
 * - Matching por NIF/CIF (100% precisión)
 * - Matching por nombre con fuzzy logic
 * - Auto-registro de nuevas entidades
 * - Sistema de confianza y auditoría
 */

import pgClient from '@/lib/postgresql-client';

// Tipos de datos
export interface InvoiceSupplier {
  name?: string;
  nif_cif?: string;
  nif?: string;
  commercial_name?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  email?: string;
  phone?: string;
}

export interface InvoiceCustomer {
  name?: string;
  nif_cif?: string;
  nif?: string;
  commercial_name?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  email?: string;
  phone?: string;
}

export interface MatchResult {
  matched: boolean;
  entity_id: string | null;
  confidence: number; // 0-100
  match_method: 'nif_exact' | 'name_fuzzy' | 'auto_created' | 'manual' | 'none';
  created_new: boolean;
  entity_data?: any;
  reasoning?: string;
}

export interface InvoiceData {
  invoice_number?: string;
  total_amount?: number;
  issue_date?: string;
  supplier?: InvoiceSupplier;
  customer?: InvoiceCustomer;
}

export class EntityMatchingService {
  
  /**
   * Normalizar NIF/CIF - remover espacios, guiones y convertir a mayúsculas
   */
  private normalizeNIF(nif: string | undefined | null): string | null {
    if (!nif) return null;
    return nif.toString().replace(/[\s-]/g, '').toUpperCase();
  }

  /**
   * Normalizar nombre - remover caracteres especiales y normalizar espacios
   */
  private normalizeName(name: string | undefined | null): string | null {
    if (!name) return null;
    return name
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/gi, '')
      .toUpperCase();
  }

  /**
   * Calcular similitud entre dos strings usando algoritmo de Levenshtein
   */
  private calculateSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    if (s1 === s2) return 100;
    
    const matrix = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
    
    for (let i = 0; i <= s1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= s2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= s2.length; j++) {
      for (let i = 1; i <= s1.length; i++) {
        const substitutionCost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // insertion
          matrix[j - 1][i] + 1, // deletion
          matrix[j - 1][i - 1] + substitutionCost // substitution
        );
      }
    }
    
    const maxLength = Math.max(s1.length, s2.length);
    const similarity = ((maxLength - matrix[s2.length][s1.length]) / maxLength) * 100;
    return Math.round(similarity);
  }

  /**
   * Buscar proveedor por NIF/CIF exacto
   */
  private async findSupplierByNIF(nif: string): Promise<any | null> {
    try {
      const normalizedNIF = this.normalizeNIF(nif);
      if (!normalizedNIF) return null;

      const { data, error } = await pgClient.query(
        'SELECT * FROM suppliers WHERE UPPER(REPLACE(REPLACE(nif_cif, \' \', \'\'), \'-\', \'\')) = $1 LIMIT 1',
        [normalizedNIF]
      );

      if (error) {
        console.error('❌ [EntityMatching] Error buscando proveedor por NIF:', error);
        return null;
      }

      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('❌ [EntityMatching] Error en findSupplierByNIF:', error);
      return null;
    }
  }

  /**
   * Buscar cliente por NIF/CIF exacto
   */
  private async findCustomerByNIF(nif: string): Promise<any | null> {
    try {
      const normalizedNIF = this.normalizeNIF(nif);
      if (!normalizedNIF) return null;

      const { data, error } = await pgClient.query(
        'SELECT * FROM customers WHERE UPPER(REPLACE(REPLACE(nif_cif, \' \', \'\'), \'-\', \'\')) = $1 LIMIT 1',
        [normalizedNIF]
      );

      if (error) {
        console.error('❌ [EntityMatching] Error buscando cliente por NIF:', error);
        return null;
      }

      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('❌ [EntityMatching] Error en findCustomerByNIF:', error);
      return null;
    }
  }

  /**
   * Buscar proveedor por nombre con fuzzy matching
   */
  private async findSupplierByName(name: string): Promise<{ entity: any; similarity: number } | null> {
    try {
      const normalizedName = this.normalizeName(name);
      if (!normalizedName) return null;

      const { data, error } = await pgClient.query(
        'SELECT * FROM suppliers WHERE status = $1 ORDER BY created_at DESC LIMIT 50',
        ['active']
      );

      if (error || !data) {
        console.error('❌ [EntityMatching] Error buscando proveedores por nombre:', error);
        return null;
      }

      let bestMatch = null;
      let bestSimilarity = 0;

      for (const supplier of data) {
        // Comparar con nombre principal
        const nameSimilarity = this.calculateSimilarity(normalizedName, this.normalizeName(supplier.name) || '');
        
        // Comparar con nombre comercial si existe
        const commercialSimilarity = supplier.commercial_name 
          ? this.calculateSimilarity(normalizedName, this.normalizeName(supplier.commercial_name) || '')
          : 0;

        const maxSimilarity = Math.max(nameSimilarity, commercialSimilarity);

        if (maxSimilarity > bestSimilarity && maxSimilarity >= 85) { // Umbral mínimo 85%
          bestSimilarity = maxSimilarity;
          bestMatch = supplier;
        }
      }

      return bestMatch ? { entity: bestMatch, similarity: bestSimilarity } : null;
    } catch (error) {
      console.error('❌ [EntityMatching] Error en findSupplierByName:', error);
      return null;
    }
  }

  /**
   * Buscar cliente por nombre con fuzzy matching
   */
  private async findCustomerByName(name: string): Promise<{ entity: any; similarity: number } | null> {
    try {
      const normalizedName = this.normalizeName(name);
      if (!normalizedName) return null;

      const { data, error } = await pgClient.query(
        'SELECT * FROM customers WHERE status = $1 ORDER BY created_at DESC LIMIT 50',
        ['active']
      );

      if (error || !data) {
        console.error('❌ [EntityMatching] Error buscando clientes por nombre:', error);
        return null;
      }

      let bestMatch = null;
      let bestSimilarity = 0;

      for (const customer of data) {
        // Comparar con nombre principal
        const nameSimilarity = this.calculateSimilarity(normalizedName, this.normalizeName(customer.name) || '');
        
        // Comparar con nombre comercial si existe
        const commercialSimilarity = customer.commercial_name 
          ? this.calculateSimilarity(normalizedName, this.normalizeName(customer.commercial_name) || '')
          : 0;

        const maxSimilarity = Math.max(nameSimilarity, commercialSimilarity);

        if (maxSimilarity > bestSimilarity && maxSimilarity >= 85) { // Umbral mínimo 85%
          bestSimilarity = maxSimilarity;
          bestMatch = customer;
        }
      }

      return bestMatch ? { entity: bestMatch, similarity: bestSimilarity } : null;
    } catch (error) {
      console.error('❌ [EntityMatching] Error en findCustomerByName:', error);
      return null;
    }
  }

  /**
   * Crear nuevo proveedor automáticamente desde datos de factura
   */
  private async createSupplierFromInvoice(supplierData: InvoiceSupplier): Promise<any | null> {
    try {
      console.log('🔄 [EntityMatching] Creando nuevo proveedor automáticamente:', supplierData.name);

      const nifCif = this.normalizeNIF(supplierData.nif_cif || supplierData.nif);
      
      const { data, error } = await pgClient.query(
        `INSERT INTO suppliers (
          name, nif_cif, commercial_name, address, city, postal_code, 
          email, phone, status, notes, first_detected_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()) 
        RETURNING *`,
        [
          supplierData.name || 'Proveedor Auto-detectado',
          nifCif,
          supplierData.commercial_name,
          supplierData.address,
          supplierData.city,
          supplierData.postal_code,
          supplierData.email,
          supplierData.phone,
          'active',
          'Creado automáticamente desde factura procesada'
        ]
      );

      if (error) {
        console.error('❌ [EntityMatching] Error creando proveedor:', error);
        return null;
      }

      console.log('✅ [EntityMatching] Proveedor creado exitosamente:', data?.[0]?.supplier_id);
      return data?.[0] || null;
    } catch (error) {
      console.error('❌ [EntityMatching] Error en createSupplierFromInvoice:', error);
      return null;
    }
  }

  /**
   * Crear nuevo cliente automáticamente desde datos de factura
   */
  private async createCustomerFromInvoice(customerData: InvoiceCustomer): Promise<any | null> {
    try {
      console.log('🔄 [EntityMatching] Creando nuevo cliente automáticamente:', customerData.name);

      const nifCif = this.normalizeNIF(customerData.nif_cif || customerData.nif);
      
      const { data, error } = await pgClient.query(
        `INSERT INTO customers (
          name, nif_cif, commercial_name, address, city, postal_code, 
          email, phone, status, notes, first_detected_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()) 
        RETURNING *`,
        [
          customerData.name || 'Cliente Auto-detectado',
          nifCif,
          customerData.commercial_name,
          customerData.address,
          customerData.city,
          customerData.postal_code,
          customerData.email,
          customerData.phone,
          'active',
          'Creado automáticamente desde factura procesada'
        ]
      );

      if (error) {
        console.error('❌ [EntityMatching] Error creando cliente:', error);
        return null;
      }

      console.log('✅ [EntityMatching] Cliente creado exitosamente:', data?.[0]?.customer_id);
      return data?.[0] || null;
    } catch (error) {
      console.error('❌ [EntityMatching] Error en createCustomerFromInvoice:', error);
      return null;
    }
  }

  /**
   * Buscar y conectar proveedor con factura
   */
  public async matchSupplier(supplierData: InvoiceSupplier): Promise<MatchResult> {
    try {
      console.log('🔍 [EntityMatching] Buscando proveedor:', supplierData.name);

      // Nivel 1: Matching exacto por NIF/CIF
      const nif = supplierData.nif_cif || supplierData.nif;
      if (nif) {
        const supplierByNIF = await this.findSupplierByNIF(nif);
        if (supplierByNIF) {
          console.log('✅ [EntityMatching] Proveedor encontrado por NIF:', supplierByNIF.name);
          return {
            matched: true,
            entity_id: supplierByNIF.supplier_id,
            confidence: 100,
            match_method: 'nif_exact',
            created_new: false,
            entity_data: supplierByNIF,
            reasoning: `Matching exacto por NIF/CIF: ${nif}`
          };
        }
      }

      // Nivel 2: Matching por nombre con fuzzy logic
      if (supplierData.name) {
        const supplierByName = await this.findSupplierByName(supplierData.name);
        if (supplierByName && supplierByName.similarity >= 85) {
          console.log(`✅ [EntityMatching] Proveedor encontrado por nombre (${supplierByName.similarity}%):`, supplierByName.entity.name);
          return {
            matched: true,
            entity_id: supplierByName.entity.supplier_id,
            confidence: supplierByName.similarity,
            match_method: 'name_fuzzy',
            created_new: false,
            entity_data: supplierByName.entity,
            reasoning: `Matching por nombre con ${supplierByName.similarity}% similitud`
          };
        }
      }

      // Nivel 3: Auto-registro si tenemos datos suficientes
      if (supplierData.name && (supplierData.nif_cif || supplierData.nif)) {
        const newSupplier = await this.createSupplierFromInvoice(supplierData);
        if (newSupplier) {
          console.log('✅ [EntityMatching] Nuevo proveedor creado:', newSupplier.name);
          return {
            matched: true,
            entity_id: newSupplier.supplier_id,
            confidence: 90,
            match_method: 'auto_created',
            created_new: true,
            entity_data: newSupplier,
            reasoning: 'Proveedor creado automáticamente con datos de factura'
          };
        }
      }

      // No se pudo hacer matching
      console.log('⚠️ [EntityMatching] No se pudo hacer matching del proveedor:', supplierData.name);
      return {
        matched: false,
        entity_id: null,
        confidence: 0,
        match_method: 'none',
        created_new: false,
        reasoning: 'No se encontró match y datos insuficientes para auto-registro'
      };

    } catch (error) {
      console.error('❌ [EntityMatching] Error en matchSupplier:', error);
      return {
        matched: false,
        entity_id: null,
        confidence: 0,
        match_method: 'none',
        created_new: false,
        reasoning: `Error en matching: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  /**
   * Buscar y conectar cliente con factura
   */
  public async matchCustomer(customerData: InvoiceCustomer): Promise<MatchResult> {
    try {
      console.log('🔍 [EntityMatching] Buscando cliente:', customerData.name);

      // Nivel 1: Matching exacto por NIF/CIF
      const nif = customerData.nif_cif || customerData.nif;
      if (nif) {
        const customerByNIF = await this.findCustomerByNIF(nif);
        if (customerByNIF) {
          console.log('✅ [EntityMatching] Cliente encontrado por NIF:', customerByNIF.name);
          return {
            matched: true,
            entity_id: customerByNIF.customer_id,
            confidence: 100,
            match_method: 'nif_exact',
            created_new: false,
            entity_data: customerByNIF,
            reasoning: `Matching exacto por NIF/CIF: ${nif}`
          };
        }
      }

      // Nivel 2: Matching por nombre con fuzzy logic
      if (customerData.name) {
        const customerByName = await this.findCustomerByName(customerData.name);
        if (customerByName && customerByName.similarity >= 85) {
          console.log(`✅ [EntityMatching] Cliente encontrado por nombre (${customerByName.similarity}%):`, customerByName.entity.name);
          return {
            matched: true,
            entity_id: customerByName.entity.customer_id,
            confidence: customerByName.similarity,
            match_method: 'name_fuzzy',
            created_new: false,
            entity_data: customerByName.entity,
            reasoning: `Matching por nombre con ${customerByName.similarity}% similitud`
          };
        }
      }

      // Nivel 3: Auto-registro si tenemos datos suficientes
      if (customerData.name && (customerData.nif_cif || customerData.nif)) {
        const newCustomer = await this.createCustomerFromInvoice(customerData);
        if (newCustomer) {
          console.log('✅ [EntityMatching] Nuevo cliente creado:', newCustomer.name);
          return {
            matched: true,
            entity_id: newCustomer.customer_id,
            confidence: 90,
            match_method: 'auto_created',
            created_new: true,
            entity_data: newCustomer,
            reasoning: 'Cliente creado automáticamente con datos de factura'
          };
        }
      }

      // No se pudo hacer matching
      console.log('⚠️ [EntityMatching] No se pudo hacer matching del cliente:', customerData.name);
      return {
        matched: false,
        entity_id: null,
        confidence: 0,
        match_method: 'none',
        created_new: false,
        reasoning: 'No se encontró match y datos insuficientes para auto-registro'
      };

    } catch (error) {
      console.error('❌ [EntityMatching] Error en matchCustomer:', error);
      return {
        matched: false,
        entity_id: null,
        confidence: 0,
        match_method: 'none',
        created_new: false,
        reasoning: `Error en matching: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  /**
   * Procesar múltiples facturas de un documento
   */
  public async matchInvoiceEntities(invoices: InvoiceData[]): Promise<{
    suppliers: MatchResult[];
    customers: MatchResult[];
    summary: {
      total_invoices: number;
      suppliers_matched: number;
      customers_matched: number;
      new_suppliers: number;
      new_customers: number;
    }
  }> {
    const suppliers: MatchResult[] = [];
    const customers: MatchResult[] = [];

    for (const invoice of invoices) {
      // Procesar proveedor
      if (invoice.supplier) {
        const supplierMatch = await this.matchSupplier(invoice.supplier);
        suppliers.push(supplierMatch);
      }

      // Procesar cliente
      if (invoice.customer) {
        const customerMatch = await this.matchCustomer(invoice.customer);
        customers.push(customerMatch);
      }
    }

    const summary = {
      total_invoices: invoices.length,
      suppliers_matched: suppliers.filter(s => s.matched).length,
      customers_matched: customers.filter(c => c.matched).length,
      new_suppliers: suppliers.filter(s => s.created_new).length,
      new_customers: customers.filter(c => c.created_new).length
    };

    console.log('📊 [EntityMatching] Resumen del matching:', summary);

    return { suppliers, customers, summary };
  }
}

// Exportar instancia singleton
export const entityMatchingService = new EntityMatchingService();