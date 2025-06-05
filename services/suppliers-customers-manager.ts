// Servicio para gestión automática de Proveedores y Clientes
// Extrae y gestiona relaciones comerciales desde facturas procesadas

import { createClient } from '@supabase/supabase-js';

// Configurar Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface SupplierData {
  name: string;
  nif_cif?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  province?: string;
  phone?: string;
  email?: string;
  commercial_name?: string;
}

interface CustomerData {
  name: string;
  nif_cif?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  province?: string;
  phone?: string;
  email?: string;
  customer_type?: 'company' | 'individual' | 'freelancer' | 'public';
}

interface InvoiceData {
  invoice_number: string;
  issue_date?: string;
  total_amount?: number;
  tax_amount?: number;
  supplier?: SupplierData;
  customer?: CustomerData;
}

export class SuppliersCustomersManager {
  
  /**
   * Procesa una factura y gestiona automáticamente proveedores y clientes
   */
  async processInvoiceRelations(
    invoiceData: InvoiceData | InvoiceData[], 
    documentJobId: string
  ): Promise<{
    supplier_id?: string;
    customer_id?: string;
    operations: string[];
  }> {
    const operations: string[] = [];
    let supplier_id: string | undefined;
    let customer_id: string | undefined;

    try {
      console.log('🏢 [SuppliersManager] Procesando relaciones comerciales...');

      // Si es un array de facturas, procesar TODAS las facturas
      if (Array.isArray(invoiceData)) {
        console.log(`📋 [SuppliersManager] ${invoiceData.length} facturas detectadas en el array`);
        
        // Usar un Set para evitar duplicados
        const suppliersProcessed = new Set<string>();
        const customersProcessed = new Set<string>();
        
        for (let i = 0; i < invoiceData.length; i++) {
          const invoice = invoiceData[i];
          console.log(`📋 [SuppliersManager] Procesando factura ${i + 1}/${invoiceData.length}: ${invoice.invoice_number || 'Sin número'}`);

          // Procesar proveedor si existe y no se ha procesado antes
          if (invoice.supplier && invoice.supplier.name) {
            const supplierKey = `${invoice.supplier.name}_${invoice.supplier.nif_cif || 'unknown'}`;
            if (!suppliersProcessed.has(supplierKey)) {
              const newSupplierId = await this.processSupplier(invoice.supplier, documentJobId);
              if (newSupplierId) {
                supplier_id = supplier_id || newSupplierId; // Usar el primero encontrado como referencia principal
                suppliersProcessed.add(supplierKey);
                operations.push(`Proveedor ${i + 1} procesado: ${invoice.supplier.name}`);
              }
            } else {
              operations.push(`Proveedor ${i + 1} ya existía: ${invoice.supplier.name}`);
            }
          }

          // Procesar cliente si existe y no se ha procesado antes
          if (invoice.customer && invoice.customer.name) {
            const customerKey = `${invoice.customer.name}_${invoice.customer.nif_cif || 'unknown'}`;
            if (!customersProcessed.has(customerKey)) {
              const newCustomerId = await this.processCustomer(invoice.customer, documentJobId);
              if (newCustomerId) {
                customer_id = customer_id || newCustomerId; // Usar el primero encontrado como referencia principal
                customersProcessed.add(customerKey);
                operations.push(`Cliente ${i + 1} procesado: ${invoice.customer.name}`);
              }
            } else {
              operations.push(`Cliente ${i + 1} ya existía: ${invoice.customer.name}`);
            }
          }
        }

        console.log(`✅ [SuppliersManager] Procesadas ${invoiceData.length} facturas: ${suppliersProcessed.size} proveedores únicos, ${customersProcessed.size} clientes únicos`);
      } else {
        // Si es una factura única
        const invoice = invoiceData;
        console.log(`📋 [SuppliersManager] Factura única: ${invoice.invoice_number || 'Sin número'}`);

        // Procesar proveedor si existe
        if (invoice.supplier && invoice.supplier.name) {
          supplier_id = await this.processSupplier(invoice.supplier, documentJobId);
          if (supplier_id) {
            operations.push(`Proveedor procesado: ${invoice.supplier.name}`);
          }
        }

        // Procesar cliente si existe
        if (invoice.customer && invoice.customer.name) {
          customer_id = await this.processCustomer(invoice.customer, documentJobId);
          if (customer_id) {
            operations.push(`Cliente procesado: ${invoice.customer.name}`);
          }
        }
      }

      console.log(`✅ [SuppliersManager] Relaciones procesadas: Proveedor=${supplier_id}, Cliente=${customer_id}`);

      return {
        supplier_id,
        customer_id,
        operations
      };

    } catch (error) {
      console.error('❌ [SuppliersManager] Error procesando relaciones:', error);
      return {
        supplier_id: undefined,
        customer_id: undefined,
        operations: [`Error: ${error}`]
      };
    }
  }

  /**
   * Procesa un proveedor con deduplicación inteligente
   */
  private async processSupplier(supplierData: SupplierData, documentJobId: string): Promise<string | undefined> {
    try {
      console.log(`🔍 [SuppliersManager] Buscando proveedor: ${supplierData.name}`);

      // PASO 1: Buscar por NIF/CIF (más confiable)
      let existingSupplier = null;
      if (supplierData.nif_cif) {
        const { data } = await supabase
          .from('suppliers')
          .select('*')
          .eq('nif_cif', supplierData.nif_cif)
          .single();
        
        existingSupplier = data;
        if (existingSupplier) {
          console.log(`✅ [SuppliersManager] Proveedor encontrado por NIF/CIF: ${supplierData.nif_cif}`);
        }
      }

      // PASO 2: Si no se encuentra por NIF, buscar por similaridad de nombre
      if (!existingSupplier) {
        existingSupplier = await this.findSimilarSupplier(supplierData.name);
        if (existingSupplier) {
          console.log(`✅ [SuppliersManager] Proveedor encontrado por similitud: ${existingSupplier.name}`);
        }
      }

      // PASO 3: Si existe, actualizar información si es necesario
      if (existingSupplier) {
        const updatedData = this.mergeSupplierData(existingSupplier, supplierData);
        
        if (this.hasSignificantChanges(existingSupplier, updatedData)) {
          const { data: updated, error } = await supabase
            .from('suppliers')
            .update({
              ...updatedData,
              last_updated_from_document: documentJobId,
              updated_at: new Date().toISOString()
            })
            .eq('supplier_id', existingSupplier.supplier_id)
            .select()
            .single();

          if (error) {
            console.error('❌ [SuppliersManager] Error actualizando proveedor:', error);
          } else {
            console.log(`🔄 [SuppliersManager] Proveedor actualizado: ${updated.name}`);
            
            // Registrar en audit log
            await this.logAuditAction('supplier', existingSupplier.supplier_id, 'updated', documentJobId, {
              changes: this.getChanges(existingSupplier, updatedData),
              source_document: documentJobId
            });
          }
        }

        return existingSupplier.supplier_id;
      }

      // PASO 4: Si no existe, crear nuevo proveedor
      const newSupplier = {
        name: supplierData.name,
        nif_cif: supplierData.nif_cif || null,
        commercial_name: supplierData.commercial_name || null,
        address: supplierData.address || null,
        postal_code: supplierData.postal_code || null,
        city: supplierData.city || null,
        province: supplierData.province || null,
        phone: supplierData.phone || null,
        email: supplierData.email || null,
        business_sector: this.guessBusinessSector(supplierData.name),
        first_detected_at: new Date().toISOString(),
        last_updated_from_document: documentJobId
      };

      const { data: created, error } = await supabase
        .from('suppliers')
        .insert(newSupplier)
        .select()
        .single();

      if (error) {
        console.error('❌ [SuppliersManager] Error creando proveedor:', error);
        return undefined;
      }

      console.log(`✨ [SuppliersManager] Nuevo proveedor creado: ${created.name} (${created.supplier_id})`);

      // Registrar en audit log
      await this.logAuditAction('supplier', created.supplier_id, 'created', documentJobId, {
        created_from_document: documentJobId,
        initial_data: newSupplier
      });

      return created.supplier_id;

    } catch (error) {
      console.error('❌ [SuppliersManager] Error procesando proveedor:', error);
      return undefined;
    }
  }

  /**
   * Procesa un cliente con deduplicación inteligente
   */
  private async processCustomer(customerData: CustomerData, documentJobId: string): Promise<string | undefined> {
    try {
      console.log(`🔍 [SuppliersManager] Buscando cliente: ${customerData.name}`);

      // PASO 1: Buscar por NIF/CIF
      let existingCustomer = null;
      if (customerData.nif_cif) {
        const { data } = await supabase
          .from('customers')
          .select('*')
          .eq('nif_cif', customerData.nif_cif)
          .single();
        
        existingCustomer = data;
        if (existingCustomer) {
          console.log(`✅ [SuppliersManager] Cliente encontrado por NIF/CIF: ${customerData.nif_cif}`);
        }
      }

      // PASO 2: Buscar por similaridad de nombre
      if (!existingCustomer) {
        existingCustomer = await this.findSimilarCustomer(customerData.name);
        if (existingCustomer) {
          console.log(`✅ [SuppliersManager] Cliente encontrado por similitud: ${existingCustomer.name}`);
        }
      }

      // PASO 3: Actualizar si existe
      if (existingCustomer) {
        const updatedData = this.mergeCustomerData(existingCustomer, customerData);
        
        if (this.hasSignificantChanges(existingCustomer, updatedData)) {
          const { data: updated, error } = await supabase
            .from('customers')
            .update({
              ...updatedData,
              last_updated_from_document: documentJobId,
              updated_at: new Date().toISOString()
            })
            .eq('customer_id', existingCustomer.customer_id)
            .select()
            .single();

          if (error) {
            console.error('❌ [SuppliersManager] Error actualizando cliente:', error);
          } else {
            console.log(`🔄 [SuppliersManager] Cliente actualizado: ${updated.name}`);
            
            await this.logAuditAction('customer', existingCustomer.customer_id, 'updated', documentJobId, {
              changes: this.getChanges(existingCustomer, updatedData),
              source_document: documentJobId
            });
          }
        }

        return existingCustomer.customer_id;
      }

      // PASO 4: Crear nuevo cliente
      const newCustomer = {
        name: customerData.name,
        nif_cif: customerData.nif_cif || null,
        address: customerData.address || null,
        postal_code: customerData.postal_code || null,
        city: customerData.city || null,
        province: customerData.province || null,
        phone: customerData.phone || null,
        email: customerData.email || null,
        customer_type: customerData.customer_type || this.guessCustomerType(customerData),
        first_detected_at: new Date().toISOString(),
        last_updated_from_document: documentJobId
      };

      const { data: created, error } = await supabase
        .from('customers')
        .insert(newCustomer)
        .select()
        .single();

      if (error) {
        console.error('❌ [SuppliersManager] Error creando cliente:', error);
        return undefined;
      }

      console.log(`✨ [SuppliersManager] Nuevo cliente creado: ${created.name} (${created.customer_id})`);

      await this.logAuditAction('customer', created.customer_id, 'created', documentJobId, {
        created_from_document: documentJobId,
        initial_data: newCustomer
      });

      return created.customer_id;

    } catch (error) {
      console.error('❌ [SuppliersManager] Error procesando cliente:', error);
      return undefined;
    }
  }

  /**
   * Busca proveedores similares por nombre usando búsqueda difusa
   */
  private async findSimilarSupplier(name: string): Promise<any> {
    try {
      // Limpiar nombre para búsqueda
      const cleanName = this.cleanName(name);
      
      // Buscar usando PostgreSQL full-text search
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .textSearch('name', cleanName, { type: 'websearch' })
        .limit(5);

      if (error || !data || data.length === 0) {
        return null;
      }

      // Calcular similaridad y devolver el más parecido
      const scored = data.map(supplier => ({
        ...supplier,
        similarity: this.calculateSimilarity(name, supplier.name)
      }));

      const best = scored.reduce((best, current) => 
        current.similarity > best.similarity ? current : best
      );

      // Solo considerar como match si la similaridad es alta
      return best.similarity > 0.8 ? best : null;

    } catch (error) {
      console.error('❌ [SuppliersManager] Error buscando proveedor similar:', error);
      return null;
    }
  }

  /**
   * Busca clientes similares por nombre
   */
  private async findSimilarCustomer(name: string): Promise<any> {
    try {
      const cleanName = this.cleanName(name);
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .textSearch('name', cleanName, { type: 'websearch' })
        .limit(5);

      if (error || !data || data.length === 0) {
        return null;
      }

      const scored = data.map(customer => ({
        ...customer,
        similarity: this.calculateSimilarity(name, customer.name)
      }));

      const best = scored.reduce((best, current) => 
        current.similarity > best.similarity ? current : best
      );

      return best.similarity > 0.8 ? best : null;

    } catch (error) {
      console.error('❌ [SuppliersManager] Error buscando cliente similar:', error);
      return null;
    }
  }

  /**
   * Combina datos existentes con nuevos datos de proveedor
   */
  private mergeSupplierData(existing: any, newData: SupplierData): any {
    return {
      name: newData.name || existing.name,
      nif_cif: newData.nif_cif || existing.nif_cif,
      commercial_name: newData.commercial_name || existing.commercial_name,
      address: newData.address || existing.address,
      postal_code: newData.postal_code || existing.postal_code,
      city: newData.city || existing.city,
      province: newData.province || existing.province,
      phone: newData.phone || existing.phone,
      email: newData.email || existing.email,
      // Mantener datos existentes que no vienen en la factura
      business_sector: existing.business_sector,
      company_size: existing.company_size,
      status: existing.status,
      notes: existing.notes
    };
  }

  /**
   * Combina datos existentes con nuevos datos de cliente
   */
  private mergeCustomerData(existing: any, newData: CustomerData): any {
    return {
      name: newData.name || existing.name,
      nif_cif: newData.nif_cif || existing.nif_cif,
      address: newData.address || existing.address,
      postal_code: newData.postal_code || existing.postal_code,
      city: newData.city || existing.city,
      province: newData.province || existing.province,
      phone: newData.phone || existing.phone,
      email: newData.email || existing.email,
      customer_type: newData.customer_type || existing.customer_type,
      // Mantener datos existentes
      payment_terms: existing.payment_terms,
      credit_limit: existing.credit_limit,
      status: existing.status,
      notes: existing.notes
    };
  }

  /**
   * Verifica si hay cambios significativos que ameriten actualización
   */
  private hasSignificantChanges(existing: any, updated: any): boolean {
    const fields = ['name', 'nif_cif', 'address', 'postal_code', 'city', 'province', 'phone', 'email'];
    
    return fields.some(field => {
      const existingValue = existing[field] || '';
      const updatedValue = updated[field] || '';
      return existingValue !== updatedValue && updatedValue !== '';
    });
  }

  /**
   * Calcula las diferencias entre registros para audit log
   */
  private getChanges(existing: any, updated: any): any {
    const changes: any = {};
    const fields = ['name', 'nif_cif', 'address', 'postal_code', 'city', 'province', 'phone', 'email'];
    
    fields.forEach(field => {
      const oldValue = existing[field] || null;
      const newValue = updated[field] || null;
      
      if (oldValue !== newValue && newValue !== null) {
        changes[field] = { from: oldValue, to: newValue };
      }
    });

    return changes;
  }

  /**
   * Registra acciones en el log de auditoría
   */
  private async logAuditAction(
    entityType: 'supplier' | 'customer',
    entityId: string,
    action: 'created' | 'updated',
    documentId: string,
    details: any
  ): Promise<void> {
    try {
      await supabase
        .from('audit_logs')
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          action,
          document_id: documentId,
          changes: details,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      console.error('❌ [SuppliersManager] Error registrando audit log:', error);
    }
  }

  /**
   * Limpia nombre para búsqueda (elimina caracteres especiales, etc.)
   */
  private cleanName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[.,;:]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Calcula similaridad entre dos nombres usando algoritmo simple
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const clean1 = this.cleanName(str1);
    const clean2 = this.cleanName(str2);

    if (clean1 === clean2) return 1.0;

    // Algoritmo de distancia de Levenshtein simplificado
    const longer = clean1.length > clean2.length ? clean1 : clean2;
    const shorter = clean1.length > clean2.length ? clean2 : clean1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calcula distancia de Levenshtein entre dos strings
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
   * Intenta adivinar el sector empresarial basado en el nombre
   */
  private guessBusinessSector(name: string): string | null {
    const sectors = {
      'Construcción': ['construccion', 'obra', 'edificación', 'reforma'],
      'Tecnología': ['software', 'tecnologia', 'sistemas', 'informatica'],
      'Servicios': ['servicios', 'consultoría', 'gestoria', 'asesoria'],
      'Transporte': ['transporte', 'logistica', 'distribucion'],
      'Alimentación': ['alimentacion', 'restaurante', 'catering', 'comida'],
      'Energía': ['energia', 'electricidad', 'gas', 'petroleo', 'combustible'],
      'Comercio': ['comercio', 'tienda', 'venta', 'distribuidor']
    };

    const lowerName = name.toLowerCase();
    
    for (const [sector, keywords] of Object.entries(sectors)) {
      if (keywords.some(keyword => lowerName.includes(keyword))) {
        return sector;
      }
    }

    return null;
  }

  /**
   * Intenta adivinar el tipo de cliente
   */
  private guessCustomerType(customerData: CustomerData): 'company' | 'individual' | 'freelancer' | 'public' {
    const name = customerData.name?.toLowerCase() || '';
    
    if (name.includes('ayuntamiento') || name.includes('ministerio') || name.includes('junta')) {
      return 'public';
    }
    
    if (name.includes('s.l.') || name.includes('s.a.') || name.includes('s.l.u.')) {
      return 'company';
    }

    // Por defecto, asumir que es una empresa
    return 'company';
  }

  /**
   * Obtiene estadísticas de proveedores
   */
  async getSuppliersStats(): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ [SuppliersManager] Error obteniendo estadísticas de proveedores:', error);
      return [];
    }
  }

  /**
   * Obtiene estadísticas de clientes
   */
  async getCustomersStats(): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ [SuppliersManager] Error obteniendo estadísticas de clientes:', error);
      return [];
    }
  }
}

// Instancia singleton
export const suppliersCustomersManager = new SuppliersCustomersManager(); 