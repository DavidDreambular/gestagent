// Script para crear datos de prueba para verificar el sistema
// Este script crea proveedores, clientes y facturas de ejemplo

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Configuración de la base de datos
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'gestagent',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'gestagent',
  password: process.env.POSTGRES_PASSWORD || 'gestagent123',
  port: process.env.POSTGRES_PORT || 5432,
});

async function createTestData() {
  const client = await pool.connect();
  
  try {
    console.log('🔨 Creando datos de prueba...\n');
    
    // 1. Crear proveedor de prueba
    console.log('1. Creando proveedor de prueba...');
    // Verificar si el proveedor ya existe
    let supplierResult = await client.query(`
      SELECT supplier_id, name FROM suppliers WHERE nif_cif = 'B12345678';
    `);
    
    let supplier;
    if (supplierResult.rows.length > 0) {
      supplier = supplierResult.rows[0];
      console.log(`✅ Proveedor ya existe: ${supplier.name}`);
    } else {
      supplierResult = await client.query(`
        INSERT INTO suppliers (
          name, nif_cif, address, city, province, 
          phone, email, business_sector, status
        ) VALUES (
          'Proveedor Prueba S.L.', 'B12345678', 
          'Calle de la Tecnología 123', 'Madrid', 'Madrid',
          '+34 91 123 45 67', 'contacto@proveedorprueba.com', 
          'Tecnología', 'active'
        ) RETURNING supplier_id, name;
      `);
      supplier = supplierResult.rows[0];
      console.log(`✅ Proveedor creado: ${supplier.name} (${supplier.supplier_id})`);
    }
    
    // 2. Crear cliente de prueba
    console.log('\n2. Creando cliente de prueba...');
    let customerResult = await client.query(`
      SELECT customer_id, name FROM customers WHERE nif_cif = 'A87654321';
    `);
    
    let customer;
    if (customerResult.rows.length > 0) {
      customer = customerResult.rows[0];
      console.log(`✅ Cliente ya existe: ${customer.name}`);
    } else {
      customerResult = await client.query(`
        INSERT INTO customers (
          name, nif_cif, address, city, province,
          phone, email, customer_type, status
        ) VALUES (
          'Cliente Ejemplo S.A.', 'A87654321',
          'Avenida Principal 456', 'Barcelona', 'Barcelona',
          '+34 93 987 65 43', 'admin@clienteejemplo.com',
          'company', 'active'
        ) RETURNING customer_id, name;
      `);
      customer = customerResult.rows[0];
      console.log(`✅ Cliente creado: ${customer.name} (${customer.customer_id})`);
    }
    
    // 3. Crear documento de prueba
    console.log('\n3. Creando documento de prueba...');
    const documentResult = await client.query(`
      INSERT INTO documents (
        job_id, document_type, status, emitter_name, receiver_name,
        document_date, total_amount, tax_amount, supplier_id, customer_id,
        processed_json, title
      ) VALUES (
        gen_random_uuid(), 'factura', 'completed',
        $1, $2,
        CURRENT_DATE - INTERVAL '15 days', 1250.00, 262.50,
        $3, $4,
        $5,
        'Factura de prueba - Servicios de consultoría'
      ) RETURNING job_id, total_amount;
    `, [
      supplier.name,
      customer.name,
      supplier.supplier_id,
      customer.customer_id,
      JSON.stringify({
        invoice_number: 'FAC-2024-001',
        invoice_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        total_amount: 1250.00,
        tax_amount: 262.50,
        subtotal_amount: 987.50,
        currency: 'EUR',
        description: 'Servicios de consultoría tecnológica',
        payment_terms: 30
      })
    ]);
    
    const document = documentResult.rows[0];
    console.log(`✅ Documento creado: ${document.job_id} (${document.total_amount}€)`);
    
    // 4. Crear entrada en invoice_entities (debería crearse automáticamente por trigger)
    console.log('\n4. Verificando creación de invoice_entity...');
    const invoiceCheck = await client.query(`
      SELECT * FROM invoice_entities WHERE document_id = $1;
    `, [document.job_id]);
    
    if (invoiceCheck.rows.length > 0) {
      const invoice = invoiceCheck.rows[0];
      console.log(`✅ Invoice entity creada automáticamente: ${invoice.invoice_number}`);
    } else {
      // Crear manualmente si el trigger no funcionó
      console.log('⚠️ Creando invoice_entity manualmente...');
      await client.query(`
        INSERT INTO invoice_entities (
          document_id, supplier_id, customer_id, invoice_number,
          invoice_date, total_amount, tax_amount, status
        ) VALUES (
          $1, $2, $3, 'FAC-2024-001',
          CURRENT_DATE - INTERVAL '15 days', 1250.00, 262.50, 'active'
        );
      `, [document.job_id, supplier.supplier_id, customer.customer_id]);
      console.log('✅ Invoice entity creada manualmente');
    }
    
    // 5. Actualizar estadísticas de entidades
    console.log('\n5. Actualizando estadísticas...');
    await client.query(`
      UPDATE suppliers SET
        total_invoices = (SELECT COUNT(*) FROM invoice_entities WHERE supplier_id = $1),
        total_amount = (SELECT COALESCE(SUM(total_amount), 0) FROM invoice_entities WHERE supplier_id = $1),
        last_invoice_date = (SELECT MAX(invoice_date) FROM invoice_entities WHERE supplier_id = $1),
        updated_at = NOW()
      WHERE supplier_id = $1;
    `, [supplier.supplier_id]);
    
    await client.query(`
      UPDATE customers SET
        total_invoices = (SELECT COUNT(*) FROM invoice_entities WHERE customer_id = $1),
        total_amount = (SELECT COALESCE(SUM(total_amount), 0) FROM invoice_entities WHERE customer_id = $1),
        last_invoice_date = (SELECT MAX(invoice_date) FROM invoice_entities WHERE customer_id = $1),
        updated_at = NOW()
      WHERE customer_id = $1;
    `, [customer.customer_id]);
    
    console.log('✅ Estadísticas actualizadas');
    
    // 6. Verificar resultados finales
    console.log('\n6. Verificando resultados...');
    const finalCheck = await client.query(`
      SELECT 
        s.name as supplier_name, s.total_invoices as supplier_invoices, s.total_amount as supplier_amount,
        c.name as customer_name, c.total_invoices as customer_invoices, c.total_amount as customer_amount,
        ie.invoice_number, ie.total_amount as invoice_amount
      FROM suppliers s
      CROSS JOIN customers c
      LEFT JOIN invoice_entities ie ON ie.supplier_id = s.supplier_id AND ie.customer_id = c.customer_id
      WHERE s.supplier_id = $1 AND c.customer_id = $2;
    `, [supplier.supplier_id, customer.customer_id]);
    
    if (finalCheck.rows.length > 0) {
      const result = finalCheck.rows[0];
      console.log('📊 Resumen de datos creados:');
      console.log(`   Proveedor: ${result.supplier_name}`);
      console.log(`   - Facturas: ${result.supplier_invoices}`);
      console.log(`   - Importe total: ${result.supplier_amount}€`);
      console.log(`   Cliente: ${result.customer_name}`);
      console.log(`   - Facturas: ${result.customer_invoices}`);
      console.log(`   - Importe total: ${result.customer_amount}€`);
      console.log(`   Factura: ${result.invoice_number} - ${result.invoice_amount}€`);
    }
    
    console.log('\n🎉 ¡Datos de prueba creados exitosamente!');
    console.log('\nPuedes probar el sistema con:');
    console.log(`- Proveedor ID: ${supplier.supplier_id}`);
    console.log(`- Cliente ID: ${customer.customer_id}`);
    console.log(`- URL Proveedor: /dashboard/suppliers/${supplier.supplier_id}`);
    console.log(`- URL Cliente: /dashboard/customers/${customer.customer_id}`);
    
  } catch (error) {
    console.error('❌ Error creando datos de prueba:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  createTestData()
    .then(() => {
      console.log('\n✅ Datos de prueba creados');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error creando datos de prueba:', error);
      process.exit(1);
    });
}

module.exports = { createTestData };