// Script para crear entidades que coincidan con los documentos existentes
const API_BASE = 'http://localhost:2200';

async function createMatchingEntities() {
    console.log('🏗️ Creando entidades que coincidan con documentos existentes...\n');

    try {
        // 1. Obtener documentos para analizar emisores/receptores
        console.log('📋 Analizando documentos existentes...');
        const docsResponse = await fetch(`${API_BASE}/api/documents/list?limit=10`);
        const docsData = await docsResponse.json();
        const documents = docsData.documents || [];

        // Extraer emisores únicos
        const emitters = new Set();
        const receivers = new Set();
        
        documents.forEach(doc => {
            if (doc.emitter_name) emitters.add(doc.emitter_name);
            if (doc.receiver_name) receivers.add(doc.receiver_name);
        });

        console.log(`📊 Emisores únicos encontrados: ${emitters.size}`);
        console.log(`📊 Receptores únicos encontrados: ${receivers.size}`);

        // 2. Crear proveedores para emisores
        console.log('\n🏢 Creando proveedores para emisores...');
        for (const emitterName of emitters) {
            const supplierData = {
                name: emitterName,
                nif_cif: generateFakeNIF('B'), // Generar NIF falso para testing
                address: `Dirección de ${emitterName}`,
                city: 'Madrid',
                province: 'Madrid', 
                business_sector: 'Servicios',
                status: 'active',
                notes: 'Creado para testing de Entity Matching'
            };

            try {
                const response = await fetch(`${API_BASE}/api/suppliers`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(supplierData)
                });

                if (response.ok) {
                    console.log(`✅ Proveedor creado: ${emitterName}`);
                } else {
                    const error = await response.text();
                    console.log(`⚠️ Error creando proveedor ${emitterName}: ${error}`);
                }
            } catch (error) {
                console.log(`❌ Error en request para ${emitterName}: ${error.message}`);
            }
        }

        // 3. Crear clientes para receptores
        console.log('\n👥 Creando clientes para receptores...');
        for (const receiverName of receivers) {
            const customerData = {
                name: receiverName,
                nif_cif: generateFakeNIF('A'), // Generar NIF falso para testing
                address: `Dirección de ${receiverName}`,
                city: 'Barcelona',
                province: 'Barcelona',
                customer_type: 'company',
                status: 'active',
                notes: 'Creado para testing de Entity Matching'
            };

            try {
                const response = await fetch(`${API_BASE}/api/customers`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(customerData)
                });

                if (response.ok) {
                    console.log(`✅ Cliente creado: ${receiverName}`);
                } else {
                    const error = await response.text();
                    console.log(`⚠️ Error creando cliente ${receiverName}: ${error}`);
                }
            } catch (error) {
                console.log(`❌ Error en request para ${receiverName}: ${error.message}`);
            }
        }

        console.log('\n📊 RESUMEN DE ENTIDADES CREADAS:');
        console.log(`🏢 Proveedores: ${emitters.size} intentados`);
        console.log(`👥 Clientes: ${receivers.size} intentados`);

        // 4. Verificar totales actuales
        const suppliersResponse = await fetch(`${API_BASE}/api/suppliers`);
        const suppliersData = await suppliersResponse.json();
        const suppliers = suppliersData.data?.suppliers || suppliersData.suppliers || [];

        const customersResponse = await fetch(`${API_BASE}/api/customers`);
        const customersData = await customersResponse.json();
        const customers = customersData.data?.customers || customersData.customers || [];

        console.log(`\n📈 TOTALES ACTUALES:`);
        console.log(`🏢 Total proveedores: ${suppliers.length}`);
        console.log(`👥 Total clientes: ${customers.length}`);

        console.log('\n🎯 PRÓXIMO PASO:');
        console.log('Ahora las entidades existen. El próximo documento que se suba');
        console.log('debería hacer match automáticamente con estas entidades.');
        console.log('\nPuedes probar subiendo un PDF en:');
        console.log('http://localhost:2200/dashboard/documents');

    } catch (error) {
        console.error('❌ Error general:', error.message);
    }
}

// Función helper para generar NIFs falsos para testing
function generateFakeNIF(prefix) {
    const numbers = Math.floor(Math.random() * 90000000) + 10000000;
    return `${prefix}${numbers}`;
}

// Ejecutar
createMatchingEntities();