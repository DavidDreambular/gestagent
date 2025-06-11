const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  user: 'gestagent_user',
  host: 'localhost',
  database: 'gestagent',
  password: 'gestagent_pass_2024',
  port: 5432,
});

// Plantillas de ejemplo para diferentes tipos de proveedores
const sampleTemplates = [
  {
    name: 'Telefónica España - Factura',
    description: 'Plantilla para facturas de telecomunicaciones de Telefónica España',
    document_type: 'factura',
    extraction_rules: {
      supplier: {
        name_patterns: ['TELEFONICA ESPAÑA', 'Telefónica España S.A.U.', 'TELEFÓNICA ESPAÑA S.A.U.'],
        nif_patterns: ['A28015865'],
        address_patterns: ['Gran Vía, 28.*Madrid', 'C/ Gran Vía.*Madrid']
      },
      invoice_number_patterns: ['Factura n[úo]mero:?\\s*([A-Z0-9\\-]+)', 'N[úo]mero de factura:?\\s*([A-Z0-9\\-]+)', 'Factura:?\\s*([A-Z0-9\\-]+)'],
      date_patterns: ['Fecha de factura:?\\s*(\\d{1,2}[/\\-]\\d{1,2}[/\\-]\\d{2,4})', 'Fecha emisión:?\\s*(\\d{1,2}[/\\-]\\d{1,2}[/\\-]\\d{2,4})', 'Fecha:?\\s*(\\d{1,2}[/\\-]\\d{1,2}[/\\-]\\d{2,4})'],
      total_amount_patterns: ['Total a pagar:?\\s*([0-9,.]+)', 'Importe total:?\\s*([0-9,.]+)', 'TOTAL:?\\s*([0-9,.]+)€?'],
      tax_patterns: ['IVA \\(21%\\):?\\s*([0-9,.]+)', 'Impuestos:?\\s*([0-9,.]+)', 'I\\.V\\.A\\.:?\\s*([0-9,.]+)']
    },
    confidence_threshold: 0.75,
    is_active: true
  },
  {
    name: 'Endesa Energía - Factura',
    description: 'Plantilla para facturas eléctricas de Endesa',
    document_type: 'factura',
    extraction_rules: {
      supplier: {
        name_patterns: ['ENDESA ENERGIA', 'Endesa Energía S.A.U.', 'ENDESA'],
        nif_patterns: ['A81948077'],
        address_patterns: ['Príncipe de Vergara.*Madrid']
      },
      invoice_number_patterns: ['Factura:?\\s*([0-9]{10,})', 'Ref\\. factura:?\\s*([0-9]{10,})', 'N[úo]\\. factura:?\\s*([0-9]{10,})'],
      date_patterns: ['Fecha factura:?\\s*(\\d{1,2}[/\\-]\\d{1,2}[/\\-]\\d{2,4})', 'Emisión:?\\s*(\\d{1,2}[/\\-]\\d{1,2}[/\\-]\\d{2,4})'],
      total_amount_patterns: ['Total factura:?\\s*([0-9,.]+)', 'Importe a pagar:?\\s*([0-9,.]+)', 'TOTAL A PAGAR:?\\s*([0-9,.]+)€?'],
      tax_patterns: ['I\\.V\\.A\\.:?\\s*([0-9,.]+)', 'Impuesto eléctrico:?\\s*([0-9,.]+)']
    },
    confidence_threshold: 0.80,
    is_active: true
  },
  {
    name: 'Amazon España - Factura',
    description: 'Plantilla para facturas de Amazon España',
    document_type: 'factura',
    extraction_rules: {
      supplier: {
        name_patterns: ['Amazon España', 'AMAZON ESPAÑA', 'Amazon.es'],
        nif_patterns: ['A78734409'],
        address_patterns: ['Parque Empresarial.*Madrid']
      },
      invoice_number_patterns: ['Pedido n[úo]mero:?\\s*([0-9\\-]+)', 'Order #:?\\s*([0-9\\-]+)', 'Pedido:?\\s*([0-9\\-]+)'],
      date_patterns: ['Fecha del pedido:?\\s*(\\d{1,2}[/\\-]\\d{1,2}[/\\-]\\d{2,4})', 'Order Date:?\\s*(\\d{1,2}[/\\-]\\d{1,2}[/\\-]\\d{2,4})'],
      total_amount_patterns: ['Total del pedido:?\\s*EUR\\s*([0-9,.]+)', 'Order Total:?\\s*EUR\\s*([0-9,.]+)', 'Total:?\\s*([0-9,.]+)€?'],
      tax_patterns: ['IVA incluido:?\\s*EUR\\s*([0-9,.]+)', 'Estimated tax:?\\s*EUR\\s*([0-9,.]+)']
    },
    confidence_threshold: 0.70,
    is_active: true
  },
  {
    name: 'Repsol - Ticket Combustible',
    description: 'Plantilla para tickets de gasolina de Repsol',
    document_type: 'recibo',
    extraction_rules: {
      supplier: {
        name_patterns: ['REPSOL', 'Repsol S.A.', 'ESTACION DE SERVICIO'],
        nif_patterns: ['A28000180'],
        address_patterns: ['E\\.S\\. .*', 'ESTACION .*']
      },
      invoice_number_patterns: ['Ticket:?\\s*([0-9]{8,})', 'Factura:?\\s*([A-Z0-9\\-]+)', 'N[úo]\\. ticket:?\\s*([0-9]+)'],
      date_patterns: ['Fecha:?\\s*(\\d{1,2}[/\\-]\\d{1,2}[/\\-]\\d{2,4})', '\\d{1,2}[/\\-]\\d{1,2}[/\\-]\\d{2,4}\\s*\\d{1,2}:\\d{2}'],
      total_amount_patterns: ['Total:?\\s*([0-9,.]+)', 'Importe:?\\s*([0-9,.]+)', 'TOTAL:?\\s*([0-9,.]+)€?'],
      tax_patterns: ['IVA:?\\s*([0-9,.]+)', 'Impuestos:?\\s*([0-9,.]+)']
    },
    confidence_threshold: 0.65,
    is_active: true
  },
  {
    name: 'El Corte Inglés - Factura',
    description: 'Plantilla para facturas de El Corte Inglés',
    document_type: 'factura',
    extraction_rules: {
      supplier: {
        name_patterns: ['El Corte Inglés', 'EL CORTE INGLES', 'CORTE INGLES'],
        nif_patterns: ['A28017895'],
        address_patterns: ['Preciados.*Madrid', 'C/ Preciados.*']
      },
      invoice_number_patterns: ['Ticket:?\\s*([0-9\\-]+)', 'Factura n[úo]:?\\s*([A-Z0-9\\-]+)', 'N[úo]\\. ticket:?\\s*([0-9\\-]+)'],
      date_patterns: ['Fecha:?\\s*(\\d{1,2}[/\\-]\\d{1,2}[/\\-]\\d{2,4})', '\\d{1,2}[/\\-]\\d{1,2}[/\\-]\\d{2,4}\\s*\\d{1,2}:\\d{2}'],
      total_amount_patterns: ['TOTAL:?\\s*([0-9,.]+)', 'Total a pagar:?\\s*([0-9,.]+)', 'IMPORTE TOTAL:?\\s*([0-9,.]+)€?'],
      tax_patterns: ['I\\.V\\.A\\.:?\\s*([0-9,.]+)', '21%\\s*([0-9,.]+)']
    },
    confidence_threshold: 0.75,
    is_active: true
  }
];

async function seedTemplates() {
  try {
    console.log('🌱 Iniciando población de plantillas de ejemplo...');
    
    // Limpiar plantillas existentes (opcional)
    await pool.query('DELETE FROM extraction_templates');
    console.log('🧹 Plantillas existentes eliminadas');
    
    // Insertar plantillas de ejemplo
    for (const template of sampleTemplates) {
      const templateId = uuidv4();
      const userId = '00000000-0000-0000-0000-000000000000'; // Usuario por defecto
      
      const query = `
        INSERT INTO extraction_templates (
          template_id, name, description, document_type, extraction_rules, 
          confidence_threshold, is_active, usage_count, success_rate,
          created_at, updated_at, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), $10)
        RETURNING template_id, name;
      `;
      
      const values = [
        templateId,
        template.name,
        template.description,
        template.document_type,
        JSON.stringify(template.extraction_rules),
        template.confidence_threshold,
        template.is_active,
        Math.floor(Math.random() * 50) + 10, // usage_count random entre 10-60
        Math.random() * 0.3 + 0.7, // success_rate random entre 0.7-1.0
        userId
      ];
      
      const result = await pool.query(query, values);
      const created = result.rows[0];
      
      console.log(`✅ Plantilla creada: ${created.name} (ID: ${created.template_id.substring(0, 8)}...)`);
    }
    
    // Mostrar resumen
    const summary = await pool.query(`
      SELECT 
        COUNT(*) as total_templates,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_templates,
        ROUND(AVG(success_rate)::numeric, 3) as avg_success_rate,
        SUM(usage_count) as total_usage
      FROM extraction_templates
    `);
    
    const stats = summary.rows[0];
    
    console.log('\n📊 Resumen de plantillas:');
    console.log(`   • Total: ${stats.total_templates}`);
    console.log(`   • Activas: ${stats.active_templates}`);
    console.log(`   • Tasa éxito promedio: ${(stats.avg_success_rate * 100).toFixed(1)}%`);
    console.log(`   • Uso total: ${stats.total_usage}`);
    
    console.log('\n🎉 Plantillas de ejemplo creadas exitosamente!');
    
  } catch (error) {
    console.error('❌ Error creando plantillas:', error);
  } finally {
    await pool.end();
  }
}

seedTemplates();