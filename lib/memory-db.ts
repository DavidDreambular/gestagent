// Base de datos en memoria completa para desarrollo
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

interface User {
  user_id: string;
  username: string;
  email: string;
  password: string;
  role: string;
  created_at: Date;
  updated_at: Date;
}

interface Document {
  id: number;
  job_id: string;
  document_type: string;
  raw_json: any;
  processed_json: any;
  upload_timestamp: Date;
  user_id: string | null;
  status: string;
  version: number;
  supplier_id: string | null;
  customer_id: string | null;
  emitter_name: string | null;
  receiver_name: string | null;
  document_date: Date | null;
  total_amount: number | null;
  tax_amount: number | null;
  title: string | null;
  file_path: string | null;
  processing_metadata: any;
  created_at: Date;
  updated_at: Date;
}

interface Supplier {
  supplier_id: string;
  nif_cif: string | null;
  name: string;
  commercial_name: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  province: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  contact_person: string | null;
  business_sector: string | null;
  company_size: string;
  status: string;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  total_invoices: number;
  total_amount: number;
  last_invoice_date: Date | null;
  first_detected_at: Date;
  last_updated_from_document: string | null;
}

interface Customer {
  customer_id: string;
  nif_cif: string | null;
  name: string;
  commercial_name: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  province: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  contact_person: string | null;
  customer_type: string;
  payment_terms: string | null;
  credit_limit: number | null;
  status: string;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  total_invoices: number;
  total_amount: number;
  last_invoice_date: Date | null;
  first_detected_at: Date;
  last_updated_from_document: string | null;
}

interface AuditLog {
  log_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  user_id: string | null;
  document_id: string | null;
  changes: any;
  timestamp: Date;
  notes: string | null;
}

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: Date;
  data: any;
}

interface ExtractionTemplate {
  template_id: string;
  name: string;
  description: string | null;
  document_type: string;
  supplier_id: string | null;
  customer_id: string | null;
  extraction_rules: any;
  confidence_threshold: number;
  is_active: boolean;
  usage_count: number;
  success_rate: number;
  last_used_at: Date | null;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

interface Webhook {
  id: string;
  event: string;
  source: string;
  status: 'received' | 'processing' | 'processed' | 'failed';
  payload: any;
  response: any | null;
  error: string | null;
  timestamp: Date;
  processed_at: Date | null;
}

interface SystemConfiguration {
  company: {
    name: string;
    cif: string;
    address: string;
    phone: string;
    email: string;
    logo_url?: string;
  };
  apis: {
    mistral_api_key: string;
    openai_api_key: string;
    openrouter_api_key?: string;
    stripe_api_key?: string;
  };
  notifications: {
    email_enabled: boolean;
    push_enabled: boolean;
    vencimientos_dias: number;
    alertas_criticas: boolean;
  };
  backup: {
    auto_backup_enabled: boolean;
    backup_frequency_days: number;
    backup_retention_days: number;
    backup_location: string;
  };
  advanced: {
    debug_mode: boolean;
    api_rate_limit: number;
    max_file_size_mb: number;
    allowed_file_types: string[];
    ocr_language: string;
  };
}

// Almacenamiento en memoria
class MemoryDatabase {
  private users: Map<string, User> = new Map();
  private documents: Map<string, Document> = new Map();
  private suppliers: Map<string, Supplier> = new Map();
  private customers: Map<string, Customer> = new Map();
  private auditLogs: Map<string, AuditLog> = new Map();
  private notifications: Map<string, Notification> = new Map();
  private extractionTemplates: Map<string, ExtractionTemplate> = new Map();
  private webhooks: Map<string, Webhook> = new Map();
  private systemConfiguration: SystemConfiguration | null = null;
  private documentIdCounter: number = 1;

  constructor() {
    this.initializeTestData();
  }

  private initializeTestData() {
    // Crear usuarios de prueba
    const hashedPassword = bcrypt.hashSync('password123', 10);
    const testUsers = [
      { username: 'admin', email: 'admin@gestagent.com', role: 'admin' },
      { username: 'demo', email: 'demo@gestagent.com', role: 'user' },
      { username: 'contable', email: 'contable@gestagent.com', role: 'contable' },
      { username: 'gestor', email: 'gestor@gestagent.com', role: 'gestor' }
    ];

    testUsers.forEach(user => {
      const userId = uuidv4();
      this.users.set(userId, {
        user_id: userId,
        username: user.username,
        email: user.email,
        password: hashedPassword,
        role: user.role,
        created_at: new Date(),
        updated_at: new Date()
      });
    });

    // Crear proveedores de ejemplo
    const suppliers = [
      { nif: 'A12345678', name: 'Tecnología Avanzada S.A.', commercial: 'TechnoAdvance', city: 'Madrid' },
      { nif: 'B87654321', name: 'Suministros Oficina Express', commercial: 'OfficeExpress', city: 'Barcelona' },
      { nif: 'C11223344', name: 'Servicios Contables López', commercial: 'ContaLópez', city: 'Valencia' }
    ];

    suppliers.forEach(sup => {
      const supplierId = uuidv4();
      this.suppliers.set(supplierId, {
        supplier_id: supplierId,
        nif_cif: sup.nif,
        name: sup.name,
        commercial_name: sup.commercial,
        address: null,
        postal_code: null,
        city: sup.city,
        province: null,
        country: 'España',
        phone: null,
        email: null,
        website: null,
        contact_person: null,
        business_sector: 'Servicios',
        company_size: 'mediana',
        status: 'active',
        notes: null,
        created_at: new Date(),
        updated_at: new Date(),
        total_invoices: 0,
        total_amount: 0,
        last_invoice_date: null,
        first_detected_at: new Date(),
        last_updated_from_document: null
      });
    });

    // Crear clientes de ejemplo
    const customers = [
      { nif: 'E55667788', name: 'Retail Solutions S.L.', commercial: 'RetailSol', city: 'Sevilla' },
      { nif: 'F44556677', name: 'Restaurante El Buen Sabor', commercial: 'El Buen Sabor', city: 'Granada' }
    ];

    customers.forEach(cust => {
      const customerId = uuidv4();
      this.customers.set(customerId, {
        customer_id: customerId,
        nif_cif: cust.nif,
        name: cust.name,
        commercial_name: cust.commercial,
        address: null,
        postal_code: null,
        city: cust.city,
        province: null,
        country: 'España',
        phone: null,
        email: null,
        website: null,
        contact_person: null,
        customer_type: 'company',
        payment_terms: null,
        credit_limit: null,
        status: 'active',
        notes: null,
        created_at: new Date(),
        updated_at: new Date(),
        total_invoices: 0,
        total_amount: 0,
        last_invoice_date: null,
        first_detected_at: new Date(),
        last_updated_from_document: null
      });
    });
  }

  // Métodos para usuarios
  async getUserByEmail(email: string): Promise<User | null> {
    const users = Array.from(this.users.values());
    for (const user of users) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  async getUserById(userId: string): Promise<User | null> {
    return this.users.get(userId) || null;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Métodos para documentos
  async createDocument(data: Partial<Document>): Promise<Document> {
    const jobId = data.job_id || uuidv4();
    const document: Document = {
      id: this.documentIdCounter++,
      job_id: jobId,
      document_type: data.document_type || 'invoice',
      raw_json: data.raw_json || null,
      processed_json: data.processed_json || {},
      upload_timestamp: new Date(),
      user_id: data.user_id || null,
      status: data.status || 'pending',
      version: 1,
      supplier_id: data.supplier_id || null,
      customer_id: data.customer_id || null,
      emitter_name: data.emitter_name || null,
      receiver_name: data.receiver_name || null,
      document_date: data.document_date || null,
      total_amount: data.total_amount || null,
      tax_amount: data.tax_amount || null,
      title: data.title || null,
      file_path: data.file_path || null,
      processing_metadata: data.processing_metadata || null,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    this.documents.set(jobId, document);
    return document;
  }

  async getDocumentByJobId(jobId: string): Promise<Document | null> {
    return this.documents.get(jobId) || null;
  }

  async updateDocument(jobId: string, data: Partial<Document>): Promise<Document | null> {
    const document = this.documents.get(jobId);
    if (!document) return null;

    const updated = {
      ...document,
      ...data,
      updated_at: new Date(),
      version: document.version + 1
    };

    this.documents.set(jobId, updated);
    return updated;
  }

  async getAllDocuments(filters?: any): Promise<Document[]> {
    let documents = Array.from(this.documents.values());
    
    if (filters) {
      if (filters.status) {
        documents = documents.filter(d => d.status === filters.status);
      }
      if (filters.document_type) {
        documents = documents.filter(d => d.document_type === filters.document_type);
      }
      if (filters.date_from) {
        documents = documents.filter(d => d.created_at >= new Date(filters.date_from));
      }
      if (filters.date_to) {
        documents = documents.filter(d => d.created_at <= new Date(filters.date_to));
      }
    }

    return documents.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  }

  async deleteDocument(jobId: string): Promise<boolean> {
    return this.documents.delete(jobId);
  }

  // Métodos para proveedores
  async getAllSuppliers(): Promise<Supplier[]> {
    return Array.from(this.suppliers.values());
  }

  async getSupplierById(supplierId: string): Promise<Supplier | null> {
    return this.suppliers.get(supplierId) || null;
  }

  async createSupplier(data: Partial<Supplier>): Promise<Supplier> {
    const supplierId = uuidv4();
    const supplier: Supplier = {
      supplier_id: supplierId,
      nif_cif: data.nif_cif || null,
      name: data.name || '',
      commercial_name: data.commercial_name || null,
      address: data.address || null,
      postal_code: data.postal_code || null,
      city: data.city || null,
      province: data.province || null,
      country: data.country || 'España',
      phone: data.phone || null,
      email: data.email || null,
      website: data.website || null,
      contact_person: data.contact_person || null,
      business_sector: data.business_sector || null,
      company_size: data.company_size || 'mediana',
      status: data.status || 'active',
      notes: data.notes || null,
      created_at: new Date(),
      updated_at: new Date(),
      total_invoices: 0,
      total_amount: 0,
      last_invoice_date: null,
      first_detected_at: new Date(),
      last_updated_from_document: null
    };

    this.suppliers.set(supplierId, supplier);
    return supplier;
  }

  // Métodos para clientes
  async getAllCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values());
  }

  async getCustomerById(customerId: string): Promise<Customer | null> {
    return this.customers.get(customerId) || null;
  }

  // Métodos para auditoría
  async createAuditLog(data: Partial<AuditLog>): Promise<AuditLog> {
    const logId = uuidv4();
    const log: AuditLog = {
      log_id: logId,
      entity_type: data.entity_type || '',
      entity_id: data.entity_id || '',
      action: data.action || '',
      user_id: data.user_id || null,
      document_id: data.document_id || null,
      changes: data.changes || null,
      timestamp: new Date(),
      notes: data.notes || null
    };

    this.auditLogs.set(logId, log);
    return log;
  }

  async getAuditLogs(filters?: any): Promise<AuditLog[]> {
    let logs = Array.from(this.auditLogs.values());
    
    if (filters) {
      if (filters.entity_type) {
        logs = logs.filter(l => l.entity_type === filters.entity_type);
      }
      if (filters.entity_id) {
        logs = logs.filter(l => l.entity_id === filters.entity_id);
      }
    }

    return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Métodos para notificaciones
  async createNotification(data: Partial<Notification>): Promise<Notification> {
    const notificationId = uuidv4();
    const notification: Notification = {
      id: notificationId,
      user_id: data.user_id || '',
      type: data.type || 'info',
      title: data.title || '',
      message: data.message || '',
      read: false,
      created_at: new Date(),
      data: data.data || null
    };

    this.notifications.set(notificationId, notification);
    return notification;
  }

  async getNotificationsByUserId(userId: string): Promise<Notification[]> {
    const userNotifications = Array.from(this.notifications.values())
      .filter(n => n.user_id === userId)
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    
    return userNotifications;
  }

  async markNotificationAsRead(notificationId: string): Promise<boolean> {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.read = true;
      return true;
    }
    return false;
  }

  // Métodos para estadísticas del dashboard
  async getDashboardStats(): Promise<any> {
    const documents = Array.from(this.documents.values());
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);
    const thisMonth = new Date();
    thisMonth.setDate(thisMonth.getDate() - 30);

    return {
      total_documents: documents.length,
      documents_today: documents.filter(d => d.created_at >= today).length,
      documents_week: documents.filter(d => d.created_at >= thisWeek).length,
      documents_month: documents.filter(d => d.created_at >= thisMonth).length,
      by_type: {
        invoice: documents.filter(d => d.document_type === 'invoice').length,
        payroll: documents.filter(d => d.document_type === 'payroll').length,
        receipt: documents.filter(d => d.document_type === 'receipt').length,
        contract: documents.filter(d => d.document_type === 'contract').length
      },
      by_status: {
        pending: documents.filter(d => d.status === 'pending').length,
        processing: documents.filter(d => d.status === 'processing').length,
        completed: documents.filter(d => d.status === 'completed').length,
        error: documents.filter(d => d.status === 'error').length
      },
      total_suppliers: this.suppliers.size,
      total_customers: this.customers.size,
      processing_success_rate: documents.length > 0 
        ? (documents.filter(d => d.status === 'completed').length / documents.length * 100).toFixed(1)
        : 0
    };
  }

  // Métodos para plantillas de extracción
  async createExtractionTemplate(data: Partial<ExtractionTemplate>): Promise<ExtractionTemplate> {
    const templateId = uuidv4();
    const template: ExtractionTemplate = {
      template_id: templateId,
      name: data.name || '',
      description: data.description || null,
      document_type: data.document_type || 'invoice',
      supplier_id: data.supplier_id || null,
      customer_id: data.customer_id || null,
      extraction_rules: data.extraction_rules || {},
      confidence_threshold: data.confidence_threshold || 0.8,
      is_active: data.is_active !== false,
      usage_count: 0,
      success_rate: 0,
      last_used_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: data.created_by || ''
    };

    this.extractionTemplates.set(templateId, template);
    return template;
  }

  async getExtractionTemplateById(templateId: string): Promise<ExtractionTemplate | null> {
    return this.extractionTemplates.get(templateId) || null;
  }

  async getAllExtractionTemplates(filters?: any): Promise<ExtractionTemplate[]> {
    let templates = Array.from(this.extractionTemplates.values());
    
    if (filters) {
      if (filters.document_type) {
        templates = templates.filter(t => t.document_type === filters.document_type);
      }
      if (filters.supplier_id) {
        templates = templates.filter(t => t.supplier_id === filters.supplier_id);
      }
      if (filters.is_active !== undefined) {
        templates = templates.filter(t => t.is_active === filters.is_active);
      }
    }

    return templates.sort((a, b) => b.usage_count - a.usage_count);
  }

  async updateExtractionTemplate(templateId: string, data: Partial<ExtractionTemplate>): Promise<ExtractionTemplate | null> {
    const template = this.extractionTemplates.get(templateId);
    if (!template) return null;

    const updated = {
      ...template,
      ...data,
      updated_at: new Date()
    };

    this.extractionTemplates.set(templateId, updated);
    return updated;
  }

  async deleteExtractionTemplate(templateId: string): Promise<boolean> {
    return this.extractionTemplates.delete(templateId);
  }

  // Método para registrar uso de plantilla
  async recordTemplateUsage(templateId: string, success: boolean): Promise<void> {
    const template = this.extractionTemplates.get(templateId);
    if (!template) return;

    template.usage_count++;
    template.last_used_at = new Date();
    
    // Calcular nueva tasa de éxito
    const totalUses = template.usage_count;
    const currentSuccesses = Math.round((template.success_rate / 100) * (totalUses - 1));
    const newSuccesses = currentSuccesses + (success ? 1 : 0);
    template.success_rate = (newSuccesses / totalUses) * 100;

    this.extractionTemplates.set(templateId, template);
  }

  // Método para obtener mejor plantilla para un documento
  async getBestTemplateForDocument(documentType: string, supplierId?: string): Promise<ExtractionTemplate | null> {
    let templates = await this.getAllExtractionTemplates({
      document_type: documentType,
      is_active: true
    });

    // Si hay un proveedor específico, priorizar sus plantillas
    if (supplierId) {
      const supplierTemplates = templates.filter(t => t.supplier_id === supplierId);
      if (supplierTemplates.length > 0) {
        templates = supplierTemplates;
      }
    }

    // Ordenar por tasa de éxito y uso
    templates.sort((a, b) => {
      // Priorizar plantillas con más de 5 usos y alta tasa de éxito
      if (a.usage_count >= 5 && b.usage_count < 5) return -1;
      if (b.usage_count >= 5 && a.usage_count < 5) return 1;
      
      // Si ambas tienen suficientes usos, ordenar por tasa de éxito
      if (a.usage_count >= 5 && b.usage_count >= 5) {
        return b.success_rate - a.success_rate;
      }
      
      // Si ninguna tiene suficientes usos, ordenar por número de usos
      return b.usage_count - a.usage_count;
    });

    return templates[0] || null;
  }

  // Métodos para webhooks
  async createWebhook(data: Partial<Webhook>): Promise<Webhook> {
    const webhookId = data.id || uuidv4();
    const webhook: Webhook = {
      id: webhookId,
      event: data.event || '',
      source: data.source || 'unknown',
      status: data.status || 'received',
      payload: data.payload || {},
      response: data.response || null,
      error: data.error || null,
      timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      processed_at: data.processed_at ? new Date(data.processed_at) : null
    };

    this.webhooks.set(webhookId, webhook);
    return webhook;
  }

  async getWebhookById(webhookId: string): Promise<Webhook | null> {
    return this.webhooks.get(webhookId) || null;
  }

  async getAllWebhooks(filters?: any): Promise<Webhook[]> {
    let webhooks = Array.from(this.webhooks.values());
    
    if (filters) {
      if (filters.source) {
        webhooks = webhooks.filter(w => w.source === filters.source);
      }
      if (filters.event) {
        webhooks = webhooks.filter(w => w.event === filters.event);
      }
      if (filters.status) {
        webhooks = webhooks.filter(w => w.status === filters.status);
      }
    }

    return webhooks.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async updateWebhook(webhookId: string, data: Partial<Webhook>): Promise<Webhook | null> {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) return null;

    const updated = {
      ...webhook,
      ...data,
      processed_at: data.status === 'processed' || data.status === 'failed' ? new Date() : webhook.processed_at
    };

    this.webhooks.set(webhookId, updated);
    return updated;
  }

  async deleteWebhook(webhookId: string): Promise<boolean> {
    return this.webhooks.delete(webhookId);
  }

  // Métodos para configuración del sistema
  async getSystemConfiguration(): Promise<SystemConfiguration> {
    if (!this.systemConfiguration) {
      // Configuración por defecto
      this.systemConfiguration = {
        company: {
          name: 'Mi Gestoría',
          cif: '',
          address: '',
          phone: '',
          email: ''
        },
        apis: {
          mistral_api_key: process.env.MISTRAL_API_KEY || '',
          openai_api_key: process.env.OPENAI_API_KEY || '',
          openrouter_api_key: process.env.OPENROUTER_API_KEY || '',
          stripe_api_key: process.env.STRIPE_API_KEY || ''
        },
        notifications: {
          email_enabled: true,
          push_enabled: true,
          vencimientos_dias: 30,
          alertas_criticas: true
        },
        backup: {
          auto_backup_enabled: false,
          backup_frequency_days: 7,
          backup_retention_days: 30,
          backup_location: 'local'
        },
        advanced: {
          debug_mode: process.env.NODE_ENV === 'development',
          api_rate_limit: 100,
          max_file_size_mb: 10,
          allowed_file_types: ['pdf', 'jpg', 'jpeg', 'png'],
          ocr_language: 'es'
        }
      };
    }
    return this.systemConfiguration;
  }

  async updateSystemConfiguration(section: string, data: any): Promise<SystemConfiguration> {
    const currentConfig = await this.getSystemConfiguration();
    
    this.systemConfiguration = {
      ...currentConfig,
      [section]: { ...(currentConfig as any)[section], ...data }
    };

    return this.systemConfiguration;
  }

  async resetSystemConfiguration(): Promise<SystemConfiguration> {
    this.systemConfiguration = null;
    return await this.getSystemConfiguration();
  }

  // Método para obtener configuración segura (sin API keys para no-admin)
  async getSafeSystemConfiguration(isAdmin: boolean = false): Promise<SystemConfiguration> {
    const config = await this.getSystemConfiguration();
    
    if (!isAdmin) {
      return {
        ...config,
        apis: {
          mistral_api_key: config.apis.mistral_api_key ? '***' : '',
          openai_api_key: config.apis.openai_api_key ? '***' : '',
          openrouter_api_key: config.apis.openrouter_api_key ? '***' : '',
          stripe_api_key: config.apis.stripe_api_key ? '***' : ''
        }
      };
    }

    return config;
  }
}

// Instancia única de la base de datos en memoria
export const memoryDB = new MemoryDatabase();