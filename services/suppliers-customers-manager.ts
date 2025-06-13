// Servicio para gestión automática de Proveedores y Clientes
// Extrae y gestiona relaciones comerciales desde facturas procesadas

// POSTGRESQL COMPATIBLE VERSION
console.log('🏢 [SuppliersManager] Inicializando con PostgreSQL/SQLite compatible');

import { duplicateDetectionService } from './duplicate-detection.service';
import { unifiedNotificationService } from '@/lib/services/unified-notification.service';

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
        
        // Usar Map para tracking detallado de proveedores/clientes únicos
        const suppliersProcessed = new Map<string, string>(); // key -> supplier_id
        const customersProcessed = new Map<string, string>(); // key -> customer_id
        
        for (let i = 0; i < invoiceData.length; i++) {
          const invoice = invoiceData[i];
          console.log(`📋 [SuppliersManager] Procesando factura ${i + 1}/${invoiceData.length}: ${invoice.invoice_number || 'Sin número'}`);

          let currentSupplierId: string | undefined;
          let currentCustomerId: string | undefined;

          // Procesar proveedor si existe
          if (invoice.supplier && invoice.supplier.name) {
            // Crear clave única más robusta
            const supplierKey = this.createEntityKey(invoice.supplier.name, invoice.supplier.nif_cif);
            
            if (!suppliersProcessed.has(supplierKey)) {
              console.log(`🏢 [SuppliersManager] Nuevo proveedor detectado: ${invoice.supplier.name}`);
              const newSupplierId = await this.processSupplier(invoice.supplier, documentJobId);
              if (newSupplierId) {
                suppliersProcessed.set(supplierKey, newSupplierId);
                supplier_id = supplier_id || newSupplierId; // Primer proveedor como referencia principal
                currentSupplierId = newSupplierId;
                operations.push(`✅ Proveedor ${i + 1} procesado: ${invoice.supplier.name} (${invoice.supplier.nif_cif || 'Sin NIF'})`);
              } else {
                operations.push(`❌ Error procesando proveedor ${i + 1}: ${invoice.supplier.name}`);
              }
            } else {
              const existingSupplierId = suppliersProcessed.get(supplierKey);
              currentSupplierId = existingSupplierId;
              // Vincular esta factura específica con el proveedor existente
              await this.linkInvoiceToSupplier(documentJobId, existingSupplierId, invoice);
              operations.push(`♻️ Proveedor ${i + 1} ya procesado: ${invoice.supplier.name} (ID: ${existingSupplierId})`);
            }
          } else {
            operations.push(`⚠️ Factura ${i + 1} sin datos de proveedor válidos`);
          }

          // Procesar cliente si existe
          if (invoice.customer && invoice.customer.name) {
            // Crear clave única más robusta
            const customerKey = this.createEntityKey(invoice.customer.name, invoice.customer.nif_cif);
            
            if (!customersProcessed.has(customerKey)) {
              console.log(`👤 [SuppliersManager] Nuevo cliente detectado: ${invoice.customer.name}`);
              const newCustomerId = await this.processCustomer(invoice.customer, documentJobId);
              if (newCustomerId) {
                customersProcessed.set(customerKey, newCustomerId);
                customer_id = customer_id || newCustomerId; // Primer cliente como referencia principal
                currentCustomerId = newCustomerId;
                operations.push(`✅ Cliente ${i + 1} procesado: ${invoice.customer.name} (${invoice.customer.nif_cif || 'Sin NIF'})`);
              } else {
                operations.push(`❌ Error procesando cliente ${i + 1}: ${invoice.customer.name}`);
              }
            } else {
              const existingCustomerId = customersProcessed.get(customerKey);
              currentCustomerId = existingCustomerId;
              // Vincular esta factura específica con el cliente existente
              await this.linkInvoiceToCustomer(documentJobId, existingCustomerId, invoice);
              operations.push(`♻️ Cliente ${i + 1} ya procesado: ${invoice.customer.name} (ID: ${existingCustomerId})`);
            }
          } else {
            operations.push(`⚠️ Factura ${i + 1} sin datos de cliente válidos`);
          }

          // Crear registro en invoice_entities para esta factura específica
          if (currentSupplierId || currentCustomerId) {
            await this.createInvoiceEntity(documentJobId, currentSupplierId, currentCustomerId, invoice);
            console.log(`🔗 [SuppliersManager] Entidad de factura creada: ${invoice.invoice_number}`);
          }
        }

        console.log(`✅ [SuppliersManager] RESUMEN PROCESAMIENTO:`);
        console.log(`   📊 Total facturas: ${invoiceData.length}`);
        console.log(`   🏢 Proveedores únicos: ${suppliersProcessed.size}`);
        console.log(`   👤 Clientes únicos: ${customersProcessed.size}`);
        console.log(`   🎯 Proveedores procesados: ${Array.from(suppliersProcessed.values())}`);
        console.log(`   🎯 Clientes procesados: ${Array.from(customersProcessed.values())}`);
        
        // Agregar resumen detallado a las operaciones
        operations.push(`📊 RESUMEN: ${invoiceData.length} facturas, ${suppliersProcessed.size} proveedores únicos, ${customersProcessed.size} clientes únicos`);
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
      
      // NUEVO: Verificar duplicados antes de procesar
      const duplicateCheck = await duplicateDetectionService.findDuplicateSupplier(
        supplierData.nif_cif,
        supplierData.name
      );
      
      if (duplicateCheck) {
        console.log(`✅ [SuppliersManager] Proveedor existente encontrado: ${duplicateCheck.name}`);
        
        // Registrar en invoice_entities
        await this.linkInvoiceToSupplier(documentJobId, duplicateCheck.supplier_id);
        
        return duplicateCheck.supplier_id;
      }

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
            const changes = this.getChanges(existingSupplier, updatedData);
            await this.logAuditAction('supplier', supplierId, 'updated', documentJobId, changes);
            console.log(`Proveedor actualizado: ${cleanSupplierData.name}`);
            
            // Enviar notificación de proveedor actualizado
            try {
              const userId = await this.getUserIdFromDocument(documentJobId);
              if (userId) {
                const changesDescription = this.getChangesDescription(changes);
                await unifiedNotificationService.notifyEntityUpdated(
                  userId,
                  'supplier',
                  cleanSupplierData.name,
                  supplierId,
                  changesDescription
                );
              }
            } catch (error) {
              console.error('❌ Error enviando notificación de actualización:', error);
            }
          }
          // Vincular factura con proveedor existente actualizado
          await this.linkInvoiceToSupplier(documentJobId, supplierId, supplierData);
          return supplierId;
        } else {
          console.log(`ℹ️ [SuppliersManager] Proveedor sin cambios significativos: ${cleanSupplierData.name}`);
          // Vincular factura con proveedor existente
          await this.linkInvoiceToSupplier(documentJobId, existingSupplier.id, supplierData);
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
        
        // Enviar notificación de nuevo proveedor
        try {
          // Obtener el usuario del documento para enviar la notificación
          const userId = await this.getUserIdFromDocument(documentJobId);
          if (userId) {
            await unifiedNotificationService.notifySupplierCreated(
              userId, 
              cleanSupplierData.name, 
              supplierId,
              `documento ${documentJobId}`
            );
          }
        } catch (error) {
          console.error('❌ Error enviando notificación de proveedor:', error);
        }
        
        // Vincular factura con nuevo proveedor
        await this.linkInvoiceToSupplier(documentJobId, supplierId, supplierData);
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
            const changes = this.getChanges(existingCustomer, updatedData);
            await this.logAuditAction('customer', customerId, 'updated', documentJobId, changes);
            
            // Enviar notificación de cliente actualizado
            try {
              const userId = await this.getUserIdFromDocument(documentJobId);
              if (userId) {
                const changesDescription = this.getChangesDescription(changes);
                await unifiedNotificationService.notifyEntityUpdated(
                  userId,
                  'customer',
                  cleanCustomerData.name,
                  customerId,
                  changesDescription
                );
              }
            } catch (error) {
              console.error('❌ Error enviando notificación de actualización:', error);
            }
          }
          // Vincular factura con cliente existente actualizado
          await this.linkInvoiceToCustomer(documentJobId, customerId, customerData);
          return customerId;
        }
        // Vincular factura con cliente existente
        await this.linkInvoiceToCustomer(documentJobId, existingCustomer.id, customerData);
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
        
        // Enviar notificación de nuevo cliente
        try {
          const userId = await this.getUserIdFromDocument(documentJobId);
          if (userId) {
            await unifiedNotificationService.notifyCustomerCreated(
              userId,
              cleanCustomerData.name,
              customerId,
              `documento ${documentJobId}`
            );
          }
        } catch (error) {
          console.error('❌ Error enviando notificación de cliente:', error);
        }
        
        // Vincular factura con nuevo cliente
        await this.linkInvoiceToCustomer(documentJobId, customerId, customerData);
      }

      return customerId;

    } catch (error) {
      console.error('❌ [SuppliersManager] Error procesando cliente:', error);
      return undefined;
    }
  }

  // POSTGRESQL REAL METHODS - Using PostgreSQL client
  private async findSupplierByNIF(nif: string): Promise<any> {
    console.log(`🔍 [PostgreSQL] Searching supplier by NIF: ${nif}`);
    
    const pgClient = await import('@/lib/postgresql-client');
    const { data: suppliers } = await pgClient.query(
      'SELECT * FROM suppliers WHERE nif_cif = $1 AND status = $2',
      [nif, 'active']
    );
    
    return suppliers && suppliers.length > 0 ? suppliers[0] : null;
  }

  private async findCustomerByNIF(nif: string): Promise<any> {
    console.log(`🔍 [PostgreSQL] Searching customer by NIF: ${nif}`);
    
    const pgClient = await import('@/lib/postgresql-client');
    const { data: customers } = await pgClient.query(
      'SELECT * FROM customers WHERE nif_cif = $1 AND status = $2',
      [nif, 'active']
    );
    
    return customers && customers.length > 0 ? customers[0] : null;
  }

  private async createSupplier(supplierData: any): Promise<string> {
    console.log(`➕ [PostgreSQL] Creating supplier: ${supplierData.name}`);
    
    const pgClient = await import('@/lib/postgresql-client');
    
    // Si no hay NIF/CIF, generar uno temporal único
    const nifCif = supplierData.nif_cif || `TEMP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const { data: newSupplier, error } = await pgClient.query(
      `INSERT INTO suppliers (name, nif_cif, commercial_name, address, postal_code, city, province, phone, email, business_sector, status, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()) 
       RETURNING supplier_id`,
      [
        supplierData.name,
        nifCif, // Siempre tendrá un valor (real o temporal)
        supplierData.commercial_name || null,
        supplierData.address || null,
        supplierData.postal_code || null,
        supplierData.city || null,
        supplierData.province || null,
        supplierData.phone || null,
        supplierData.email || null,
        supplierData.business_sector || null,
        supplierData.status || 'active'
      ]
    );
    
    if (error) {
      console.error('❌ [PostgreSQL] Error creating supplier:', error);
      throw error;
    }
    
    const supplierId = newSupplier?.[0]?.supplier_id;
    if (supplierId) {
      console.log(`✅ [PostgreSQL] Proveedor creado con ID: ${supplierId}, NIF/CIF: ${nifCif}`);
    }
    
    return supplierId || null;
  }

  private async createCustomer(customerData: any): Promise<string> {
    console.log(`➕ [PostgreSQL] Creating customer: ${customerData.name}`);
    
    const pgClient = await import('@/lib/postgresql-client');
    
    // Si no hay NIF/CIF, generar uno temporal único
    const nifCif = customerData.nif_cif || `TEMP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const { data: newCustomer, error } = await pgClient.query(
      `INSERT INTO customers (name, nif_cif, address, postal_code, city, province, phone, email, customer_type, status, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()) 
       RETURNING customer_id`,
      [
        customerData.name,
        nifCif, // Siempre tendrá un valor (real o temporal)
        customerData.address || null,
        customerData.postal_code || null,
        customerData.city || null,
        customerData.province || null,
        customerData.phone || null,
        customerData.email || null,
        customerData.customer_type || 'company',
        customerData.status || 'active'
      ]
    );
    
    if (error) {
      console.error('❌ [PostgreSQL] Error creating customer:', error);
      throw error;
    }
    
    const customerId = newCustomer?.[0]?.customer_id;
    if (customerId) {
      console.log(`✅ [PostgreSQL] Cliente creado con ID: ${customerId}, NIF/CIF: ${nifCif}`);
    }
    
    return customerId || null;
  }

  private async updateSupplier(id: string, data: any): Promise<string> {
    console.log(`📝 [PostgreSQL] Updating supplier: ${id}`);
    
    const pgClient = await import('@/lib/postgresql-client');
    const fields = [];
    const values = [];
    let paramIndex = 1;
    
    // Construir campos dinámicamente
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id') {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });
    
    // Agregar updated_at
    fields.push(`updated_at = NOW()`);
    
    // Agregar el ID al final
    values.push(id);
    
    const { error } = await pgClient.query(
      `UPDATE suppliers SET ${fields.join(', ')} WHERE supplier_id = $${paramIndex}`,
      values
    );
    
    if (error) {
      console.error('❌ [PostgreSQL] Error updating supplier:', error);
      throw error;
    }
    
    return id;
  }

  private async updateCustomer(id: string, data: any): Promise<string> {
    console.log(`📝 [PostgreSQL] Updating customer: ${id}`);
    
    const pgClient = await import('@/lib/postgresql-client');
    const fields = [];
    const values = [];
    let paramIndex = 1;
    
    // Construir campos dinámicamente
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id') {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });
    
    // Agregar updated_at
    fields.push(`updated_at = NOW()`);
    
    // Agregar el ID al final
    values.push(id);
    
    const { error } = await pgClient.query(
      `UPDATE customers SET ${fields.join(', ')} WHERE customer_id = $${paramIndex}`,
      values
    );
    
    if (error) {
      console.error('❌ [PostgreSQL] Error updating customer:', error);
      throw error;
    }
    
    return id;
  }

  /**
   * Busca proveedores similares por nombre usando búsqueda difusa
   */
  private async findSimilarSupplier(name: string): Promise<any> {
    try {
      // Limpiar nombre para búsqueda
      const cleanName = this.cleanName(name);
      
      console.log(`🔍 [PostgreSQL] Searching similar supplier for: ${cleanName}`);
      
      const pgClient = await import('@/lib/postgresql-client');
      
      // Buscar proveedores con nombres similares usando ILIKE
      const { data: suppliers } = await pgClient.query(
        `SELECT * FROM suppliers 
         WHERE status = 'active' 
         AND (LOWER(name) LIKE $1 OR LOWER(commercial_name) LIKE $1)
         ORDER BY name`,
        [`%${cleanName}%`]
      );

      if (!suppliers || suppliers.length === 0) {
        return null;
      }

      // Calcular similaridad y devolver el más parecido
      const scored = suppliers.map((supplier: any) => ({
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
      
      console.log(`🔍 [PostgreSQL] Searching similar customer for: ${cleanName}`);
      
      const pgClient = await import('@/lib/postgresql-client');
      
      // Buscar clientes con nombres similares usando ILIKE
      const { data: customers } = await pgClient.query(
        `SELECT * FROM customers 
         WHERE status = 'active' 
         AND LOWER(name) LIKE $1
         ORDER BY name`,
        [`%${cleanName}%`]
      );

      if (!customers || customers.length === 0) {
        return null;
      }

      const scored = customers.map((customer: any) => ({
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
      const { dbAdapter } = await import('@/lib/db-adapter');
      
      // Registrar en audit_logs
      const result = await dbAdapter.query(
        `INSERT INTO audit_logs 
         (entity_type, entity_id, action, document_id, old_values, new_values, notes) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          entityType.toUpperCase() + 'S', // SUPPLIERS o CUSTOMERS
          entityId,
          action.toUpperCase(),
          documentId,
          action === 'updated' ? JSON.stringify(details.from || {}) : null,
          JSON.stringify(details.to || details),
          `Auto-generated by suppliers-customers-manager`
        ]
      );
      
      if (result.error) {
        console.error('❌ [SuppliersManager] Error registrando audit log:', result.error);
      } else {
        console.log(`📋 [PostgreSQL] Audit log: ${action} ${entityType} ${entityId}`);
      }
    } catch (error) {
      console.error('❌ [SuppliersManager] Error registrando audit log:', error);
    }
  }

  /**
   * Crea una clave única para entidades (proveedores/clientes)
   */
  private createEntityKey(name: string, nifCif?: string): string {
    const cleanName = this.cleanName(name);
    const cleanNif = nifCif?.trim().toUpperCase() || '';
    
    // Si hay NIF/CIF, usarlo como clave principal
    if (cleanNif && cleanNif !== 'UNKNOWN' && cleanNif.length > 0) {
      return `NIF_${cleanNif}`;
    }
    
    // Si no hay NIF, usar nombre limpio
    return `NAME_${cleanName}`;
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
   * Crea un registro en invoice_entities para vincular una factura específica
   */
  private async createInvoiceEntity(
    documentId: string, 
    supplierId?: string, 
    customerId?: string, 
    invoiceData?: any
  ): Promise<void> {
    try {
      console.log(`🔗 [SuppliersManager] Creando entidad de factura para: ${invoiceData?.invoice_number || 'Sin número'}`);
      
      const pgClient = await import('@/lib/postgresql-client');
      
      // Extraer datos de la factura
      const invoiceNumber = invoiceData?.invoice_number || null;
      const invoiceDate = invoiceData?.issue_date || invoiceData?.invoice_date || null;
      const totalAmount = invoiceData?.total_amount || invoiceData?.totals?.total || null;
      const taxAmount = invoiceData?.tax_amount || invoiceData?.totals?.total_tax_amount || null;
      
      // Insertar en invoice_entities
      const { error } = await pgClient.query(
        `INSERT INTO invoice_entities (
          document_id, supplier_id, customer_id, invoice_number, invoice_date, 
          total_amount, tax_amount, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT (document_id, COALESCE(supplier_id, '00000000-0000-0000-0000-000000000000'), COALESCE(customer_id, '00000000-0000-0000-0000-000000000000'), COALESCE(invoice_number, '')) 
        DO UPDATE SET 
          total_amount = EXCLUDED.total_amount,
          tax_amount = EXCLUDED.tax_amount,
          updated_at = NOW()`,
        [documentId, supplierId, customerId, invoiceNumber, invoiceDate, totalAmount, taxAmount, 'active']
      );
      
      if (error) {
        console.error('❌ [SuppliersManager] Error creando entidad de factura:', error);
      } else {
        console.log(`✅ [SuppliersManager] Entidad de factura creada: ${invoiceNumber || 'Sin número'}`);
      }
    } catch (error) {
      console.error('❌ [SuppliersManager] Error en createInvoiceEntity:', error);
    }
  }

  /**
   * Obtiene estadísticas de proveedores
   */
  async getSuppliersStats(): Promise<any> {
    try {
      const pgClient = await import('@/lib/postgresql-client');
      
      console.log('📊 [PostgreSQL] Getting suppliers stats');
      
      // Obtener estadísticas básicas
      const { data: stats } = await pgClient.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_this_month
        FROM suppliers
      `);
      
      // Obtener top sectores
      const { data: sectors } = await pgClient.query(`
        SELECT business_sector, COUNT(*) as count
        FROM suppliers
        WHERE business_sector IS NOT NULL
        GROUP BY business_sector
        ORDER BY count DESC
        LIMIT 5
      `);
      
      return {
        total: parseInt(stats?.[0]?.total || '0'),
        active: parseInt(stats?.[0]?.active || '0'),
        new_this_month: parseInt(stats?.[0]?.new_this_month || '0'),
        top_sectors: sectors || []
      };
    } catch (error) {
      console.error('❌ [SuppliersManager] Error obteniendo stats de proveedores:', error);
      return { total: 0, active: 0, new_this_month: 0, top_sectors: [] };
    }
  }

  /**
   * Vincula una factura con un proveedor
   */
  private async linkInvoiceToSupplier(documentId: string, supplierId: string, invoiceData?: any): Promise<void> {
    try {
      console.log(`🔗 [SuppliersManager] Vinculando factura ${documentId} con proveedor ${supplierId}`);
      
      const pgClient = await import('@/lib/postgresql-client');
      
      // Extraer datos de la factura si están disponibles
      const invoiceNumber = invoiceData?.invoice_number || null;
      const invoiceDate = invoiceData?.issue_date || invoiceData?.invoice_date || null;
      const totalAmount = invoiceData?.total_amount || invoiceData?.totals?.total || null;
      const taxAmount = invoiceData?.tax_amount || invoiceData?.totals?.total_tax_amount || null;
      
      // Insertar en invoice_entities
      const { error } = await pgClient.query(
        `INSERT INTO invoice_entities (
          document_id, supplier_id, invoice_number, invoice_date, 
          total_amount, tax_amount, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (document_id, supplier_id, customer_id, invoice_number) 
        DO UPDATE SET 
          total_amount = EXCLUDED.total_amount,
          tax_amount = EXCLUDED.tax_amount,
          updated_at = NOW()`,
        [documentId, supplierId, invoiceNumber, invoiceDate, totalAmount, taxAmount, 'active']
      );
      
      if (error) {
        console.error('❌ [SuppliersManager] Error vinculando factura:', error);
      } else {
        console.log('✅ [SuppliersManager] Factura vinculada exitosamente');
      }
    } catch (error) {
      console.error('❌ [SuppliersManager] Error en linkInvoiceToSupplier:', error);
    }
  }

  /**
   * Vincula una factura con un cliente
   */
  private async linkInvoiceToCustomer(documentId: string, customerId: string, invoiceData?: any): Promise<void> {
    try {
      console.log(`🔗 [SuppliersManager] Vinculando factura ${documentId} con cliente ${customerId}`);
      
      const pgClient = await import('@/lib/postgresql-client');
      
      // Similar a linkInvoiceToSupplier
      const invoiceNumber = invoiceData?.invoice_number || null;
      const invoiceDate = invoiceData?.issue_date || invoiceData?.invoice_date || null;
      const totalAmount = invoiceData?.total_amount || invoiceData?.totals?.total || null;
      const taxAmount = invoiceData?.tax_amount || invoiceData?.totals?.total_tax_amount || null;
      
      const { error } = await pgClient.query(
        `INSERT INTO invoice_entities (
          document_id, customer_id, invoice_number, invoice_date, 
          total_amount, tax_amount, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (document_id, supplier_id, customer_id, invoice_number) 
        DO UPDATE SET 
          customer_id = EXCLUDED.customer_id,
          total_amount = EXCLUDED.total_amount,
          tax_amount = EXCLUDED.tax_amount,
          updated_at = NOW()`,
        [documentId, customerId, invoiceNumber, invoiceDate, totalAmount, taxAmount, 'active']
      );
      
      if (error) {
        console.error('❌ [SuppliersManager] Error vinculando factura con cliente:', error);
      } else {
        console.log('✅ [SuppliersManager] Factura vinculada con cliente exitosamente');
      }
    } catch (error) {
      console.error('❌ [SuppliersManager] Error en linkInvoiceToCustomer:', error);
    }
  }

  /**
   * Obtiene el ID del usuario desde un documento
   */
  private async getUserIdFromDocument(documentJobId: string): Promise<string | null> {
    try {
      const pgClient = await import('@/lib/postgresql-client');
      const { data } = await pgClient.query(
        'SELECT user_id FROM documents WHERE job_id = $1',
        [documentJobId]
      );
      
      return data?.[0]?.user_id || null;
    } catch (error) {
      console.error('❌ [SuppliersManager] Error obteniendo userId del documento:', error);
      return null;
    }
  }

  /**
   * Convierte los cambios en una descripción legible
   */
  private getChangesDescription(changes: any): string {
    const descriptions: string[] = [];
    
    if (changes.name) descriptions.push(`nombre`);
    if (changes.nif_cif) descriptions.push(`NIF/CIF`);
    if (changes.address) descriptions.push(`dirección`);
    if (changes.city) descriptions.push(`ciudad`);
    if (changes.phone) descriptions.push(`teléfono`);
    if (changes.email) descriptions.push(`email`);
    
    if (descriptions.length === 0) return 'información actualizada';
    if (descriptions.length === 1) return descriptions[0] + ' actualizado';
    if (descriptions.length === 2) return descriptions.join(' y ') + ' actualizados';
    
    const last = descriptions.pop();
    return descriptions.join(', ') + ' y ' + last + ' actualizados';
  }

  /**
   * Obtiene estadísticas de clientes
   */
  async getCustomersStats(): Promise<any> {
    try {
      const pgClient = await import('@/lib/postgresql-client');
      
      console.log('📊 [PostgreSQL] Getting customers stats');
      
      // Obtener estadísticas básicas
      const { data: stats } = await pgClient.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_this_month
        FROM customers
      `);
      
      // Obtener conteo por tipo
      const { data: types } = await pgClient.query(`
        SELECT customer_type, COUNT(*) as count
        FROM customers
        GROUP BY customer_type
      `);
      
      const byType = {
        company: 0,
        individual: 0,
        freelancer: 0,
        public: 0
      };
      
      types?.forEach((row: any) => {
        if (row.customer_type && byType.hasOwnProperty(row.customer_type)) {
          byType[row.customer_type as keyof typeof byType] = parseInt(row.count || '0');
        }
      });
      
      return {
        total: parseInt(stats?.[0]?.total || '0'),
        active: parseInt(stats?.[0]?.active || '0'),
        new_this_month: parseInt(stats?.[0]?.new_this_month || '0'),
        by_type: byType
      };
    } catch (error) {
      console.error('❌ [SuppliersManager] Error obteniendo stats de clientes:', error);
      return { total: 0, active: 0, new_this_month: 0, by_type: { company: 0, individual: 0, freelancer: 0, public: 0 } };
    }
  }
}

// Instancia singleton
export const suppliersCustomersManager = new SuppliersCustomersManager(); 