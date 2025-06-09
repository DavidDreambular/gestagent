// Servicio para gestión automática de Proveedores y Clientes
// Extrae y gestiona relaciones comerciales desde facturas procesadas

// POSTGRESQL COMPATIBLE VERSION
console.log('🏢 [SuppliersManager] Inicializando con PostgreSQL/SQLite compatible');

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
      console.log('🏢 [SuppliersManager] Procesando relaciones comerciales con PostgreSQL...');

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
   * Procesa un proveedor con deduplicación inteligente - PostgreSQL Version
   */
  private async processSupplier(supplierData: SupplierData, documentJobId: string): Promise<string | undefined> {
    try {
      console.log(`🔍 [SuppliersManager] Buscando proveedor con PostgreSQL: ${supplierData.name}`);

      // Limpiar y truncar datos para evitar errores de BD
      const cleanSupplierData = {
        ...supplierData,
        name: supplierData.name?.substring(0, 255) || '',
        nif_cif: supplierData.nif_cif?.substring(0, 50) || undefined,
        commercial_name: supplierData.commercial_name?.substring(0, 255) || undefined,
        address: supplierData.address?.substring(0, 255) || undefined,
        city: supplierData.city?.substring(0, 100) || undefined,
        province: supplierData.province?.substring(0, 100) || undefined,
        email: supplierData.email?.substring(0, 255) || undefined,
        phone: supplierData.phone?.substring(0, 20) || undefined
      };

      // PASO 1: Buscar por NIF/CIF usando PostgreSQL MCP tools
      let existingSupplier = null;
      if (cleanSupplierData.nif_cif) {
        // TODO: Usar PostgreSQL MCP tools cuando estén configurados
        existingSupplier = await this.findSupplierByNIF(cleanSupplierData.nif_cif);
        if (existingSupplier) {
          console.log(`✅ [SuppliersManager] Proveedor encontrado por NIF/CIF: ${cleanSupplierData.nif_cif}`);
        }
      }

      // PASO 2: Si no se encuentra por NIF, buscar por similaridad de nombre
      if (!existingSupplier) {
        existingSupplier = await this.findSimilarSupplier(cleanSupplierData.name);
        if (existingSupplier) {
          console.log(`✅ [SuppliersManager] Proveedor encontrado por similitud: ${existingSupplier.name}`);
        }
      }

      // PASO 3: Si existe, actualizar información si es necesario
      if (existingSupplier) {
        const updatedData = this.mergeSupplierData(existingSupplier, cleanSupplierData);
        
        if (this.hasSignificantChanges(existingSupplier, updatedData)) {
          const supplierId = await this.updateSupplier(existingSupplier.id, updatedData);
          if (supplierId) {
            await this.logAuditAction('supplier', supplierId, 'updated', documentJobId, 
              this.getChanges(existingSupplier, updatedData));
            console.log(`Proveedor actualizado: ${cleanSupplierData.name}`);
          }
          return supplierId;
        } else {
          console.log(`ℹ️ [SuppliersManager] Proveedor sin cambios significativos: ${cleanSupplierData.name}`);
          return existingSupplier.id;
        }
      }

      // PASO 4: Si no existe, crear nuevo proveedor
      console.log(`➕ [SuppliersManager] Creando nuevo proveedor: ${cleanSupplierData.name}`);
      
      const newSupplier = {
        ...cleanSupplierData,
        id: `supplier_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'active',
        business_sector: this.guessBusinessSector(cleanSupplierData.name)
      };

      const supplierId = await this.createSupplier(newSupplier);
      if (supplierId) {
        await this.logAuditAction('supplier', supplierId, 'created', documentJobId, cleanSupplierData);
        console.log(`✅ [SuppliersManager] Proveedor creado exitosamente: ${cleanSupplierData.name} (ID: ${supplierId})`);
      }

      return supplierId;

    } catch (error) {
      console.error('❌ [SuppliersManager] Error procesando proveedor:', error);
      return undefined;
    }
  }

  /**
   * Procesa un cliente con deduplicación inteligente - PostgreSQL Version
   */
  private async processCustomer(customerData: CustomerData, documentJobId: string): Promise<string | undefined> {
    try {
      console.log(`🔍 [SuppliersManager] Buscando cliente con PostgreSQL: ${customerData.name}`);

      const cleanCustomerData = {
        ...customerData,
        name: customerData.name?.substring(0, 255) || '',
        nif_cif: customerData.nif_cif?.substring(0, 50) || undefined,
        address: customerData.address?.substring(0, 255) || undefined,
        city: customerData.city?.substring(0, 100) || undefined,
        province: customerData.province?.substring(0, 100) || undefined,
        email: customerData.email?.substring(0, 255) || undefined,
        phone: customerData.phone?.substring(0, 20) || undefined
      };

      // Buscar cliente existente
      let existingCustomer = null;
      if (cleanCustomerData.nif_cif) {
        existingCustomer = await this.findCustomerByNIF(cleanCustomerData.nif_cif);
      }

      if (!existingCustomer) {
        existingCustomer = await this.findSimilarCustomer(cleanCustomerData.name);
      }

      if (existingCustomer) {
        const updatedData = this.mergeCustomerData(existingCustomer, cleanCustomerData);
        
        if (this.hasSignificantChanges(existingCustomer, updatedData)) {
          const customerId = await this.updateCustomer(existingCustomer.id, updatedData);
          if (customerId) {
            await this.logAuditAction('customer', customerId, 'updated', documentJobId, 
              this.getChanges(existingCustomer, updatedData));
          }
          return customerId;
        }
        return existingCustomer.id;
      }

      // Crear nuevo cliente
      const newCustomer = {
        ...cleanCustomerData,
        id: `customer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'active',
        customer_type: this.guessCustomerType(cleanCustomerData)
      };

      const customerId = await this.createCustomer(newCustomer);
      if (customerId) {
        await this.logAuditAction('customer', customerId, 'created', documentJobId, cleanCustomerData);
        console.log(`✅ [SuppliersManager] Cliente creado exitosamente: ${cleanCustomerData.name} (ID: ${customerId})`);
      }

      return customerId;

    } catch (error) {
      console.error('❌ [SuppliersManager] Error procesando cliente:', error);
      return undefined;
    }
  }

  // POSTGRESQL MOCK METHODS - TODO: Replace with real PostgreSQL MCP tools
  private async findSupplierByNIF(nif: string): Promise<any> {
    console.log(`🔍 [PostgreSQL Mock] Searching supplier by NIF: ${nif}`);
    // TODO: Implement with PostgreSQL MCP tools
    return null; // Mock return
  }

  private async findCustomerByNIF(nif: string): Promise<any> {
    console.log(`🔍 [PostgreSQL Mock] Searching customer by NIF: ${nif}`);
    // TODO: Implement with PostgreSQL MCP tools
    return null; // Mock return
  }

  private async createSupplier(supplierData: any): Promise<string> {
    console.log(`➕ [PostgreSQL Mock] Creating supplier: ${supplierData.name}`);
    // TODO: Implement with PostgreSQL MCP tools
    return supplierData.id; // Mock return
  }

  private async createCustomer(customerData: any): Promise<string> {
    console.log(`➕ [PostgreSQL Mock] Creating customer: ${customerData.name}`);
    // TODO: Implement with PostgreSQL MCP tools
    return customerData.id; // Mock return
  }

  private async updateSupplier(id: string, data: any): Promise<string> {
    console.log(`📝 [PostgreSQL Mock] Updating supplier: ${id}`);
    // TODO: Implement with PostgreSQL MCP tools
    return id; // Mock return
  }

  private async updateCustomer(id: string, data: any): Promise<string> {
    console.log(`📝 [PostgreSQL Mock] Updating customer: ${id}`);
    // TODO: Implement with PostgreSQL MCP tools
    return id; // Mock return
  }

  /**
   * Busca proveedores similares por nombre usando búsqueda difusa
   */
  private async findSimilarSupplier(name: string): Promise<any> {
    try {
      // Limpiar nombre para búsqueda
      const cleanName = this.cleanName(name);
      
      // TODO: Buscar usando PostgreSQL full-text search cuando esté configurado
      console.log(`🔍 [PostgreSQL Mock] Searching similar supplier for: ${cleanName}`);
      
      // Mock implementation - return null for now
      const mockData: any[] = [];

      if (mockData.length === 0) {
        return null;
      }

      // Calcular similaridad y devolver el más parecido
      const scored = mockData.map((supplier: any) => ({
        ...supplier,
        similarity: this.calculateSimilarity(name, supplier.name)
      }));

      const best = scored.reduce((best: any, current: any) => 
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
      
      // TODO: Buscar usando PostgreSQL full-text search cuando esté configurado
      console.log(`🔍 [PostgreSQL Mock] Searching similar customer for: ${cleanName}`);
      
      // Mock implementation - return null for now
      const mockData: any[] = [];

      if (mockData.length === 0) {
        return null;
      }

      const scored = mockData.map((customer: any) => ({
        ...customer,
        similarity: this.calculateSimilarity(name, customer.name)
      }));

      const best = scored.reduce((best: any, current: any) => 
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
      // TODO: Registrar en audit log con PostgreSQL MCP tools
      console.log(`📋 [PostgreSQL Mock] Audit log: ${action} ${entityType} ${entityId}`, details);
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

    // Incrementar por cada carácter
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
            matrix[i - 1][j - 1] + 1, // substitución
            matrix[i][j - 1] + 1,     // inserción
            matrix[i - 1][j] + 1      // eliminación
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Adivina el sector de negocio basado en el nombre
   */
  private guessBusinessSector(name: string): string | null {
    const sectors = {
      'consultoria': ['consultoria', 'consulting', 'asesoria', 'asesor'],
      'tecnologia': ['software', 'tech', 'sistemas', 'informatica', 'digital'],
      'construccion': ['construccion', 'obra', 'building', 'inmobiliaria'],
      'comercio': ['comercio', 'tienda', 'shop', 'store', 'retail'],
      'servicios': ['servicios', 'service', 'limpieza', 'mantenimiento'],
      'alimentacion': ['restaurante', 'bar', 'cafe', 'alimentacion', 'food'],
      'transporte': ['transporte', 'logistica', 'courier', 'envio'],
      'educacion': ['educacion', 'formacion', 'academia', 'escuela'],
      'salud': ['medico', 'clinica', 'hospital', 'farmacia', 'salud'],
      'financiero': ['banco', 'financiera', 'seguros', 'investment']
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
   * Adivina el tipo de cliente basado en los datos
   */
  private guessCustomerType(customerData: CustomerData): 'company' | 'individual' | 'freelancer' | 'public' {
    const name = customerData.name?.toLowerCase() || '';
    
    // Patrones para determinar tipo
    if (name.includes('ayuntamiento') || name.includes('gobierno') || name.includes('ministerio')) {
      return 'public';
    }
    
    if (name.includes('sl') || name.includes('sa') || name.includes('limited') || name.includes('corp')) {
      return 'company';
    }
    
    if (customerData.nif_cif?.length === 9 && customerData.nif_cif.match(/^\d{8}[A-Z]$/)) {
      return 'individual';
    }
    
    return 'freelancer'; // Default para autónomos
  }

  /**
   * Obtiene estadísticas de proveedores
   */
  async getSuppliersStats(): Promise<any> {
    try {
      // TODO: Implementar con PostgreSQL MCP tools
      console.log('📊 [PostgreSQL Mock] Getting suppliers stats');
      
      return {
        total: 0,
        active: 0,
        new_this_month: 0,
        top_sectors: []
      };
    } catch (error) {
      console.error('❌ [SuppliersManager] Error obteniendo stats de proveedores:', error);
      return { total: 0, active: 0, new_this_month: 0, top_sectors: [] };
    }
  }

  /**
   * Obtiene estadísticas de clientes
   */
  async getCustomersStats(): Promise<any> {
    try {
      // TODO: Implementar con PostgreSQL MCP tools
      console.log('📊 [PostgreSQL Mock] Getting customers stats');
      
      return {
        total: 0,
        active: 0,
        new_this_month: 0,
        by_type: { company: 0, individual: 0, freelancer: 0, public: 0 }
      };
    } catch (error) {
      console.error('❌ [SuppliersManager] Error obteniendo stats de clientes:', error);
      return { total: 0, active: 0, new_this_month: 0, by_type: { company: 0, individual: 0, freelancer: 0, public: 0 } };
    }
  }
}

// Instancia singleton
export const suppliersCustomersManager = new SuppliersCustomersManager(); 