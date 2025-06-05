# 📡 API Reference - GestAgent V3.1

## 📚 **Índice**
1. [Autenticación](#autenticación)
2. [Gestión de Documentos](#gestión-de-documentos)
3. [Gestión de Usuarios](#gestión-de-usuarios)
4. [Proveedores y Clientes](#proveedores-y-clientes)
5. [Notificaciones](#notificaciones)
6. [Reportes](#reportes)
7. [Códigos de Estado](#códigos-de-estado)
8. [Tipos de Datos](#tipos-de-datos)

---

## 🔐 **Autenticación**

### **POST /api/auth/register**
Registra un nuevo usuario en el sistema.

```typescript
// Request
{
  "username": "string",
  "email": "string", 
  "password": "string",
  "role": "admin" | "contable" | "gestor" | "operador" | "supervisor"
}

// Response 201
{
  "success": true,
  "user": {
    "user_id": "uuid",
    "username": "string",
    "email": "string",
    "role": "string",
    "created_at": "datetime"
  }
}

// Response 400
{
  "error": "Email already exists" | "Invalid role" | "Password too weak"
}
```

### **POST /api/auth/login**
Inicia sesión de usuario.

```typescript
// Request
{
  "email": "string",
  "password": "string"
}

// Response 200
{
  "success": true,
  "user": {
    "user_id": "uuid",
    "username": "string", 
    "email": "string",
    "role": "string"
  },
  "session": {
    "access_token": "jwt_token",
    "expires_at": "datetime"
  }
}

// Response 401
{
  "error": "Invalid credentials"
}
```

### **GET /api/auth/user**
Obtiene información del usuario autenticado.

```typescript
// Headers
Authorization: Bearer <jwt_token>

// Response 200
{
  "user": {
    "user_id": "uuid",
    "username": "string",
    "email": "string", 
    "role": "string",
    "created_at": "datetime",
    "last_login": "datetime"
  }
}

// Response 401
{
  "error": "Unauthorized"
}
```

---

## 📄 **Gestión de Documentos**

### **POST /api/documents/upload**
Sube un documento PDF para procesamiento.

```typescript
// Request (multipart/form-data)
{
  "file": File, // PDF file
  "document_type": "factura" | "nomina" | "recibo"
}

// Response 201
{
  "success": true,
  "job_id": "uuid",
  "status": "processing",
  "message": "Document uploaded successfully"
}

// Response 400
{
  "error": "Invalid file type" | "File too large" | "Missing required fields"
}
```

### **GET /api/documents/data/[jobId]**
Obtiene los datos procesados de un documento.

```typescript
// Response 200
{
  "job_id": "uuid",
  "document_type": "string",
  "status": "completed" | "processing" | "error",
  "processed_json": {
    "emitter": {
      "name": "string",
      "address": "string",
      "tax_id": "string"
    },
    "receiver": {
      "name": "string", 
      "address": "string",
      "tax_id": "string"
    },
    "document": {
      "type": "string",
      "number": "string",
      "date": "date",
      "due_date": "date"
    },
    "items": [
      {
        "description": "string",
        "quantity": "number",
        "unit_price": "number",
        "total": "number"
      }
    ],
    "totals": {
      "subtotal": "number",
      "tax": "number", 
      "total": "number"
    }
  },
  "upload_timestamp": "datetime",
  "user_id": "uuid"
}

// Response 404
{
  "error": "Document not found"
}
```

### **GET /api/documents/list**
Lista todos los documentos del usuario.

```typescript
// Query Parameters
?page=1&limit=20&status=completed&document_type=factura&search=company

// Response 200
{
  "documents": [
    {
      "job_id": "uuid",
      "document_type": "string",
      "status": "string",
      "emitter_name": "string",
      "receiver_name": "string", 
      "document_date": "date",
      "total_amount": "number",
      "upload_timestamp": "datetime"
    }
  ],
  "pagination": {
    "page": "number",
    "limit": "number",
    "total": "number",
    "total_pages": "number"
  }
}
```

### **PUT /api/documents/update/[jobId]**
Actualiza los datos de un documento.

```typescript
// Request
{
  "processed_json": {
    // Estructura de documento actualizada
  }
}

// Response 200
{
  "success": true,
  "message": "Document updated successfully"
}

// Response 404
{
  "error": "Document not found"
}
```

### **DELETE /api/documents/[jobId]**
Elimina un documento.

```typescript
// Response 200
{
  "success": true,
  "message": "Document deleted successfully"
}

// Response 404
{
  "error": "Document not found"
}
```

### **POST /api/documents/bulk-delete**
Elimina múltiples documentos.

```typescript
// Request
{
  "document_ids": ["uuid1", "uuid2", "uuid3"]
}

// Response 200
{
  "success": true,
  "deleted_count": "number",
  "message": "Documents deleted successfully"
}
```

### **POST /api/documents/export/[jobId]**
Exporta un documento en formato específico.

```typescript
// Query Parameters
?format=csv|excel|json

// Response 200
{
  "success": true,
  "download_url": "string",
  "filename": "string"
}
```

### **POST /api/documents/bulk-export**
Exporta múltiples documentos.

```typescript
// Request
{
  "document_ids": ["uuid1", "uuid2"],
  "format": "csv" | "excel" | "json"
}

// Response 200
{
  "success": true,
  "download_url": "string",
  "filename": "string"
}
```

---

## 👥 **Gestión de Usuarios**

### **GET /api/users**
Lista todos los usuarios (solo administradores).

```typescript
// Query Parameters
?role=admin&status=active&search=john

// Response 200
{
  "users": [
    {
      "user_id": "uuid",
      "username": "string",
      "email": "string",
      "role": "string",
      "status": "active" | "inactive" | "pending",
      "created_at": "datetime",
      "last_login": "datetime",
      "department": "string"
    }
  ],
  "total": "number"
}
```

### **PUT /api/users/[userId]**
Actualiza un usuario.

```typescript
// Request
{
  "username": "string",
  "email": "string", 
  "role": "string",
  "status": "string",
  "department": "string"
}

// Response 200
{
  "success": true,
  "message": "User updated successfully"
}
```

### **DELETE /api/users/[userId]**
Elimina un usuario.

```typescript
// Response 200
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

## 🏢 **Proveedores y Clientes**

### **GET /api/suppliers**
Lista todos los proveedores.

```typescript
// Response 200
{
  "suppliers": [
    {
      "id": "uuid",
      "name": "string",
      "email": "string",
      "phone": "string",
      "address": "string",
      "sector": "string",
      "status": "string",
      "document_count": "number",
      "total_amount": "number"
    }
  ]
}
```

### **GET /api/suppliers/[id]**
Obtiene detalles de un proveedor específico.

```typescript
// Response 200
{
  "supplier": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "phone": "string", 
    "address": "string",
    "sector": "string",
    "status": "string",
    "created_at": "datetime"
  },
  "documents": [
    {
      "job_id": "uuid",
      "document_type": "string",
      "document_date": "date",
      "total_amount": "number",
      "status": "string"
    }
  ],
  "statistics": {
    "total_documents": "number",
    "total_amount": "number",
    "last_document": "datetime"
  }
}
```

### **GET /api/customers**
Lista todos los clientes.

```typescript
// Response 200
{
  "customers": [
    {
      "id": "uuid",
      "name": "string",
      "email": "string",
      "phone": "string",
      "address": "string",
      "type": "string",
      "status": "string",
      "document_count": "number"
    }
  ]
}
```

### **GET /api/customers/[id]**
Obtiene detalles de un cliente específico.

```typescript
// Response 200
{
  "customer": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "phone": "string",
    "address": "string", 
    "type": "string",
    "status": "string",
    "created_at": "datetime"
  },
  "documents": [
    {
      "job_id": "uuid",
      "document_type": "string",
      "document_date": "date",
      "total_amount": "number",
      "status": "string"
    }
  ],
  "statistics": {
    "total_documents": "number",
    "total_amount": "number",
    "last_activity": "datetime"
  }
}
```

---

## 🔔 **Notificaciones**

### **GET /api/notifications**
Obtiene las notificaciones del usuario.

```typescript
// Query Parameters
?unread=true&category=document&priority=high

// Response 200
{
  "notifications": [
    {
      "id": "uuid",
      "type": "info" | "warning" | "error" | "success",
      "title": "string",
      "message": "string",
      "timestamp": "datetime",
      "read": "boolean",
      "priority": "high" | "medium" | "low",
      "category": "document" | "payment" | "deadline" | "system" | "client",
      "actionRequired": "boolean"
    }
  ],
  "statistics": {
    "total": "number",
    "unread": "number",
    "action_required": "number"
  }
}
```

### **PUT /api/notifications/[id]/read**
Marca una notificación como leída.

```typescript
// Response 200
{
  "success": true,
  "message": "Notification marked as read"
}
```

### **PUT /api/notifications/mark-all-read**
Marca todas las notificaciones como leídas.

```typescript
// Response 200
{
  "success": true,
  "marked_count": "number",
  "message": "All notifications marked as read"
}
```

---

## 📊 **Reportes**

### **GET /api/reports/dashboard**
Obtiene estadísticas para el dashboard.

```typescript
// Response 200
{
  "document_stats": {
    "total": "number",
    "completed": "number",
    "processing": "number",
    "errors": "number"
  },
  "financial_stats": {
    "total_amount": "number",
    "monthly_growth": "number",
    "average_amount": "number"
  },
  "user_stats": {
    "total_users": "number",
    "active_users": "number"
  },
  "supplier_stats": {
    "total_suppliers": "number",
    "active_suppliers": "number"
  },
  "customer_stats": {
    "total_customers": "number",
    "active_customers": "number"
  }
}
```

### **GET /api/reports/documents**
Reporte detallado de documentos.

```typescript
// Query Parameters
?start_date=2024-01-01&end_date=2024-12-31&document_type=factura

// Response 200
{
  "summary": {
    "total_documents": "number",
    "total_amount": "number",
    "by_type": {
      "factura": "number",
      "nomina": "number",
      "recibo": "number"
    },
    "by_status": {
      "completed": "number",
      "processing": "number",
      "error": "number"
    }
  },
  "monthly_breakdown": [
    {
      "month": "string",
      "count": "number",
      "amount": "number"
    }
  ]
}
```

---

## 📋 **Códigos de Estado**

| Código | Descripción |
|--------|-------------|
| 200 | OK - Solicitud exitosa |
| 201 | Created - Recurso creado exitosamente |
| 400 | Bad Request - Solicitud inválida |
| 401 | Unauthorized - No autenticado |
| 403 | Forbidden - Sin permisos |
| 404 | Not Found - Recurso no encontrado |
| 422 | Unprocessable Entity - Error de validación |
| 500 | Internal Server Error - Error del servidor |

---

## 🏷️ **Tipos de Datos**

### **Document**
```typescript
interface Document {
  job_id: string;
  document_type: 'factura' | 'nomina' | 'recibo';
  status: 'processing' | 'completed' | 'error';
  raw_json?: any;
  processed_json: ProcessedDocument;
  upload_timestamp: string;
  user_id: string;
  emitter_name?: string;
  receiver_name?: string;
  document_date?: string;
  total_amount?: number;
  version: number;
}
```

### **ProcessedDocument**
```typescript
interface ProcessedDocument {
  emitter: {
    name: string;
    address: string;
    tax_id: string;
  };
  receiver: {
    name: string;
    address: string;
    tax_id: string;
  };
  document: {
    type: string;
    number: string;
    date: string;
    due_date?: string;
  };
  items: DocumentItem[];
  totals: {
    subtotal: number;
    tax: number;
    total: number;
  };
}
```

### **DocumentItem**
```typescript
interface DocumentItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  tax_rate?: number;
}
```

### **User**
```typescript
interface User {
  user_id: string;
  username: string;
  email: string;
  role: 'admin' | 'contable' | 'gestor' | 'operador' | 'supervisor';
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
  last_login?: string;
  phone?: string;
  department?: string;
}
```

### **Notification**
```typescript
interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: 'high' | 'medium' | 'low';
  category: 'document' | 'payment' | 'deadline' | 'system' | 'client';
  actionRequired: boolean;
}
```

---

## 🔗 **Ejemplos de Uso**

### **Flujo completo de procesamiento de documento**
```bash
# 1. Subir documento
curl -X POST http://localhost:3000/api/documents/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@factura.pdf" \
  -F "document_type=factura"

# 2. Verificar estado del procesamiento
curl -X GET http://localhost:3000/api/documents/data/{{job_id}} \
  -H "Authorization: Bearer <token>"

# 3. Listar documentos
curl -X GET http://localhost:3000/api/documents/list \
  -H "Authorization: Bearer <token>"

# 4. Exportar documento
curl -X POST http://localhost:3000/api/documents/export/{{job_id}}?format=csv \
  -H "Authorization: Bearer <token>"
```

---

**Mantenido por**: Equipo de Desarrollo GestAgent  
**Última actualización**: 19 de Diciembre, 2024 