import { Pool, PoolClient } from 'pg';
import { dbAdapter } from './db-adapter';
import { memoryDB } from './memory-db';

// Inicializar el adaptador
dbAdapter.initialize().catch(console.error);

// Configuración de la conexión
const connectionPool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'gestagent',
  user: process.env.POSTGRES_USER || 'gestagent_user',
  password: process.env.POSTGRES_PASSWORD || 'gestagent_pass_2024',
  max: parseInt(process.env.POSTGRES_MAX_CONNECTIONS || '20'),
  idleTimeoutMillis: parseInt(process.env.POSTGRES_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.POSTGRES_CONNECTION_TIMEOUT || '2000'),
  ssl: process.env.POSTGRES_SSL === 'true' ? {
    rejectUnauthorized: process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED !== 'false'
  } : false
});

export interface PostgreSQLResponse<T = any> {
  data: T | null;
  error: Error | null;
  count?: number;
}

export interface DocumentRow {
  job_id: string;
  document_type: string;
  raw_json: any;
  processed_json: any;
  upload_timestamp: string;
  user_id: string;
  status: string;
  emitter_name?: string;
  receiver_name?: string;
  document_date?: string;
  version: number;
  title?: string;
  file_path?: string;
}

export interface UserRow {
  user_id: string;
  username: string;
  email: string;
  role: string;
  created_at: string;
}

export interface SupplierRow {
  id: string;
  name: string;
  tax_id: string;
  email?: string;
  phone?: string;
  address?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerRow {
  id: string;
  name: string;
  tax_id: string;
  email?: string;
  phone?: string;
  address?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export class PostgreSQLClient {
  public pool: Pool;

  constructor() {
    this.pool = connectionPool;
  }

  async query<T = any>(text: string, params?: any[]): Promise<PostgreSQLResponse<T[]>> {
    try {
      const start = Date.now();
      const result = await dbAdapter.query(text, params);
      const duration = Date.now() - start;
      
      const source = dbAdapter.isUsingPostgreSQL() ? 'PostgreSQL' : 'Memory';
      console.log(`📊 [${source}] Query executed in ${duration}ms`);
      
      return {
        data: result.rows as T[],
        error: null,
        count: result.rowCount || 0
      };
    } catch (error) {
      console.error('❌ [Database] Query error:', error);
      return {
        data: null,
        error: error as Error,
        count: 0
      };
    }
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getDocuments(filters: {
    status?: string;
    type?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<PostgreSQLResponse<DocumentRow[]>> {
    const { status, type, limit = 20, offset = 0 } = filters;

    let query = `
      SELECT job_id, document_type, raw_json, processed_json,
             upload_timestamp, user_id, status, emitter_name,
             receiver_name, document_date, version, title, file_path
      FROM documents
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (type) {
      query += ` AND document_type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    query += ` ORDER BY upload_timestamp DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    return this.query<DocumentRow>(query, params);
  }

  async getDocumentById(jobId: string): Promise<PostgreSQLResponse<DocumentRow>> {
    const result = await this.query<DocumentRow>(
      'SELECT * FROM documents WHERE job_id = $1',
      [jobId]
    );

    return {
      data: result.data?.[0] || null,
      error: result.error
    };
  }

  async insertDocument(document: Partial<DocumentRow>): Promise<PostgreSQLResponse<DocumentRow>> {
    const {
      job_id, document_type, raw_json, processed_json,
      user_id, status = 'processing', emitter_name,
      receiver_name, document_date, title, file_path
    } = document;

    const result = await this.query<DocumentRow>(
      `INSERT INTO documents
       (job_id, document_type, raw_json, processed_json, user_id, status,
        emitter_name, receiver_name, document_date, title, file_path)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [job_id, document_type, raw_json, processed_json, user_id, status,
       emitter_name, receiver_name, document_date, title, file_path]
    );

    return {
      data: result.data?.[0] || null,
      error: result.error
    };
  }

  async updateDocument(jobId: string, updates: Partial<DocumentRow>): Promise<PostgreSQLResponse<DocumentRow>> {
    const fields = Object.keys(updates).filter(key => key !== 'job_id');
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const values = [jobId, ...fields.map(field => updates[field as keyof DocumentRow])];

    const result = await this.query<DocumentRow>(
      `UPDATE documents SET ${setClause} WHERE job_id = $1 RETURNING *`,
      values
    );

    return {
      data: result.data?.[0] || null,
      error: result.error
    };
  }

  async getSuppliers(filters: {
    search?: string;
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<PostgreSQLResponse<SupplierRow[]>> {
    const { search, status = 'active', limit = 50, offset = 0 } = filters;
    
    let query = `
      SELECT supplier_id as id, name, nif_cif as tax_id, email, phone, address, status, created_at, updated_at
      FROM suppliers 
      WHERE status = $1
    `;
    const params: any[] = [status];
    let paramIndex = 2;

    if (search) {
      query += ` AND (name ILIKE $${paramIndex} OR nif_cif ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    return this.query<SupplierRow>(query, params);
  }

  async getSupplierById(id: string): Promise<PostgreSQLResponse<SupplierRow>> {
    const result = await this.query<SupplierRow>(
      'SELECT * FROM suppliers WHERE id = $1',
      [id]
    );
    
    return {
      data: result.data?.[0] || null,
      error: result.error
    };
  }

  async getCustomers(filters: {
    search?: string;
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<PostgreSQLResponse<CustomerRow[]>> {
    const { search, status = 'active', limit = 50, offset = 0 } = filters;
    
    let query = `
      SELECT customer_id as id, name, nif_cif as tax_id, email, phone, address, status, created_at, updated_at
      FROM customers 
      WHERE status = $1
    `;
    const params: any[] = [status];
    let paramIndex = 2;

    if (search) {
      query += ` AND (name ILIKE $${paramIndex} OR nif_cif ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    return this.query<CustomerRow>(query, params);
  }

  async getCustomerById(id: string): Promise<PostgreSQLResponse<CustomerRow>> {
    const result = await this.query<CustomerRow>(
      'SELECT * FROM customers WHERE id = $1',
      [id]
    );
    
    return {
      data: result.data?.[0] || null,
      error: result.error
    };
  }

  async getDashboardStats(): Promise<PostgreSQLResponse<any>> {
    try {
      const queries = await Promise.all([
        this.query('SELECT COUNT(*) as total FROM documents'),
        this.query(`SELECT COUNT(*) as today FROM documents WHERE DATE(upload_timestamp) = CURRENT_DATE`),
        this.query(`SELECT COUNT(*) as active FROM suppliers WHERE status = 'active'`),
        this.query(`SELECT COUNT(*) as active FROM customers WHERE status = 'active'`),
        this.query(`SELECT COUNT(*) as completed FROM documents WHERE status = 'completed'`),
        this.query(`SELECT COUNT(*) as processing FROM documents WHERE status = 'processing'`),
        this.query(`SELECT COUNT(*) as error FROM documents WHERE status = 'error'`),
        this.query(`SELECT COALESCE(SUM(CAST(processed_json->>'total_amount' AS DECIMAL)), 0) as total FROM documents WHERE processed_json->>'total_amount' IS NOT NULL`)
      ]);

      const stats = {
        totalDocuments: parseInt(queries[0].data?.[0]?.total || '0'),
        processedToday: parseInt(queries[1].data?.[0]?.today || '0'),
        activeSuppliers: parseInt(queries[2].data?.[0]?.active || '0'),
        activeCustomers: parseInt(queries[3].data?.[0]?.active || '0'),
        completedDocuments: parseInt(queries[4].data?.[0]?.completed || '0'),
        processingDocuments: parseInt(queries[5].data?.[0]?.processing || '0'),
        errorDocuments: parseInt(queries[6].data?.[0]?.error || '0'),
        totalAmount: parseFloat(queries[7].data?.[0]?.total || '0').toFixed(2),
        successRate: queries[0].data?.[0]?.total > 0 
          ? ((parseInt(queries[4].data?.[0]?.completed || '0') / parseInt(queries[0].data?.[0]?.total || '1')) * 100).toFixed(1)
          : '0',
        source: 'postgresql_real_data'
      };

      return {
        data: stats,
        error: null
      };
    } catch (error) {
      return {
        data: null,
        error: error as Error
      };
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      if (dbAdapter.isUsingPostgreSQL()) {
        const result = await this.query('SELECT NOW() as current_time, version() as pg_version');
        console.log('✅ [PostgreSQL] Conexión exitosa');
        console.log('📅 [PostgreSQL] Tiempo actual:', result.data?.[0]?.current_time);
        console.log('🐘 [PostgreSQL] Versión:', result.data?.[0]?.pg_version);
      } else {
        console.log('✅ [Memory DB] Base de datos en memoria activa');
        console.log('⚠️  Los datos se perderán al reiniciar el servidor');
      }
      return true;
    } catch (error) {
      console.error('❌ [Database] Error de conexión:', error);
      return false;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

// Instancia singleton
const postgresClient = new PostgreSQLClient();

// Exports principales (SIN DUPLICADOS)
export const postgresqlClient = postgresClient;
export const pool = postgresClient.pool;
export const testConnection = () => postgresClient.testConnection();
export const query = <T = any>(text: string, params?: any[]) => postgresClient.query<T>(text, params);

// Funciones específicas
export const getDocuments = (filters?: any) => postgresClient.getDocuments(filters);
export const getDocumentById = (jobId: string) => postgresClient.getDocumentById(jobId);
export const insertDocument = (document: Partial<DocumentRow>) => postgresClient.insertDocument(document);
export const updateDocument = (jobId: string, updates: Partial<DocumentRow>) => postgresClient.updateDocument(jobId, updates);
export const getSuppliers = (filters?: any) => postgresClient.getSuppliers(filters);
export const getSupplierById = (id: string) => postgresClient.getSupplierById(id);
export const getCustomers = (filters?: any) => postgresClient.getCustomers(filters);
export const getCustomerById = (id: string) => postgresClient.getCustomerById(id);
export const getDashboardStats = () => postgresClient.getDashboardStats();

export default postgresClient;

// Configuración de la conexión
