# API Routes de Documentos

Este directorio contiene las rutas API para la gestión de documentos en GESTAGENT.

## Endpoints Disponibles

### 1. Upload de Documentos
- **Endpoint**: `POST /api/documents/upload`
- **Autenticación**: Requerida (header `user-id` o sesión)
- **Content-Type**: `multipart/form-data`
- **Campos**:
  - `file`: Archivo PDF (requerido)
  - `documentType`: Tipo de documento (opcional, default: 'factura')
    - Valores: 'factura', 'nomina', 'recibo', 'extracto', 'balance'
- **Respuesta**: 
  ```json
  {
    "success": true,
    "jobId": "uuid",
    "message": "Documento recibido y procesamiento iniciado",
    "fileName": "documento.pdf",
    "fileSize": 12345,
    "documentType": "factura"
  }
  ```

### 2. Listar Documentos
- **Endpoint**: `GET /api/documents`
- **Autenticación**: Requerida
- **Parámetros Query**:
  - `status`: Filtrar por estado
  - `type`: Filtrar por tipo de documento
  - `limit`: Número de resultados (default: 20)
  - `offset`: Offset para paginación (default: 0)
- **Respuesta**:
  ```json
  {
    "documents": [...],
    "pagination": {
      "total": 100,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
  ```

### 3. Obtener Documento
- **Endpoint**: `GET /api/documents/[jobId]`
- **Autenticación**: Requerida
- **Respuesta**: Documento completo con datos procesados

### 4. Actualizar Documento
- **Endpoint**: `PUT /api/documents/[jobId]`
- **Autenticación**: Requerida
- **Body**:
  ```json
  {
    "processedData": {...},
    "metadata": {...}
  }
  ```

### 5. Eliminar Documento
- **Endpoint**: `DELETE /api/documents/[jobId]`
- **Autenticación**: Requerida
- **Nota**: Soft delete (marca como eliminado)

### 6. Exportar Documentos
- **Endpoint**: `POST /api/documents/export`
- **Autenticación**: Requerida
- **Body**:
  ```json
  {
    "documentIds": ["jobId1", "jobId2"],
    "format": "csv" | "xlsx",
    "includeProcessedData": true
  }
  ```
- **Respuesta**: Archivo descargable en el formato solicitado

## Flujo de Procesamiento

1. **Upload**: El usuario sube un PDF
2. **OCR**: Mistral extrae texto y estructura básica
3. **Validación**: OpenRouter/Llama valida y estructura los datos
4. **Traducción**: Si es necesario, traduce de catalán a español
5. **Almacenamiento**: Guarda en Supabase con metadatos

## Estados de Documento

- `UPLOADED`: Recién subido, pendiente de procesamiento
- `PROCESSING`: En proceso de OCR/validación
- `PROCESSED`: Procesamiento completado exitosamente
- `ERROR`: Error durante el procesamiento
- `DELETED`: Marcado como eliminado (soft delete)

## Manejo de Errores

Todos los endpoints devuelven errores estructurados:
```json
{
  "error": "Mensaje de error para el usuario",
  "details": "Detalles técnicos (solo en desarrollo)"
}
```

Códigos HTTP comunes:
- `200`: Éxito
- `202`: Aceptado (procesamiento iniciado)
- `400`: Solicitud inválida
- `401`: No autorizado
- `403`: Prohibido (sin permisos)
- `404`: No encontrado
- `408`: Timeout
- `500`: Error interno
- `503`: Servicio no disponible

## Testing

Para probar las API Routes:

```bash
# Test unitario de rutas
npm run test:api

# Test con archivo real
curl -X POST http://localhost:3000/api/documents/upload \
  -H "user-id: test-user-123" \
  -F "file=@test.pdf" \
  -F "documentType=factura"
```

## Seguridad

- Autenticación requerida en todos los endpoints
- Validación de permisos por usuario
- Límite de tamaño de archivo: 10MB
- Solo se aceptan archivos PDF
- Sanitización de entrada en todos los campos
