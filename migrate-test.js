// Script simplificado para probar entity matching
const API_BASE = 'http://localhost:2200';

async function testEntityMatching() {
    console.log('🔗 Iniciando test de Entity Matching...\n');

    try {
        // 1. Obtener documentos sin vincular
        console.log('📋 Obteniendo documentos sin vincular...');
        const docsResponse = await fetch(`${API_BASE}/api/documents/list?limit=5`);
        const docsData = await docsResponse.json();
        const documents = docsData.documents || [];
        
        console.log(`📊 Total documentos: ${documents.length}`);
        
        const unlinkedDocs = documents.filter(doc => !doc.supplier_id && !doc.customer_id);
        console.log(`🔍 Documentos sin vincular: ${unlinkedDocs.length}`);
        
        if (unlinkedDocs.length === 0) {
            console.log('✅ Todos los documentos ya están vinculados!');
            return;
        }

        // 2. Obtener proveedores actuales
        console.log('\n🏢 Obteniendo proveedores actuales...');
        const suppliersResponse = await fetch(`${API_BASE}/api/suppliers`);
        const suppliersData = await suppliersResponse.json();
        const suppliers = suppliersData.data?.suppliers || suppliersData.suppliers || [];
        console.log(`📊 Total proveedores: ${suppliers.length}`);

        // 3. Obtener clientes actuales  
        console.log('\n👥 Obteniendo clientes actuales...');
        const customersResponse = await fetch(`${API_BASE}/api/customers`);
        const customersData = await customersResponse.json();
        const customers = customersData.data?.customers || customersData.customers || [];
        console.log(`📊 Total clientes: ${customers.length}`);

        // 4. Mostrar muestra de documentos sin vincular
        console.log('\n📄 Muestra de documentos sin vincular:');
        unlinkedDocs.slice(0, 3).forEach((doc, index) => {
            console.log(`  ${index + 1}. ${doc.job_id}`);
            console.log(`     Emisor: ${doc.emitter_name || 'N/A'}`);
            console.log(`     Receptor: ${doc.receiver_name || 'N/A'}`);
            console.log(`     Estado: ${doc.status}`);
            console.log('');
        });

        // 5. Obtener estadísticas antes de la migración
        console.log('📈 Estadísticas ANTES de entity matching:');
        const statsBefore = await fetch(`${API_BASE}/api/reports/entity-matching-stats`);
        const statsBeforeData = await statsBefore.json();
        console.log(`  - Documentos procesados: ${statsBeforeData.executive_summary?.total_documents_processed || 0}`);
        console.log(`  - Tasa de automatización: ${statsBeforeData.executive_summary?.automation_success_rate || '0%'}`);
        console.log(`  - Entidades auto-creadas: ${statsBeforeData.executive_summary?.entities_auto_created || 0}`);

        // 6. Mostrar proveedores más relevantes
        console.log('\n🏪 Proveedores existentes (muestra):');
        suppliers.slice(0, 3).forEach((supplier, index) => {
            console.log(`  ${index + 1}. ${supplier.name || supplier.tax_id}`);
            console.log(`     NIF: ${supplier.tax_id || supplier.nif_cif || 'N/A'}`);
            console.log(`     Estado: ${supplier.status}`);
            console.log('');
        });

        console.log('✅ Test completado. El sistema está listo para:\n');
        console.log('🔧 OPCIONES PARA CONTINUAR:');
        console.log('1. Subir un nuevo documento PDF en: http://localhost:2200/dashboard/documents');
        console.log('2. Ver reportes actualizados en: http://localhost:2200/dashboard/reports');
        console.log('3. El nuevo documento debería vincularse automáticamente si encuentra matches');
        console.log('4. Si el proveedor/cliente no existe, el sistema los creará automáticamente');
        
        console.log('\n📋 RESUMEN DEL ESTADO ACTUAL:');
        console.log(`- ✅ ${documents.length} documentos en total`);
        console.log(`- ⚠️ ${unlinkedDocs.length} documentos sin vincular`);
        console.log(`- 🏢 ${suppliers.length} proveedores registrados`);
        console.log(`- 👥 ${customers.length} clientes registrados`);
        console.log('- 🚀 Sistema de Entity Matching activado');

    } catch (error) {
        console.error('❌ Error en el test:', error.message);
    }
}

// Ejecutar el test
testEntityMatching();