# API v1 - Integración para Proveedores

## Introducción

La API v1 permite a los proveedores integrar sus sistemas con Gestagent para subir documentos, consultar el estado de procesamiento y recibir notificaciones en tiempo real.

### Características principales:
- Autenticación JWT con tokens de 24 horas
- Subida de documentos PDF hasta 10MB
- Consulta de estado y estadísticas
- Sistema de webhooks para notificaciones en tiempo real
- Rate limiting y seguridad por defecto

### URL Base
```
https://tu-gestagent.com/api/v1
```

## Autenticación

### Obtener Token de Acceso

```http
POST /api/v1/auth
Content-Type: application/json

{
  "email": "proveedor@empresa.com",
  "password": "tu_password"
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "proveedor@empresa.com",
    "providerId": "uuid",
    "providerName": "Tu Empresa SL",
    "userName": "Juan Pérez",
    "companyName": "Tu Empresa SL"
  },
  "expires": "2024-01-02T00:00:00Z",
  "tokenType": "Bearer"
}
```

### Verificar Token

```http
GET /api/v1/auth
Authorization: Bearer tu_token_aqui
```

### Usar el Token

Para todas las peticiones autenticadas, incluye el header:
```http
Authorization: Bearer tu_token_aqui
```

## Documentos

### Listar Documentos

```http
GET /api/v1/documents?limit=10&offset=0&status=completed
Authorization: Bearer tu_token_aqui
```

**Parámetros de consulta:**
- `limit`: Número de documentos por página (default: 10, max: 100)
- `offset`: Offset para paginación (default: 0)
- `status`: Filtrar por estado (`pending`, `processing`, `completed`, `error`)
- `start_date`: Fecha inicio (ISO string)
- `end_date`: Fecha fin (ISO string)

**Respuesta:**
```json
{
  "success": true,
  "documents": [
    {
      "id": "uuid",
      "type": "factura",
      "title": "Factura - FAC-001",
      "status": "completed",
      "uploadedAt": "2024-01-01T10:00:00Z",
      "metadata": {
        "documentNumber": "FAC-001",
        "description": "Factura de servicios",
        "fileName": "factura_001.pdf",
        "fileSize": 245760
      },
      "processingLog": [...]
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

### Subir Documento

```http
POST /api/v1/documents
Authorization: Bearer tu_token_aqui
Content-Type: multipart/form-data

file: [archivo PDF]
document_type: "factura"
document_number: "FAC-001"
description: "Factura de servicios enero 2024"
```

**Validaciones:**
- Solo archivos PDF
- Tamaño máximo: 10MB
- Campos requeridos: `file`, `document_type`, `document_number`

**Respuesta exitosa:**
```json
{
  "success": true,
  "document": {
    "id": "uuid",
    "type": "factura",
    "title": "factura - FAC-001",
    "status": "pending",
    "uploadedAt": "2024-01-01T10:00:00Z",
    "metadata": {
      "documentNumber": "FAC-001",
      "description": "Factura de servicios enero 2024",
      "fileName": "factura_001.pdf",
      "fileSize": 245760
    }
  },
  "message": "Documento subido exitosamente y en cola de procesamiento"
}
```

### Obtener Detalles de Documento

```http
GET /api/v1/documents/{id}
Authorization: Bearer tu_token_aqui
```

**Respuesta:**
```json
{
  "success": true,
  "document": {
    "id": "uuid",
    "type": "factura",
    "title": "Factura - FAC-001",
    "status": "completed",
    "uploadedAt": "2024-01-01T10:00:00Z",
    "metadata": {
      "documentNumber": "FAC-001",
      "description": "Factura de servicios",
      "fileName": "factura_001.pdf",
      "fileSize": 245760,
      "uploadedBy": "api_integration"
    },
    "processingLog": [
      {
        "step": "Archivo recibido",
        "status": "completed",
        "timestamp": "2024-01-01T10:00:00Z",
        "message": "El archivo se ha subido correctamente"
      }
    ],
    "extractedData": {
      "supplier": {
        "name": "Tu Empresa SL",
        "nif": "12345678A"
      },
      "documentInfo": {
        "number": "FAC-001",
        "type": "factura",
        "description": "Factura de servicios"
      }
    },
    "rawText": "Texto extraído del PDF..."
  }
}
```

### Actualizar Documento

```http
PATCH /api/v1/documents/{id}
Authorization: Bearer tu_token_aqui
Content-Type: application/json

{
  "description": "Nueva descripción",
  "metadata": {
    "categoria": "servicios",
    "prioridad": "alta"
  }
}
```

## Estadísticas

### Obtener Estadísticas

```http
GET /api/v1/stats?period=month
Authorization: Bearer tu_token_aqui
```

**Parámetros:**
- `period`: `today`, `week`, `month`, `year`, `all` (default: `all`)
- `start_date`: Fecha inicio personalizada (ISO string)
- `end_date`: Fecha fin personalizada (ISO string)

**Respuesta:**
```json
{
  "success": true,
  "stats": {
    "total": 150,
    "pending": 10,
    "processing": 5,
    "completed": 130,
    "error": 5,
    "byType": {
      "factura": 100,
      "recibo": 30,
      "nomina": 20
    },
    "recentActivity": [
      {
        "id": "uuid",
        "type": "factura",
        "number": "FAC-001",
        "status": "completed",
        "uploadedAt": "2024-01-01T10:00:00Z"
      }
    ],
    "period": {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-01-31T23:59:59Z"
    }
  }
}
```

## Webhooks

Los webhooks permiten recibir notificaciones en tiempo real sobre eventos de documentos.

### Eventos Soportados

- `document.uploaded`: Documento subido
- `document.processing`: Documento en procesamiento
- `document.processed`: Documento procesado exitosamente
- `document.error`: Error en el procesamiento
- `document.updated`: Documento actualizado

### Crear Webhook

```http
POST /api/v1/webhooks
Authorization: Bearer tu_token_aqui
Content-Type: application/json

{
  "url": "https://mi-sistema.com/webhook",
  "events": ["document.uploaded", "document.processed", "document.error"]
}
```

**Respuesta:**
```json
{
  "success": true,
  "webhook": {
    "id": "uuid",
    "url": "https://mi-sistema.com/webhook",
    "events": ["document.uploaded", "document.processed", "document.error"],
    "secretKey": "whsec_abc123...",
    "active": true,
    "createdAt": "2024-01-01T10:00:00Z"
  },
  "message": "Webhook creado exitosamente"
}
```

**Límites:**
- Máximo 5 webhooks por proveedor
- URL debe ser válida y accesible

### Listar Webhooks

```http
GET /api/v1/webhooks
Authorization: Bearer tu_token_aqui
```

### Payload de Webhook

Cuando ocurre un evento, se enviará un POST a tu URL con:

```json
{
  "event": "document.processed",
  "timestamp": "2024-01-01T10:30:00Z",
  "data": {
    "documentId": "uuid",
    "documentType": "factura",
    "documentNumber": "FAC-001",
    "status": "completed",
    "providerId": "uuid",
    "metadata": {
      "processedAt": "2024-01-01T10:30:00Z",
      "extractedFields": 15
    }
  }
}
```

### Verificación de Firma

Cada webhook incluye un header `X-Webhook-Signature` para verificar la autenticidad:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return `sha256=${expectedSignature}` === signature;
}

// Ejemplo de uso
const isValid = verifyWebhook(
  JSON.stringify(payload),
  req.headers['x-webhook-signature'],
  'tu_secret_key'
);
```

## Códigos de Respuesta

### Códigos HTTP

- `200`: Éxito
- `201`: Creado exitosamente
- `400`: Error en la petición
- `401`: No autenticado
- `404`: No encontrado
- `429`: Rate limit excedido
- `500`: Error interno del servidor

### Códigos de Error

```json
{
  "success": false,
  "error": "Descripción del error",
  "code": "ERROR_CODE"
}
```

**Códigos principales:**
- `UNAUTHORIZED`: Token inválido o faltante
- `INVALID_CREDENTIALS`: Credenciales incorrectas
- `MISSING_REQUIRED_FIELDS`: Faltan campos obligatorios
- `INVALID_FILE_TYPE`: Tipo de archivo no soportado
- `FILE_TOO_LARGE`: Archivo excede el límite de tamaño
- `PROVIDER_NOT_FOUND`: Proveedor no encontrado
- `DOCUMENT_NOT_FOUND`: Documento no encontrado
- `WEBHOOK_LIMIT_REACHED`: Límite de webhooks alcanzado
- `DATABASE_ERROR`: Error en la base de datos
- `INTERNAL_ERROR`: Error interno del servidor

## Rate Limiting

- **Autenticación**: 5 intentos por minuto por IP
- **Subida de documentos**: 10 documentos por minuto
- **Consultas**: 100 peticiones por minuto
- **Webhooks**: 1000 llamadas por hora

## Ejemplos de Integración

### cURL

```bash
# Autenticación
curl -X POST https://tu-gestagent.com/api/v1/auth \
  -H "Content-Type: application/json" \
  -d '{"email":"proveedor@empresa.com","password":"password123"}'

# Subir documento
curl -X POST https://tu-gestagent.com/api/v1/documents \
  -H "Authorization: Bearer tu_token_aqui" \
  -F "file=@factura.pdf" \
  -F "document_type=factura" \
  -F "document_number=FAC-001" \
  -F "description=Factura enero 2024"

# Listar documentos
curl -X GET "https://tu-gestagent.com/api/v1/documents?limit=5&status=completed" \
  -H "Authorization: Bearer tu_token_aqui"
```

### JavaScript/Node.js

```javascript
class GestagentAPI {
  constructor(baseUrl, email, password) {
    this.baseUrl = baseUrl;
    this.email = email;
    this.password = password;
    this.token = null;
  }

  async authenticate() {
    const response = await fetch(`${this.baseUrl}/api/v1/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: this.email,
        password: this.password
      })
    });

    const data = await response.json();
    if (data.success) {
      this.token = data.token;
      return data.user;
    }
    throw new Error(data.error);
  }

  async uploadDocument(file, documentType, documentNumber, description) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);
    formData.append('document_number', documentNumber);
    formData.append('description', description);

    const response = await fetch(`${this.baseUrl}/api/v1/documents`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.token}` },
      body: formData
    });

    return await response.json();
  }

  async getDocuments(options = {}) {
    const params = new URLSearchParams(options);
    const response = await fetch(`${this.baseUrl}/api/v1/documents?${params}`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });

    return await response.json();
  }

  async createWebhook(url, events) {
    const response = await fetch(`${this.baseUrl}/api/v1/webhooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({ url, events })
    });

    return await response.json();
  }
}

// Uso
const api = new GestagentAPI(
  'https://tu-gestagent.com',
  'proveedor@empresa.com',
  'password123'
);

await api.authenticate();
const result = await api.uploadDocument(file, 'factura', 'FAC-001', 'Factura enero');
```

### Python

```python
import requests
import json
from typing import List, Dict, Any

class GestagentAPI:
    def __init__(self, base_url: str, email: str, password: str):
        self.base_url = base_url
        self.email = email
        self.password = password
        self.token = None
        self.session = requests.Session()

    def authenticate(self) -> Dict[str, Any]:
        response = self.session.post(
            f"{self.base_url}/api/v1/auth",
            json={"email": self.email, "password": self.password}
        )
        
        data = response.json()
        if data.get("success"):
            self.token = data["token"]
            self.session.headers.update({
                "Authorization": f"Bearer {self.token}"
            })
            return data["user"]
        
        raise Exception(data.get("error", "Authentication failed"))

    def upload_document(self, file_path: str, document_type: str, 
                       document_number: str, description: str = "") -> Dict[str, Any]:
        with open(file_path, 'rb') as file:
            files = {'file': file}
            data = {
                'document_type': document_type,
                'document_number': document_number,
                'description': description
            }
            
            response = self.session.post(
                f"{self.base_url}/api/v1/documents",
                files=files,
                data=data
            )
            
        return response.json()

    def get_documents(self, **kwargs) -> Dict[str, Any]:
        response = self.session.get(
            f"{self.base_url}/api/v1/documents",
            params=kwargs
        )
        return response.json()

    def get_stats(self, period: str = "all") -> Dict[str, Any]:
        response = self.session.get(
            f"{self.base_url}/api/v1/stats",
            params={"period": period}
        )
        return response.json()

# Uso
api = GestagentAPI(
    "https://tu-gestagent.com",
    "proveedor@empresa.com", 
    "password123"
)

user = api.authenticate()
print(f"Autenticado como: {user['providerName']}")

# Subir documento
result = api.upload_document(
    "factura.pdf",
    "factura",
    "FAC-001",
    "Factura enero 2024"
)
print(f"Documento subido: {result['document']['id']}")

# Obtener estadísticas
stats = api.get_stats("month")
print(f"Documentos procesados este mes: {stats['stats']['total']}")
```

## Mejores Prácticas

### Seguridad
- Guarda el token de forma segura
- Regenera tokens regularmente
- Utiliza HTTPS siempre
- Verifica firmas de webhooks

### Performance
- Implementa retry logic para fallos temporales
- Usa paginación para listas grandes
- Cachea tokens válidos hasta su expiración

### Monitoring
- Monitorea respuestas de webhooks
- Registra errores de API
- Implementa health checks

### Errores Comunes
- **Token expirado**: Reautenticate automáticamente
- **Rate limit**: Implementa backoff exponencial
- **Archivo muy grande**: Valida tamaño antes de subir
- **Webhook caído**: Implementa cola de reintentos

## Soporte

Para soporte técnico o preguntas sobre la integración:
- Email: soporte@gestagent.com
- Documentación: https://docs.gestagent.com
- Status page: https://status.gestagent.com