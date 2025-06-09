-- Crear tabla extraction_templates para almacenar plantillas de extracción por proveedor
CREATE TABLE IF NOT EXISTS extraction_templates (
  id VARCHAR(255) PRIMARY KEY,
  provider_name VARCHAR(255) NOT NULL,
  provider_nif VARCHAR(50),
  field_mappings JSONB NOT NULL DEFAULT '{}',
  confidence_threshold DECIMAL(3,2) DEFAULT 0.70,
  usage_count INTEGER DEFAULT 0,
  success_rate DECIMAL(3,2) DEFAULT 1.00,
  status VARCHAR(20) DEFAULT 'learning' CHECK (status IN ('active', 'learning', 'deprecated')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_extraction_templates_provider_name ON extraction_templates(provider_name);
CREATE INDEX IF NOT EXISTS idx_extraction_templates_provider_nif ON extraction_templates(provider_nif);
CREATE INDEX IF NOT EXISTS idx_extraction_templates_status ON extraction_templates(status);
CREATE INDEX IF NOT EXISTS idx_extraction_templates_success_rate ON extraction_templates(success_rate DESC);

-- Crear índice GIN para el campo JSONB
CREATE INDEX IF NOT EXISTS idx_extraction_templates_field_mappings ON extraction_templates USING GIN (field_mappings);

-- Comentarios para documentación
COMMENT ON TABLE extraction_templates IS 'Almacena plantillas de extracción aprendidas por proveedor para mejorar la precisión del OCR';
COMMENT ON COLUMN extraction_templates.field_mappings IS 'Patrones JSON para extraer campos específicos del proveedor';
COMMENT ON COLUMN extraction_templates.confidence_threshold IS 'Umbral mínimo de confianza para aplicar la plantilla';
COMMENT ON COLUMN extraction_templates.usage_count IS 'Número de veces que se ha usado esta plantilla';
COMMENT ON COLUMN extraction_templates.success_rate IS 'Tasa de éxito de la plantilla (0.0 a 1.0)';

-- Insertar algunos ejemplos de plantillas
INSERT INTO extraction_templates (
  id, provider_name, provider_nif, field_mappings, confidence_threshold, usage_count, success_rate, status
) VALUES 
(
  'template_example_1',
  'Empresa Ejemplo S.L.',
  'B12345678',
  '{"invoice_number_patterns": ["FAC-\\\\d{4}-\\\\d{3}", "FACTURA\\\\s+(\\\\d+)"], "date_patterns": ["\\\\d{1,2}/\\\\d{1,2}/\\\\d{4}"], "total_amount_patterns": ["TOTAL[:\\\\s]+(\\\\d+[.,]\\\\d+)\\\\s*€"], "tax_patterns": ["IVA[:\\\\s]+(\\\\d+[.,]\\\\d+)"]}',
  0.75,
  10,
  0.90,
  'active'
),
(
  'template_example_2', 
  'Suministros Técnicos S.A.',
  'A87654321',
  '{"invoice_number_patterns": ["ST-\\\\d{6}", "N[ºº]\\\\s*(\\\\d+)"], "date_patterns": ["\\\\d{2}-\\\\d{2}-\\\\d{4}"], "total_amount_patterns": ["IMPORTE TOTAL[:\\\\s]+(\\\\d+,\\\\d+)"], "tax_patterns": ["21%[:\\\\s]+(\\\\d+,\\\\d+)"]}',
  0.80,
  5,
  0.85,
  'active'
);

-- Función para actualizar timestamp automáticamente
CREATE OR REPLACE FUNCTION update_extraction_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at automáticamente
DROP TRIGGER IF EXISTS trigger_update_extraction_templates_updated_at ON extraction_templates;
CREATE TRIGGER trigger_update_extraction_templates_updated_at
  BEFORE UPDATE ON extraction_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_extraction_templates_updated_at(); 