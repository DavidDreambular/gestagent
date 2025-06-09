// SQLite Client
import Database from 'better-sqlite3';
import path from 'path';

export interface QueryResult<T = any> {
  data: T[] | null;
  error: Error | null;
}

export class SQLiteClient {
  private db: Database.Database;

  constructor() {
    const dbPath = path.join(process.cwd(), 'data', 'gestagent.db');
    
    const fs = require('fs');
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    
    console.log('SQLite DB initialized:', dbPath);
    this.initializeSchema();
  }

  query<T = any>(sql: string, params: any[] = []): QueryResult<T> {
    try {
      if (sql.trim().toLowerCase().startsWith('select')) {
        const stmt = this.db.prepare(sql);
        const rows = stmt.all(...params) as T[];
        return { data: rows, error: null };
      } else {
        const stmt = this.db.prepare(sql);
        const result = stmt.run(...params);
        return { data: [result as any], error: null };
      }
    } catch (error) {
      console.error('SQLite Error:', error);
      return { data: null, error: error as Error };
    }
  }

  close(): void {
    this.db.close();
  }

  private initializeSchema(): void {
    try {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          user_id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'operador',
          is_active BOOLEAN NOT NULL DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_login DATETIME
        )
      `);

      this.db.exec(`
        CREATE TABLE IF NOT EXISTS documents (
          job_id TEXT PRIMARY KEY,
          document_type TEXT NOT NULL DEFAULT 'invoice',
          raw_json TEXT,
          processed_json TEXT,
          upload_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          user_id TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          version INTEGER DEFAULT 1,
          emitter_name TEXT,
          receiver_name TEXT,
          document_date DATE,
          title TEXT,
          file_path TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(user_id)
        )
      `);

      const adminExists = this.db.prepare(`SELECT COUNT(*) as count FROM users WHERE email = ?`).get('admin@gestagent.com') as { count: number };

      if (adminExists.count === 0) {
        this.db.prepare(`INSERT INTO users (user_id, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)`).run(
          '550e8400-e29b-41d4-a716-446655440000',
          'admin',
          'admin@gestagent.com',
          '$2b$12$56YqkU9xhCabFuLZqNAKiOCOsBGJ7IGLYx0lLKRZIYp2qDjTFqQL6',
          'admin'
        );
        console.log('Admin user created - Email: admin@gestagent.com - Password: admin123');
      }

      console.log('Schema initialized');
    } catch (error) {
      console.error('Schema error:', error);
    }
  }
}

export const sqliteClient = new SQLiteClient();
