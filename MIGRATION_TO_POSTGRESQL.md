# 🐘 MIGRACIÓN A POSTGRESQL LOCAL - GESTAGENT

## 📋 RESUMEN DE LA MIGRACIÓN

**Fecha**: 6 de Enero 2025  
**Motivo**: Problemas constantes con Supabase (Invalid API key, inestabilidad)  
**Solución**: PostgreSQL local para control total y estabilidad  

---

## 🚀 PASO 1: INSTALACIÓN POSTGRESQL

### Opción A: Instalador Oficial (Recomendado)
```bash
# Descargar desde: https://www.postgresql.org/download/windows/
# Versión recomendada: PostgreSQL 15.x o 16.x

# Durante la instalación:
# - Puerto: 5432 (default)
# - Usuario: postgres
# - Contraseña: [elegir una segura]
# - Base de datos por defecto: postgres
```

### Opción B: Via Chocolatey (si tienes choco instalado)
```powershell
choco install postgresql
```

### Opción C: Via Scoop
```powershell
scoop install postgresql
```

---

## 🔧 PASO 2: CONFIGURACIÓN INICIAL

### 2.1 Verificar Instalación
```powershell
# Verificar que PostgreSQL está corriendo
Get-Service -Name postgresql*

# Conectar a la base de datos
psql -U postgres -h localhost
```

### 2.2 Crear Base de Datos del Proyecto
```sql
-- Conectar como postgres
psql -U postgres -h localhost

-- Crear usuario específico para el proyecto
CREATE USER gestagent WITH PASSWORD 'gestagent123';

-- Crear base de datos
CREATE DATABASE gestagent_db OWNER gestagent;

-- Dar permisos
GRANT ALL PRIVILEGES ON DATABASE gestagent_db TO gestagent;

-- Conectar a la nueva BD
\c gestagent_db

-- Dar permisos en esquema public
GRANT ALL ON SCHEMA public TO gestagent;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO gestagent;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO gestagent;
```

---

## 📊 PASO 3: SCHEMA DE BASE DE DATOS

### 3.1 Script de Creación Completo
```sql
-- ========================================
-- GESTAGENT - SCHEMA POSTGRESQL LOCAL
-- ========================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- Para búsquedas texto

-- TABLA: users
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user' 
        CHECK (role IN ('admin', 'user', 'contable', 'gestor', 'supervisor', 'operador')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLA: suppliers (proveedores)
CREATE TABLE suppliers (
    supplier_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nif_cif VARCHAR(20) UNIQUE,
    name VARCHAR(255) NOT NULL,
    commercial_name VARCHAR(255),
    address TEXT,
    postal_code VARCHAR(10),
    city VARCHAR(100),
    province VARCHAR(100),
    country VARCHAR(100) DEFAULT 'España',
    phone VARCHAR(20),
    email VARCHAR(100),
    website VARCHAR(255),
    contact_person VARCHAR(100),
    business_sector VARCHAR(100),
    company_size VARCHAR(20) DEFAULT 'mediana'
        CHECK (company_size IN ('micro', 'pequeña', 'mediana', 'grande')),
    status VARCHAR(20) DEFAULT 'active' 
        CHECK (status IN ('active', 'inactive', 'blocked')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_invoices INTEGER DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0.00,
    last_invoice_date DATE,
    first_detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated_from_document UUID
);

-- TABLA: customers (clientes)
CREATE TABLE customers (
    customer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nif_cif VARCHAR(20) UNIQUE,
    name VARCHAR(255) NOT NULL,
    commercial_name VARCHAR(255),
    address TEXT,
    postal_code VARCHAR(10),
    city VARCHAR(100),
    province VARCHAR(100),
    country VARCHAR(100) DEFAULT 'España',
    phone VARCHAR(20),
    email VARCHAR(100),
    website VARCHAR(255),
    contact_person VARCHAR(100),
    customer_type VARCHAR(20) DEFAULT 'company' 
        CHECK (customer_type IN ('company', 'individual', 'freelancer', 'public')),
    payment_terms VARCHAR(50),
    credit_limit DECIMAL(12,2),
    status VARCHAR(20) DEFAULT 'active' 
        CHECK (status IN ('active', 'inactive', 'blocked')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_invoices INTEGER DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0.00,
    last_invoice_date DATE,
    first_detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated_from_document UUID
);

-- TABLA: documents (documentos)
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    job_id UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    document_type VARCHAR(50) NOT NULL,
    raw_json JSONB,
    processed_json JSONB NOT NULL,
    upload_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'completed'
        CHECK (status IN ('pending', 'processing', 'completed', 'error', 'cancelled')),
    version INTEGER DEFAULT 1,
    supplier_id UUID REFERENCES suppliers(supplier_id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(customer_id) ON DELETE SET NULL,
    emitter_name VARCHAR(255),
    receiver_name VARCHAR(255),
    document_date DATE,
    total_amount DECIMAL(12,2),
    tax_amount DECIMAL(12,2),
    title VARCHAR(255),
    file_path TEXT,
    processing_metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLA: audit_logs (auditoría)
CREATE TABLE audit_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(20) NOT NULL 
        CHECK (entity_type IN ('supplier', 'customer', 'document', 'user')),
    entity_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL 
        CHECK (action IN ('created', 'updated', 'deleted', 'merged', 'processed')),
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    document_id UUID REFERENCES documents(job_id) ON DELETE SET NULL,
    changes JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

-- ÍNDICES PARA RENDIMIENTO
CREATE INDEX idx_documents_job_id ON documents(job_id);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_date ON documents(document_date);
CREATE INDEX idx_documents_supplier ON documents(supplier_id);
CREATE INDEX idx_documents_customer ON documents(customer_id);
CREATE INDEX idx_documents_processed_json ON documents USING GIN(processed_json);

CREATE INDEX idx_suppliers_nif ON suppliers(nif_cif);
CREATE INDEX idx_suppliers_name ON suppliers USING GIN(name gin_trgm_ops);
CREATE INDEX idx_suppliers_status ON suppliers(status);

CREATE INDEX idx_customers_nif ON customers(nif_cif);
CREATE INDEX idx_customers_name ON customers USING GIN(name gin_trgm_ops);
CREATE INDEX idx_customers_status ON customers(status);

CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);

-- DATOS INICIALES
INSERT INTO users (username, email, role) VALUES 
('admin', 'admin@gestagent.com', 'admin'),
('demo', 'demo@gestagent.com', 'user')
ON CONFLICT (email) DO NOTHING;

-- FUNCIÓN PARA ACTUALIZAR updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- TRIGGERS PARA AUTO-UPDATE
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at 
    BEFORE UPDATE ON suppliers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON customers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at 
    BEFORE UPDATE ON documents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## 🔧 PASO 4: CONFIGURACIÓN DEL PROYECTO

### 4.1 Variables de Entorno (.env.local)
```env
# PostgreSQL Local Database
DATABASE_URL="postgresql://gestagent:gestagent123@localhost:5432/gestagent_db"
POSTGRES_HOST="localhost"
POSTGRES_PORT="5432"
POSTGRES_DB="gestagent_db"
POSTGRES_USER="gestagent"
POSTGRES_PASSWORD="gestagent123"

# Eliminar variables de Supabase (comentadas)
# NEXT_PUBLIC_SUPABASE_URL=""
# NEXT_PUBLIC_SUPABASE_ANON_KEY=""
# SUPABASE_SERVICE_ROLE_KEY=""

# APIs Externas (mantener)
MISTRAL_API_KEY="JITyrx8a7QaG8Wxj0XOqDRtgqmKUeOzr"
OPENROUTER_API_KEY="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"

# Auth (mantener)
NEXTAUTH_SECRET="tu-secret-aqui"
NEXTAUTH_URL="http://localhost:3000"
```

### 4.2 Dependencias NPM Necesarias
```bash
npm install pg @types/pg
npm install --save-dev @types/pg
```

---

## 📝 VENTAJAS DE LA MIGRACIÓN

### ✅ **Estabilidad Total**
- Sin dependencia de servicios externos
- Control completo sobre la base de datos
- Sin límites de API calls o timeouts

### ✅ **Rendimiento Mejorado**
- Conexiones directas sin latencia de red
- Consultas optimizadas con índices específicos
- Sin throttling de APIs externas

### ✅ **Flexibilidad Completa**
- Esquemas personalizados sin restricciones
- Funciones y triggers avanzados
- Extensiones PostgreSQL nativas

### ✅ **Desarrollo Más Rápido**
- Sin configuración compleja de credenciales
- Testing local sin límites
- Debugging completo de queries

---

## 🚨 SIGUIENTES PASOS

1. **Instalar PostgreSQL** ✅
2. **Configurar base de datos** ✅  
3. **Actualizar cliente de DB** ⏳
4. **Migrar APIs principales** ⏳
5. **Testing completo** ⏳
6. **Actualizar documentación** ⏳

---

Este enfoque nos dará la estabilidad que necesitamos para desarrollar sin interrupciones. 