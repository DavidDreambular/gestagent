# 🧪 Guía de Testing - Sistema de Gestión de Duplicados

## 📋 Resumen de Tests Implementados

### 1. **Tests Unitarios** (`/tests/duplicate-detection.test.ts`)

#### Cobertura de Funcionalidades:
- ✅ Detección de duplicados por NIF/CIF exacto
- ✅ Detección por similitud de nombres
- ✅ Manejo de múltiples coincidencias
- ✅ Validación de NIF/CIF españoles
- ✅ Normalización de datos (nombres, teléfonos)
- ✅ Fusión de entidades
- ✅ Procesamiento por lotes
- ✅ Sugerencias de fusión inteligentes

#### Casos de Prueba Principales:
```typescript
// Ejemplo de test de detección
it('debe detectar duplicados por NIF exacto', async () => {
  const result = await duplicateService.findDuplicateSupplier({
    name: 'Empresa Test S.L.',
    nif_cif: 'B12345678'
  });
  expect(result.isDuplicate).toBe(true);
  expect(result.confidence).toBe('high');
});
```

### 2. **Tests de Integración** (`/tests/integration/duplicate-api.test.ts`)

#### APIs Testeadas:
- 📍 `POST /api/entities/merge` - Fusión de entidades
- 📍 `GET /api/entities/merge` - Sugerencias de fusión
- 📍 `GET /api/duplicates/suggestions` - Lista de duplicados
- 📍 `PUT /api/duplicates/suggestions` - Actualizar sugerencias
- 📍 `POST /api/invoices/link` - Vincular facturas

#### Validaciones:
- ✅ Permisos de usuario (admin/manager)
- ✅ Validación de parámetros
- ✅ Manejo de errores
- ✅ Transacciones atómicas

### 3. **Tests E2E** (`/tests/e2e/duplicate-management.spec.ts`)

#### Flujos Completos Testeados:
1. **Detección en Carga**
   - Subir factura con proveedor duplicado
   - Opciones de usar existente o crear nuevo
   - Vinculación automática

2. **Panel de Duplicados**
   - Visualización de sugerencias
   - Fusión individual y masiva
   - Ignorar sugerencias
   - Filtros por tipo

3. **Historial de Facturas**
   - Ver historial en proveedores/clientes
   - Exportar a CSV
   - Navegación entre documentos

4. **Procesamiento por Lotes**
   - Carga múltiple de facturas
   - Detección masiva de duplicados
   - Acciones en bloque

## 🚀 Ejecutar Tests

### Tests Unitarios
```bash
# Ejecutar todos los tests unitarios
npm test tests/duplicate-detection.test.ts

# Con cobertura
npm test -- --coverage tests/duplicate-detection.test.ts
```

### Tests de Integración
```bash
# Ejecutar tests de API
npm test tests/integration/duplicate-api.test.ts

# Modo watch
npm test -- --watch tests/integration/
```

### Tests E2E
```bash
# Ejecutar tests E2E (requiere servidor activo)
npx playwright test tests/e2e/duplicate-management.spec.ts

# Modo UI (recomendado para debug)
npx playwright test --ui

# Con reporte HTML
npx playwright test --reporter=html
```

## 🔧 Configuración de Entorno de Testing

### 1. Base de Datos de Test
```bash
# Crear BD de test
createdb gestagent_test

# Ejecutar migraciones
DATABASE_URL=postgresql://user:pass@localhost/gestagent_test npm run migrate
```

### 2. Variables de Entorno
```env
# .env.test
NODE_ENV=test
DATABASE_URL=postgresql://user:pass@localhost/gestagent_test
NEXTAUTH_URL=http://localhost:5000
NEXTAUTH_SECRET=test-secret
```

### 3. Datos de Prueba
```bash
# Sembrar datos de test
npm run seed:test
```

## 📊 Métricas de Calidad

### Cobertura Objetivo
- **Líneas**: > 80%
- **Funciones**: > 75%
- **Ramas**: > 70%
- **Declaraciones**: > 80%

### Ejecutar Análisis de Cobertura
```bash
npm test -- --coverage --coverageDirectory=./coverage
```

## 🐛 Debugging Tests

### Tests Unitarios
```typescript
// Añadir console.logs
console.log('Resultado:', result);

// Usar debugger
debugger; // Pausará ejecución aquí
```

### Tests E2E
```bash
# Modo debug con headed browser
npx playwright test --debug

# Screenshots en fallos
npx playwright test --screenshot=on
```

## 📝 Casos de Prueba Manual

### 1. Detección de Duplicados
1. Subir factura de "DISA PENINSULA"
2. Verificar alerta de duplicado
3. Seleccionar "Usar existente"
4. Confirmar vinculación

### 2. Fusión de Entidades
1. Ir a Dashboard > Duplicados
2. Seleccionar 2+ sugerencias
3. Click "Fusionar Seleccionados"
4. Verificar consolidación

### 3. Historial de Facturas
1. Ir a Proveedores/Clientes
2. Click botón "Facturas"
3. Verificar listado y estadísticas
4. Exportar CSV

## 🔄 CI/CD Integration

### GitHub Actions
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node
        uses: actions/setup-node@v3
      - name: Install deps
        run: npm ci
      - name: Run tests
        run: npm test
      - name: E2E tests
        run: npx playwright test
```

## 📈 Monitoreo en Producción

### Métricas a Seguir:
- Tasa de detección de duplicados
- Tiempo de procesamiento
- Precisión de coincidencias
- Fusiones exitosas vs fallidas

### Logs Importantes:
```typescript
console.log('🔍 [Duplicados] Detectados:', count);
console.log('✅ [Fusión] Completada:', entityId);
console.log('❌ [Error] Fusión fallida:', error);
```

## 🎯 Próximos Pasos

1. **Aumentar Cobertura**
   - Tests de casos edge
   - Pruebas de rendimiento
   - Tests de concurrencia

2. **Automatización**
   - Tests en pre-commit
   - CI/CD pipeline completo
   - Reportes automáticos

3. **Monitoreo**
   - Dashboard de métricas
   - Alertas de anomalías
   - Análisis de precisión