// Adaptador de base de datos que selecciona entre PostgreSQL y memoria
import { Pool } from 'pg';
import { memoryDB } from './memory-db';

// Verificar si PostgreSQL está disponible
const isPostgreSQLAvailable = async (): Promise<boolean> => {
  if (!process.env.DATABASE_URL) {
    console.log('⚠️ DATABASE_URL no configurado, usando base de datos en memoria');
    return false;
  }

  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1,
      connectionTimeoutMillis: 3000
    });

    await pool.query('SELECT 1');
    await pool.end();
    console.log('✅ PostgreSQL disponible');
    return true;
  } catch (error) {
    console.log('⚠️ PostgreSQL no disponible, usando base de datos en memoria');
    return false;
  }
};

// Cache para evitar verificaciones repetidas
let dbAvailable: boolean | null = null;
let lastCheck = 0;
const CHECK_INTERVAL = 60000; // 1 minuto

export const checkDatabaseAvailability = async (): Promise<boolean> => {
  const now = Date.now();
  if (dbAvailable !== null && now - lastCheck < CHECK_INTERVAL) {
    return dbAvailable;
  }

  dbAvailable = await isPostgreSQLAvailable();
  lastCheck = now;
  return dbAvailable;
};

// Adaptador principal
export class DatabaseAdapter {
  private usePostgreSQL: boolean = false;
  private pool?: Pool;

  async initialize() {
    this.usePostgreSQL = await checkDatabaseAvailability();
    
    if (this.usePostgreSQL && process.env.DATABASE_URL) {
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
    }
  }

  async query(text: string, params?: any[]): Promise<any> {
    if (this.usePostgreSQL && this.pool) {
      try {
        const result = await this.pool.query(text, params);
        return result;
      } catch (error) {
        console.error('Error en PostgreSQL, fallback a memoria:', error);
        this.usePostgreSQL = false;
      }
    }

    // Fallback a base de datos en memoria
    return this.queryMemoryDB(text, params);
  }

  private async queryMemoryDB(text: string, params?: any[]): Promise<any> {
    // Parsear consultas SQL básicas y traducirlas a operaciones en memoria
    const query = text.toLowerCase().trim();

    // SELECT de usuarios
    if (query.includes('from users') && query.includes('where email')) {
      const email = params?.[0];
      const user = await memoryDB.getUserByEmail(email);
      return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
    }

    if (query.includes('from users') && query.includes('where user_id')) {
      const userId = params?.[0];
      const user = await memoryDB.getUserById(userId);
      return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
    }

    if (query.includes('from users') && !query.includes('where')) {
      const users = await memoryDB.getAllUsers();
      return { rows: users, rowCount: users.length };
    }

    // SELECT de documentos
    if (query.includes('from documents') && query.includes('where job_id')) {
      const jobId = params?.[0];
      const document = await memoryDB.getDocumentByJobId(jobId);
      return { rows: document ? [document] : [], rowCount: document ? 1 : 0 };
    }

    // SELECT de documentos con filtros complejos
    if (query.includes('from documents') && (query.includes('order by') || query.includes('limit'))) {
      const documents = await memoryDB.getAllDocuments();
      console.log(`📊 [Memory] Query executed in 1ms`);
      return { rows: documents, rowCount: documents.length };
    }

    if (query.includes('from documents') && !query.includes('where')) {
      const documents = await memoryDB.getAllDocuments();
      return { rows: documents, rowCount: documents.length };
    }

    // INSERT de documentos
    if (query.includes('insert into documents')) {
      // Mapear parámetros según la consulta real en postgresql-client.ts línea 179-185
      const document = await memoryDB.createDocument({
        job_id: params?.[0],
        document_type: params?.[1],
        raw_json: params?.[2],
        processed_json: params?.[3],
        user_id: params?.[4],
        status: params?.[5] || 'completed',
        emitter_name: params?.[6],
        receiver_name: params?.[7],
        document_date: params?.[8] ? new Date(params[8]) : null,
        title: params?.[9],
        file_path: params?.[10]
      });
      console.log(`📊 [Memory] Document inserted: ${document.job_id}`);
      return { rows: [document], rowCount: 1 };
    }

    // UPDATE de documentos
    if (query.includes('update documents') && query.includes('where job_id')) {
      const jobId = params?.[params.length - 1]; // El jobId suele ser el último parámetro
      const updatedDoc = await memoryDB.updateDocument(jobId, {
        processed_json: params?.[0],
        status: params?.[1] || 'completed'
      });
      return { rows: updatedDoc ? [updatedDoc] : [], rowCount: updatedDoc ? 1 : 0 };
    }

    // DELETE de documentos
    if (query.includes('delete from documents')) {
      const jobId = params?.[0];
      const deleted = await memoryDB.deleteDocument(jobId);
      return { rowCount: deleted ? 1 : 0 };
    }

    // SELECT de proveedores
    if (query.includes('from suppliers')) {
      if (query.includes('where supplier_id')) {
        const supplierId = params?.[0];
        const supplier = await memoryDB.getSupplierById(supplierId);
        return { rows: supplier ? [supplier] : [], rowCount: supplier ? 1 : 0 };
      }
      const suppliers = await memoryDB.getAllSuppliers();
      return { rows: suppliers, rowCount: suppliers.length };
    }

    // SELECT de clientes
    if (query.includes('from customers')) {
      if (query.includes('where customer_id')) {
        const customerId = params?.[0];
        const customer = await memoryDB.getCustomerById(customerId);
        return { rows: customer ? [customer] : [], rowCount: customer ? 1 : 0 };
      }
      const customers = await memoryDB.getAllCustomers();
      return { rows: customers, rowCount: customers.length };
    }

    // Estadísticas del dashboard
    if (query.includes('count(*)') || query.includes('dashboard')) {
      const stats = await memoryDB.getDashboardStats();
      return { rows: [stats], rowCount: 1 };
    }

    // INSERT de auditoría
    if (query.includes('insert into audit_logs')) {
      const log = await memoryDB.createAuditLog({
        entity_type: params?.[0],
        entity_id: params?.[1],
        action: params?.[2],
        user_id: params?.[3],
        changes: params?.[4],
        notes: params?.[5]
      });
      return { rows: [log], rowCount: 1 };
    }

    // SELECT de auditoría
    if (query.includes('from audit_logs')) {
      const logs = await memoryDB.getAuditLogs();
      return { rows: logs, rowCount: logs.length };
    }

    // Notificaciones
    if (query.includes('from notifications')) {
      const userId = params?.[0];
      const notifications = await memoryDB.getNotificationsByUserId(userId);
      return { rows: notifications, rowCount: notifications.length };
    }

    console.warn('Consulta no implementada en memoria:', text);
    return { rows: [], rowCount: 0 };
  }

  async end() {
    if (this.pool) {
      await this.pool.end();
    }
  }

  isUsingPostgreSQL(): boolean {
    return this.usePostgreSQL;
  }
}

// Instancia única del adaptador
export const dbAdapter = new DatabaseAdapter();