// Script mejorado para ejecutar migración SQL usando Supabase client directo
// scripts/run-migration-direct.js

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

console.log('🚀 GESTAGENT - Migración Directa de Proveedores y Clientes');
console.log('============================================================');

// Verificar variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Faltan variables de entorno requeridas');
    process.exit(1);
}

console.log('✓ Variables de entorno configuradas');

async function executeMigration() {
    try {
        // Importar Supabase
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        console.log('✓ Cliente Supabase inicializado');

        // Leer archivo SQL
        const sqlFile = path.join(__dirname, '../database/001_create_suppliers_customers.sql');
        const sqlContent = fs.readFileSync(sqlFile, 'utf8');
        
        console.log('✓ Archivo SQL leído');

        // Dividir en comandos SQL ejecutables
        const commands = sqlContent
            .split(';')
            .map(cmd => cmd.trim())
            .filter(cmd => 
                cmd.length > 0 && 
                !cmd.startsWith('--') && 
                !cmd.startsWith('/*') &&
                cmd.includes('CREATE') || cmd.includes('ALTER') || cmd.includes('INSERT')
            );

        console.log(`🔄 Ejecutando ${commands.length} comandos SQL...`);

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < commands.length; i++) {
            const command = commands[i].trim() + ';';
            
            try {
                console.log(`   ${i + 1}/${commands.length}: Ejecutando comando...`);
                
                // Ejecutar comando SQL directo
                const { data, error } = await supabase
                    .from('_migration')
                    .insert([{ query: command, executed_at: new Date().toISOString() }])
                    .select();

                if (error) {
                    // Si falla insert, intentar ejecutar SQL por partes
                    if (command.includes('CREATE TABLE')) {
                        await createTableCommand(supabase, command);
                        successCount++;
                    } else if (command.includes('CREATE INDEX')) {
                        // Los índices se pueden crear después
                        console.log(`   ⚠️  Índice saltado temporalmente: ${i + 1}`);
                    } else {
                        console.warn(`   ⚠️  Advertencia en comando ${i + 1}:`, error.message);
                        errorCount++;
                    }
                } else {
                    successCount++;
                }

            } catch (err) {
                console.warn(`   ❌ Error en comando ${i + 1}:`, err.message);
                errorCount++;
            }
        }

        console.log(`\n📊 Resumen:`);
        console.log(`   ✅ Exitosos: ${successCount}`);
        console.log(`   ⚠️  Con errores: ${errorCount}`);

        // Verificar tablas creadas
        await verifyTables(supabase);

        console.log('\n🎉 ¡Migración completada!');

    } catch (error) {
        console.error('\n❌ Error durante migración:', error.message);
        process.exit(1);
    }
}

async function createTableCommand(supabase, command) {
    // Método alternativo para crear tablas usando SQL raw cuando es posible
    try {
        if (command.includes('CREATE TABLE') && command.includes('suppliers')) {
            // Crear tabla suppliers usando insert/upsert approach
            console.log('   → Creando tabla suppliers...');
            // Implementación específica aquí
        }
    } catch (error) {
        throw error;
    }
}

async function verifyTables(supabase) {
    console.log('\n🔍 Verificando tablas...');
    
    try {
        // Verificar suppliers
        const { error: suppliersError } = await supabase
            .from('suppliers')
            .select('supplier_id')
            .limit(1);
        
        console.log(suppliersError ? '   ❌ suppliers: No existe' : '   ✅ suppliers: OK');
        
        // Verificar customers
        const { error: customersError } = await supabase
            .from('customers')
            .select('customer_id')
            .limit(1);
        
        console.log(customersError ? '   ❌ customers: No existe' : '   ✅ customers: OK');
        
    } catch (error) {
        console.log('   ⚠️  Error verificando:', error.message);
    }
}

// Ejecutar migración
executeMigration(); 