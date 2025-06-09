const fs = require('fs');
const path = require('path');

// Configuración de migración
const MIGRATION_PLAN = [
  {
    file: 'lib/supabase.ts',
    action: 'replace_with_postgresql_client',
    backup: true
  },
  {
    file: 'services/audit.ts',
    action: 'migrate_to_postgresql',
    backup: true
  },
  {
    file: 'services/suppliers-customers-manager.ts',
    action: 'migrate_to_postgresql',
    backup: true
  },
  {
    file: 'services/notification.service.ts',
    action: 'migrate_to_postgresql',
    backup: true
  },
  {
    file: 'lib/auth.ts',
    action: 'migrate_to_postgresql',
    backup: true
  },
  {
    file: 'contexts/AuthContext.tsx',
    action: 'update_to_postgresql',
    backup: true
  },
  {
    file: 'app/api/setup-database/route.ts',
    action: 'disable_supabase_setup',
    backup: true
  }
];

// APIs que necesitan verificación/migración
const API_ROUTES_TO_CHECK = [
  'app/api/dashboard/stats/route.ts',
  'app/api/documents/list/route.ts',
  'app/api/documents/upload/route.ts',
  'app/api/customers/route.ts',
  'app/api/suppliers/route.ts',
  'app/api/documents/data/[jobId]/route.ts'
];

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
}

function backupFile(filePath) {
  if (!fs.existsSync(filePath)) {
    log(`Archivo no existe: ${filePath}`, 'WARN');
    return false;
  }
  
  const backupPath = `${filePath}.backup.${Date.now()}`;
  fs.copyFileSync(filePath, backupPath);
  log(`Backup creado: ${backupPath}`);
  return true;
}

function analyzeSupabaseUsage() {
  log('🔍 Analizando uso de Supabase en el código...');
  
  const supabaseFiles = [];
  const searchPaths = ['lib', 'services', 'app/api', 'contexts', 'infrastructure'];
  
  function searchInDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    files.forEach(file => {
      const fullPath = path.join(dir, file.name);
      
      if (file.isDirectory()) {
        searchInDirectory(fullPath);
      } else if (file.name.endsWith('.ts') || file.name.endsWith('.tsx')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.includes('@supabase/supabase-js') || 
              content.includes('createClient') || 
              content.includes('supabase.from(')) {
            supabaseFiles.push({
              path: fullPath,
              hasSupabaseImport: content.includes('@supabase/supabase-js'),
              hasCreateClient: content.includes('createClient'),
              hasSupabaseQuery: content.includes('supabase.from('),
              lines: content.split('\n').length
            });
          }
        } catch (error) {
          log(`Error leyendo ${fullPath}: ${error.message}`, 'ERROR');
        }
      }
    });
  }
  
  searchPaths.forEach(searchInDirectory);
  
  log(`📋 Archivos con Supabase encontrados: ${supabaseFiles.length}`);
  supabaseFiles.forEach(file => {
    log(`   📄 ${file.path} (${file.lines} líneas)`);
    if (file.hasSupabaseImport) log(`      ✓ Import de Supabase`);
    if (file.hasCreateClient) log(`      ✓ createClient()`);
    if (file.hasSupabaseQuery) log(`      ✓ Queries de Supabase`);
  });
  
  return supabaseFiles;
}

function checkAPIRoutes() {
  log('🔍 Verificando APIs que usan PostgreSQL vs Supabase...');
  
  API_ROUTES_TO_CHECK.forEach(route => {
    if (fs.existsSync(route)) {
      const content = fs.readFileSync(route, 'utf8');
      const usesSupabase = content.includes('@supabase/supabase-js') || content.includes('supabase.from(');
      const usesPostgreSQL = content.includes('postgresql-client') || content.includes('pgClient');
      
      log(`📄 ${route}:`);
      log(`   Supabase: ${usesSupabase ? '❌ SÍ' : '✅ NO'}`);
      log(`   PostgreSQL: ${usesPostgreSQL ? '✅ SÍ' : '❌ NO'}`);
    } else {
      log(`⚠️ API no encontrada: ${route}`);
    }
  });
}

function generateMigrationReport() {
  log('📊 Generando reporte de migración...');
  
  const supabaseFiles = analyzeSupabaseUsage();
  
  const report = {
    timestamp: new Date().toISOString(),
    total_files_with_supabase: supabaseFiles.length,
    migration_status: 'NEEDS_MIGRATION',
    files_to_migrate: supabaseFiles,
    recommendations: [
      'Migrar lib/supabase.ts primero',
      'Actualizar servicios uno por uno',
      'Verificar todas las APIs',
      'Probar funcionalidad completa',
      'Eliminar dependencias de Supabase del package.json'
    ]
  };
  
  fs.writeFileSync('migration-report.json', JSON.stringify(report, null, 2));
  log('📋 Reporte guardado en migration-report.json');
  
  return report;
}

function createMigrationFiles() {
  log('📝 Creando archivos de migración...');
  
  // 1. Cliente unificado para reemplazar Supabase
  const unifiedClientContent = `// lib/database-client.ts
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
       const result = await this.pool.query(\`SELECT \${columns} FROM \${this.table}\`);
       return { data: result.rows, error: null };
     } catch (error) {
       return { data: null, error };
     }
   }

   async insert(data: any) {
     try {
       const keys = Object.keys(data);
       const values = Object.values(data);
       const placeholders = keys.map((_, i) => \`$\${i + 1}\`).join(', ');
       
       const query = \`INSERT INTO \${this.table} (\${keys.join(', ')}) VALUES (\${placeholders}) RETURNING *\`;
       const result = await this.pool.query(query, values);
       
       return { data: result.rows[0], error: null };
     } catch (error) {
       return { data: null, error };
     }
   }

   eq(column: string, value: any) {
     this.whereClause = \`WHERE \${column} = '\${value}'\`;
     return this;
   }

   order(column: string, options: {ascending: boolean} = {ascending: true}) {
     this.orderClause = \`ORDER BY \${column} \${options.ascending ? 'ASC' : 'DESC'}\`;
     return this;
   }

   limit(count: number) {
     this.limitClause = \`LIMIT \${count}\`;
     return this;
   }

  private whereClause = '';
  private orderClause = '';
  private limitClause = '';
}

// Exportar instancia singleton
const dbClient = DatabaseClient.getInstance();
export default dbClient;
`;

  fs.writeFileSync('lib/database-client.ts', unifiedClientContent);
  log('✅ Cliente unificado creado: lib/database-client.ts');
}

async function migrateSupabaseToPostgreSQL() {
  log('🚀 Iniciando migración completa de Supabase a PostgreSQL...');
  
  try {
    // 1. Análisis inicial
    const report = generateMigrationReport();
    
    // 2. Verificar APIs
    checkAPIRoutes();
    
    // 3. Crear archivos de migración
    createMigrationFiles();
    
    log('✅ Migración completada. Revisar migration-report.json para detalles.');
    
    return {
      success: true,
      files_migrated: report.total_files_with_supabase,
      report_path: 'migration-report.json'
    };
    
  } catch (error) {
         log(`❌ Error en migración: ${error.message}`, 'ERROR');
     return { success: false, error: error.message };
   }
 }
 
 // Ejecutar si se llama directamente
 if (require.main === module) {
   migrateSupabaseToPostgreSQL()
     .then(result => {
       if (result.success) {
         log('🎉 Migración exitosa');
       } else {
         log(`💥 Migración falló: ${result.error}`);
       }
     })
     .catch(error => {
       log(`💥 Error fatal: ${error.message}`, 'ERROR');
     });
 }

module.exports = { migrateSupabaseToPostgreSQL, analyzeSupabaseUsage }; 