# Mapeo de Campos para Exportación Sage

## Descripción General
Este documento detalla el mapeo de campos entre la estructura JSON de GestAgent y el formato requerido por Sage para importación de facturas.

## Estructura de Archivo Sage (.xls)

### Campos Obligatorios (en orden exacto):

| Campo Sage | Descripción | Tipo | Ejemplo | Origen GestAgent |
|------------|-------------|------|---------|------------------|
| Reg | Número registro secuencial | Número | 2400857 | Autogenerado |
| Serie | Serie de documento | Número | 0 | Fijo: 0 (facturas recibidas) |
| Número factura | Número de la factura | Texto | 24/11 | `processed_json.document_info.number` |
| Fecha factura | Fecha en formato DD/MM/YYYY | Fecha | 1/11/2024 | `processed_json.document_info.date` |
| NIF proveedor | CIF/NIF del emisor | Texto | 39121002A | `processed_json.emitter.tax_id` |
| Nombre proveedor | Razón social del emisor | Texto | JOSE MARTÍNEZ GARCIA | `processed_json.emitter.name` |
| Concepto | Descripción principal | Texto | LLOGUER NAU F- NOVEMBRE | `processed_json.line_items[0].description` |
| Total factura | Importe total | Decimal | 841,50 | `processed_json.totals.total` |
| Base imponible | Base gravable | Decimal | 825,00 | `processed_json.totals.tax_details[0].base` |
| %Iva1 | Porcentaje IVA 1 | Número | 21 | `processed_json.totals.tax_details[0].rate` |
| Importe impuesto | Cuota IVA 1 | Decimal | 173,25 | `processed_json.totals.tax_details[0].amount` |
| %RecEq1 | % Recargo equivalencia 1 | Número | | Vacío (no aplicable) |
| Cuota Rec1 | Cuota recargo 1 | Decimal | | Vacío (no aplicable) |
| Base Retención | Base para retención | Decimal | 825,00 | `processed_json.emitter.retention_base` |
| %Retención | Porcentaje retención | Número | 19,00 | `processed_json.emitter.retention_rate` |
| Cuota Retenc. | Cuota retención | Decimal | 156,75 | `processed_json.emitter.retention_amount` |
| Base Imponible2 | Base gravable 2 (si hay) | Decimal | | `processed_json.totals.tax_details[1].base` |
| %Iva2 | Porcentaje IVA 2 | Número | | `processed_json.totals.tax_details[1].rate` |
| Cuota Iva2 | Cuota IVA 2 | Decimal | | `processed_json.totals.tax_details[1].amount` |
| %RecEq2 | % Recargo equivalencia 2 | Número | | Vacío (no aplicable) |
| Cuota Rec2 | Cuota recargo 2 | Decimal | | Vacío (no aplicable) |
| Codigo Postal | CP del emisor | Texto | 08224 | `processed_json.emitter.postal_code` |
| Cod. Provincia | Código INE provincia | Texto | 08 | Calculado desde `emitter.province` |
| Provincia | Nombre de la provincia | Texto | Barcelona | Calculado desde `emitter.province` |

## Mapeo de Provincias INE

El sistema incluye mapeo automático de nombres de provincia a códigos INE:

```javascript
const SPANISH_PROVINCES = {
  'barcelona': { code: '08', name: 'Barcelona' },
  'madrid': { code: '28', name: 'Madrid' },
  'valencia': { code: '46', name: 'Valencia' },
  // ... más provincias
}
```

## Reglas de Formateo

### Números y Decimales
- **Separador decimal**: Coma (,) en lugar de punto (.)
- **Ejemplo**: 841.50 → 841,50

### Fechas
- **Formato**: DD/MM/YYYY
- **Ejemplo**: 2024-11-01 → 1/11/2024

### Texto
- **Encoding**: UTF-8
- **Longitud máxima concepto**: 100 caracteres
- **Tratamiento de caracteres especiales**: Mantenidos según UTF-8

## Consideraciones Especiales

### IVA Múltiple
Si una factura tiene múltiples tipos de IVA:
- Primer IVA: Campos %Iva1, Base imponible, Importe impuesto
- Segundo IVA: Campos %Iva2, Base Imponible2, Cuota Iva2

### Retenciones
- Las retenciones se calculan automáticamente si están presentes en el JSON
- Si no hay datos de retención, los campos quedan vacíos

### Concepto de Factura
- Se toma la descripción del primer line_item
- Si hay múltiples conceptos, se agrega "+ otros conceptos"
- Longitud limitada a 100 caracteres

## Ejemplo de Registro Completo

```
2400857 | 0 | 24/11 | 1/11/2024 | 39121002A | JOSE MARTÍNEZ GARCIA | LLOGUER NAU F- NOVEMBRE | 841,50 | 825,00 | 21 | 173,25 | | | 825,00 | 19,00 | 156,75 | | | | | | 08224 | 08 | Barcelona
```

## API de Exportación

### Endpoint
`POST /api/documents/export/sage`

### Parámetros
```json
{
  "filters": {
    "dateFrom": "2024-01-01",
    "dateTo": "2024-12-31",
    "supplierIds": ["supplier1", "supplier2"],
    "status": ["completed"]
  },
  "options": {
    "includePreview": false,
    "serieNumber": 2400857
  }
}
```

### Respuesta
- **Preview**: JSON con datos mapeados
- **Export**: Archivo .xls para descarga directa

## Troubleshooting

### Errores Comunes
1. **Provincia no encontrada**: Se mantiene el texto original
2. **Fecha inválida**: Se conserva el valor original
3. **Importe sin formato**: Se convierte a 0,00
4. **CIF vacío**: Se exporta campo vacío (verificar manualmente)

### Validaciones Recomendadas
- Verificar que todos los CIF sean válidos antes de importar
- Revisar que las fechas estén en rango fiscal correcto
- Comprobar que los importes tengan sentido contable