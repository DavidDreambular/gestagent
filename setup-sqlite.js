// setup-sqlite.js
// Script para configurar SQLite como alternativa a PostgreSQL

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

console.log('🗄️ CONFIGURACIÓN SQLITE - GESTAGENT');
console.log('=' .repeat(50));

// Crear directorio para la base de datos
const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir);
}

// Crear base de datos
const dbPath = path.join(dbDir, 'gestagent.db');
const db = new Database(dbPath);

console.log('✅ Base de datos SQLite creada en:', dbPath);

// Crear tablas
console.log('📊 Creando tablas...');

// Tabla de usuarios
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user', 'contable', 'gestor', 'supervisor', 'operador')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Tabla de proveedores
db.exec(`
  CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id TEXT PRIMARY KEY,
    nif_cif TEXT UNIQUE,
    name TEXT NOT NULL,
    commercial_name TEXT,
    address TEXT,
    postal_code TEXT,
    city TEXT,
    province TEXT,
    country TEXT DEFAULT 'España',
    phone TEXT,
    email TEXT,
    website TEXT,
    contact_person TEXT,
    business_sector TEXT,
    company_size TEXT DEFAULT 'mediana' CHECK (company_size IN ('micro', 'pequeña', 'mediana', 'grande')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_invoices INTEGER DEFAULT 0,
    total_amount REAL DEFAULT 0.00,
    last_invoice_date DATE,
    first_detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_updated_from_document TEXT
  );
`);

// Tabla de clientes
db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    customer_id TEXT PRIMARY KEY,
    nif_cif TEXT UNIQUE,
    name TEXT NOT NULL,
    commercial_name TEXT,
    address TEXT,
    postal_code TEXT,
    city TEXT,
    province TEXT,
    country TEXT DEFAULT 'España',
    phone TEXT,
    email TEXT,
    website TEXT,
    contact_person TEXT,
    customer_type TEXT DEFAULT 'company' CHECK (customer_type IN ('company', 'individual', 'freelancer', 'public')),
    payment_terms TEXT,
    credit_limit REAL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_invoices INTEGER DEFAULT 0,
    total_amount REAL DEFAULT 0.00,
    last_invoice_date DATE,
    first_detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_updated_from_document TEXT
  );
`);

// Tabla de documentos
db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT UNIQUE NOT NULL,
    document_type TEXT NOT NULL,
    raw_json TEXT,
    processed_json TEXT NOT NULL,
    upload_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'error', 'cancelled')),
    version INTEGER DEFAULT 1,
    supplier_id TEXT REFERENCES suppliers(supplier_id) ON DELETE SET NULL,
    customer_id TEXT REFERENCES customers(customer_id) ON DELETE SET NULL,
    emitter_name TEXT,
    receiver_name TEXT,
    document_date DATE,
    total_amount REAL,
    tax_amount REAL,
    title TEXT,
    file_path TEXT,
    processing_metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Tabla de auditoría
db.exec(`
  CREATE TABLE IF NOT EXISTS audit_logs (
    log_id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('supplier', 'customer', 'document', 'user')),
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'merged', 'processed')),
    user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
    document_id TEXT,
    changes TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
  );
`);

// Crear índices
console.log('🔍 Creando índices...');

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_documents_job_id ON documents(job_id);
  CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);
  CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
  CREATE INDEX IF NOT EXISTS idx_documents_date ON documents(document_date);
  CREATE INDEX IF NOT EXISTS idx_suppliers_nif ON suppliers(nif_cif);
  CREATE INDEX IF NOT EXISTS idx_customers_nif ON customers(nif_cif);
`);

// Insertar usuarios de prueba
console.log('👥 Creando usuarios de prueba...');

const hashedPassword = bcrypt.hashSync('password123', 10);
const uuidv4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const users = [
  { username: 'admin', email: 'admin@gestagent.com', role: 'admin' },
  { username: 'demo', email: 'demo@gestagent.com', role: 'user' },
  { username: 'contable', email: 'contable@gestagent.com', role: 'contable' },
  { username: 'gestor', email: 'gestor@gestagent.com', role: 'gestor' }
];

const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (user_id, username, email, password, role)
  VALUES (?, ?, ?, ?, ?)
`);

users.forEach(user => {
  insertUser.run(uuidv4(), user.username, user.email, hashedPassword, user.role);
});

console.log('✅ Usuarios creados');

// Insertar datos de ejemplo
console.log('📋 Insertando datos de ejemplo...');

// Proveedores
const suppliers = [
  { nif: 'A12345678', name: 'Tecnología Avanzada S.A.', commercial: 'TechnoAdvance', city: 'Madrid' },
  { nif: 'B87654321', name: 'Suministros Oficina Express', commercial: 'OfficeExpress', city: 'Barcelona' },
  { nif: 'C11223344', name: 'Servicios Contables López', commercial: 'ContaLópez', city: 'Valencia' }
];

const insertSupplier = db.prepare(`
  INSERT OR IGNORE INTO suppliers (supplier_id, nif_cif, name, commercial_name, city, business_sector)
  VALUES (?, ?, ?, ?, ?, ?)
`);

suppliers.forEach(sup => {
  insertSupplier.run(uuidv4(), sup.nif, sup.name, sup.commercial, sup.city, 'Servicios');
});

// Cerrar base de datos
db.close();

console.log('');
console.log('🎉 CONFIGURACIÓN COMPLETADA');
console.log('=' .repeat(50));
console.log('✅ Base de datos SQLite configurada');
console.log('✅ Tablas creadas correctamente');
console.log('✅ Usuarios de prueba creados');
console.log('✅ Datos de ejemplo insertados');
console.log('');
console.log('📝 Usuarios de prueba:');
console.log('   - admin@gestagent.com / password123');
console.log('   - demo@gestagent.com / password123');
console.log('   - contable@gestagent.com / password123');
console.log('   - gestor@gestagent.com / password123');
console.log('');