// API Route para vincular documentos existentes con clientes y proveedores
// /app/api/documents/link/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configurar Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters except spaces
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

function extractKeywords(str: string): string[] {
  const normalized = normalizeString(str);
  return normalized.split(' ').filter(word => word.length > 2);
}

function calculateSimilarity(str1: string, str2: string): number {
  const keywords1 = extractKeywords(str1);
  const keywords2 = extractKeywords(str2);
  
  if (keywords1.length === 0 || keywords2.length === 0) return 0;
  
  let matches = 0;
  for (const keyword1 of keywords1) {
    for (const keyword2 of keywords2) {
      if (keyword1.includes(keyword2) || keyword2.includes(keyword1)) {
        matches++;
        break;
      }
    }
  }
  
  return matches / Math.max(keywords1.length, keywords2.length);
}

function findBestMatch(
  documentName: string, 
  entities: (Customer | Supplier)[], 
  threshold: number = 0.3
): (Customer | Supplier) | null {
  let bestMatch: (Customer | Supplier) | null = null;
  let bestScore = 0;

  for (const entity of entities) {
    // Verificar nombre principal
    const nameScore = calculateSimilarity(documentName, entity.name);
    if (nameScore > bestScore && nameScore >= threshold) {
      bestScore = nameScore;
      bestMatch = entity;
    }

    // Verificar nombre comercial si existe
    if (entity.commercial_name) {
      const commercialScore = calculateSimilarity(documentName, entity.commercial_name);
      if (commercialScore > bestScore && commercialScore >= threshold) {
        bestScore = commercialScore;
        bestMatch = entity;
      }
    }

    // Verificar NIF/CIF si existe
    if (entity.nif_cif && documentName.includes(entity.nif_cif)) {
      bestScore = 1.0;
      bestMatch = entity;
      break; // NIF/CIF es una coincidencia exacta
    }
  }

  return bestMatch;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔗 [Document Linking] Iniciando vinculación de documentos...');

    // Obtener todos los documentos sin vincular
    const { data: documents, error: documentsError } = await supabase
      .from('documents')
      .select('job_id, processed_json, emitter_name, receiver_name, supplier_id, customer_id')
      .or('supplier_id.is.null,customer_id.is.null');

    if (documentsError) {
      console.error('❌ Error obteniendo documentos:', documentsError);
      return NextResponse.json({ error: 'Error obteniendo documentos' }, { status: 500 });
    }

    // Obtener todos los clientes y proveedores
    const [customersResult, suppliersResult] = await Promise.all([
      supabase.from('customers').select('customer_id, name, nif_cif, commercial_name'),
      supabase.from('suppliers').select('supplier_id, name, nif_cif, commercial_name')
    ]);

    if (customersResult.error || suppliersResult.error) {
      console.error('❌ Error obteniendo entidades:', customersResult.error || suppliersResult.error);
      return NextResponse.json({ error: 'Error obteniendo entidades' }, { status: 500 });
    }

    const customers = customersResult.data || [];
    const suppliers = suppliersResult.data || [];

    console.log(`📊 Procesando ${documents?.length || 0} documentos con ${customers.length} clientes y ${suppliers.length} proveedores`);

    let linkedCount = 0;
    const updates = [];

    for (const doc of documents || []) {
      let supplierMatch = null;
      let customerMatch = null;

      // Intentar vincular con proveedor (emisor)
      if (doc.emitter_name && !doc.supplier_id) {
        supplierMatch = findBestMatch(doc.emitter_name, suppliers);
        if (supplierMatch) {
          console.log(`✅ Proveedor encontrado: "${doc.emitter_name}" -> "${supplierMatch.name}"`);
        }
      }

      // Intentar vincular con cliente (receptor)
      if (doc.receiver_name && !doc.customer_id) {
        customerMatch = findBestMatch(doc.receiver_name, customers);
        if (customerMatch) {
          console.log(`✅ Cliente encontrado: "${doc.receiver_name}" -> "${customerMatch.name}"`);
        }
      }

      // Si encontramos alguna coincidencia, actualizar el documento
      if (supplierMatch || customerMatch) {
        const updateData: any = {};
        if (supplierMatch && 'supplier_id' in supplierMatch) {
          updateData.supplier_id = supplierMatch.supplier_id;
        }
        if (customerMatch && 'customer_id' in customerMatch) {
          updateData.customer_id = customerMatch.customer_id;
        }

        updates.push({
          job_id: doc.job_id,
          ...updateData
        });

        linkedCount++;
      }
    }

    // Ejecutar todas las actualizaciones
    if (updates.length > 0) {
      for (const update of updates) {
        const { job_id, ...updateFields } = update;
        const { error: updateError } = await supabase
          .from('documents')
          .update(updateFields)
          .eq('job_id', job_id);

        if (updateError) {
          console.error(`❌ Error actualizando documento ${job_id}:`, updateError);
        }
      }
    }

    console.log(`🎉 Vinculación completada: ${linkedCount} documentos vinculados de ${documents?.length || 0} procesados`);

    return NextResponse.json({
      success: true,
      message: `Vinculación completada: ${linkedCount} documentos vinculados`,
      data: {
        processed: documents?.length || 0,
        linked: linkedCount,
        customers_available: customers.length,
        suppliers_available: suppliers.length
      }
    });

  } catch (error) {
    console.error('❌ [Document Linking] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 