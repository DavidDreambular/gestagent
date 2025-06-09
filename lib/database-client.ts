// lib/database-client.ts
// Cliente unificado que reemplaza Supabase con PostgreSQL

import { Pool } from 'pg';

// Singleton para el cliente de base de datos
class DatabaseClient {
  private static instance: DatabaseClient;
  private pool: Pool;

  private constructor() {
    this.pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5433'),
      database: process.env.POSTGRES_DB || 'gestagent',
      user: process.env.POSTGRES_USER || 'gestagent_user',
      password: process.env.POSTGRES_PASSWORD || 'gestagent_pass_2024',
      max: parseInt(process.env.POSTGRES_MAX_CONNECTIONS || '20'),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  public static getInstance(): DatabaseClient {
    if (!DatabaseClient.instance) {
      DatabaseClient.instance = new DatabaseClient();
    }
    return DatabaseClient.instance;
  }

  // Interfaz compatible con Supabase
  async query(text: string, params?: any[]): Promise<{data: any, error: any}> {
    try {
      const result = await this.pool.query(text, params);
      return { data: result.rows, error: null };
    } catch (error) {
      console.error('Database query error:', error);
      return { data: null, error };
    }
  }

  // Métodos compatibles con Supabase
  from(table: string) {
    return new TableQuery(this.pool, table);
  }

  async end() {
    await this.pool.end();
  }
}

class TableQuery {
  constructor(private pool: Pool, private table: string) {}

     async select(columns = '*') {
     try {
       const result = await this.pool.query(`SELECT ${columns} FROM ${this.table}`);
       return { data: result.rows, error: null };
     } catch (error) {
       return { data: null, error };
     }
   }

   async insert(data: any) {
     try {
       const keys = Object.keys(data);
       const values = Object.values(data);
       const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
       
       const query = `INSERT INTO ${this.table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
       const result = await this.pool.query(query, values);
       
       return { data: result.rows[0], error: null };
     } catch (error) {
       return { data: null, error };
     }
   }

   eq(column: string, value: any) {
     this.whereClause = `WHERE ${column} = '${value}'`;
     return this;
   }

   order(column: string, options: {ascending: boolean} = {ascending: true}) {
     this.orderClause = `ORDER BY ${column} ${options.ascending ? 'ASC' : 'DESC'}`;
     return this;
   }

   limit(count: number) {
     this.limitClause = `LIMIT ${count}`;
     return this;
   }

  private whereClause = '';
  private orderClause = '';
  private limitClause = '';
}

// Exportar instancia singleton
const dbClient = DatabaseClient.getInstance();
export default dbClient;
