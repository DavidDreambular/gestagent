// API Route para vincular documentos existentes con clientes y proveedores
// /app/api/documents/link/route.ts
// Versión 2.0.0 - Migrado a PostgreSQL

import { NextRequest, NextResponse } from 'next/server';
import { PostgreSQLClient } from '@/lib/postgresql-client';

// Inicializar cliente PostgreSQL
const pgClient = new PostgreSQLClient();

interface Customer {
  customer_id: string;
  name: string;
  nif_cif?: string;
  commercial_name?: string;
}

interface Supplier {
  supplier_id: string;
  name: string;
  nif_cif?: string;
  commercial_name?: string;
}

interface Document {
  job_id: string;
  processed_json: any;
  emitter_name?: string;
  receiver_name?: string;
  supplier_id?: string;
  customer_id?: string;
}

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

function findBestMatch(searchName: string, entities: (Customer | Supplier)[]): (Customer | Supplier) | null {
  if (!searchName || searchName.trim() === '') return null;
  
  const normalizedSearch = normalizeString(searchName);
  console.log(`🔍 [Vinculación] Buscando: "${searchName}" -> normalizado: "${normalizedSearch}"`);
  
  // 1. Coincidencia exacta (normalizada)
  for (const entity of entities) {
    const normalizedName = normalizeString(entity.name);
    if (normalizedName === normalizedSearch) {
      console.log(`✅ [Vinculación] Coincidencia exacta: "${entity.name}"`);
      return entity;
    }
  }
  
  // 2. Coincidencia por NIF/CIF
  for (const entity of entities) {
    if (entity.nif_cif && searchName.includes(entity.nif_cif)) {
      console.log(`✅ [Vinculación] Coincidencia por NIF: "${entity.name}" (${entity.nif_cif})`);
      return entity;
    }
  }
  
  // 3. Coincidencia parcial (contiene)
  for (const entity of entities) {
    const normalizedName = normalizeString(entity.name);
    if (normalizedName.includes(normalizedSearch) || normalizedSearch.includes(normalizedName)) {
      console.log(`✅ [Vinculación] Coincidencia parcial: "${entity.name}"`);
      return entity;
    }
  }
  
  // 4. Coincidencia por palabras clave (al menos 2 palabras en común)
  const searchWords = normalizedSearch.split(' ').filter(w => w.length > 2);
  for (const entity of entities) {
    const entityWords = normalizeString(entity.name).split(' ').filter(w => w.length > 2);
    const commonWords = searchWords.filter(word => entityWords.includes(word));
    
    if (commonWords.length >= 2) {
      console.log(`✅ [Vinculación] Coincidencia por palabras: "${entity.name}" (${commonWords.join(', ')})`);
      return entity;
    }
  }
  
  console.log(`❌ [Vinculación] Sin coincidencias para: "${searchName}"`);
  return null;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔗 [Vinculación] Iniciando proceso de vinculación de documentos...');
    
    // Obtener todos los documentos
    const documentsResult = await pgClient.query<Document>(`
      SELECT job_id, processed_json, emitter_name, receiver_name, supplier_id, customer_id
      FROM documents
    `);
    
    if (documentsResult.error) {
      console.error('❌ Error obteniendo documentos:', documentsResult.error);
      return NextResponse.json({ 
        success: false, 
        error: 'Error obteniendo documentos' 
      }, { status: 500 });
    }
    
    // Obtener todos los clientes
    const customersResult = await pgClient.query<Customer>(`
      SELECT customer_id, name, nif_cif, commercial_name
      FROM customers
    `);
    
    if (customersResult.error) {
      console.error('❌ Error obteniendo clientes:', customersResult.error);
      return NextResponse.json({ 
        success: false, 
        error: 'Error obteniendo clientes' 
      }, { status: 500 });
    }
    
    // Obtener todos los proveedores
    const suppliersResult = await pgClient.query<Supplier>(`
      SELECT supplier_id, name, nif_cif, commercial_name
      FROM suppliers
    `);
    
    if (suppliersResult.error) {
      console.error('❌ Error obteniendo proveedores:', suppliersResult.error);
      return NextResponse.json({ 
        success: false, 
        error: 'Error obteniendo proveedores' 
      }, { status: 500 });
    }

    const documents = documentsResult.data || [];
    const customers = customersResult.data || [];
    const suppliers = suppliersResult.data || [];
    
    console.log(`📊 [Vinculación] Documentos: ${documents.length}, Clientes: ${customers.length}, Proveedores: ${suppliers.length}`);
    
    let linkedCount = 0;
    
    for (const doc of documents) {
      let updated = false;
      const updateFields: string[] = [];
      const updateValues: any[] = [doc.job_id]; // job_id siempre va primero para el WHERE
      
      // Extraer nombres del JSON procesado
      let supplierName = doc.emitter_name;
      let customerName = doc.receiver_name;
      
      // Si no hay nombres en los campos directos, buscar en el JSON
      if ((!supplierName || !customerName) && doc.processed_json) {
        try {
          const jsonData = Array.isArray(doc.processed_json) ? doc.processed_json[0] : doc.processed_json;
          
          if (!supplierName && jsonData?.supplier?.name) {
            supplierName = jsonData.supplier.name;
          }
          
          if (!customerName && jsonData?.customer?.name) {
            customerName = jsonData.customer.name;
          }
        } catch (error) {
          console.error(`❌ Error procesando JSON del documento ${doc.job_id}:`, error);
        }
      }
      
      // Buscar coincidencias solo si no están ya vinculados
      if (!doc.supplier_id && supplierName && suppliers.length > 0) {
        const supplierMatch = findBestMatch(supplierName, suppliers);
        if (supplierMatch && 'supplier_id' in supplierMatch) {
          updateFields.push(`supplier_id = $${updateValues.length + 1}`);
          updateValues.push(supplierMatch.supplier_id);
          
          updateFields.push(`emitter_name = $${updateValues.length + 1}`);
          updateValues.push(supplierName);
          
          updated = true;
        }
      }
      
      if (!doc.customer_id && customerName && customers.length > 0) {
        const customerMatch = findBestMatch(customerName, customers);
        if (customerMatch && 'customer_id' in customerMatch) {
          updateFields.push(`customer_id = $${updateValues.length + 1}`);
          updateValues.push(customerMatch.customer_id);
          
          updateFields.push(`receiver_name = $${updateValues.length + 1}`);
          updateValues.push(customerName);
          
          updated = true;
        }
      }
      
      // Actualizar el documento si encontramos coincidencias
      if (updated) {
        updateFields.push(`updated_at = NOW()`);
        
        const updateQuery = `
          UPDATE documents 
          SET ${updateFields.join(', ')}
          WHERE job_id = $1
        `;
        
        const updateResult = await pgClient.query(updateQuery, updateValues);
        
        if (updateResult.error) {
          console.error(`❌ Error actualizando documento ${doc.job_id}:`, updateResult.error);
        } else {
          linkedCount++;
          console.log(`✅ [Vinculación] Documento ${doc.job_id} vinculado`);
        }
      }
    }
    
    console.log(`🎉 [Vinculación] Proceso completado: ${linkedCount} documentos vinculados de ${documents.length} procesados`);
    
    return NextResponse.json({
      success: true,
      message: `Vinculación completada: ${linkedCount} documentos vinculados`,
      data: {
        processed: documents.length,
        linked: linkedCount,
        customers_available: customers.length,
        suppliers_available: suppliers.length
      }
    });
    
  } catch (error: any) {
    console.error('❌ [Vinculación] Error general:', error);
    return NextResponse.json({
      success: false,
      error: 'Error en proceso de vinculación',
      details: error.message
    }, { status: 500 });
  }
} 