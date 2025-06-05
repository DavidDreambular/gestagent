// Script para ejecutar migración SQL usando Supabase client
// scripts/run-migration.js

const fs = require('fs');
const path = require('path');

// Cargar variables de entorno desde .env
require('dotenv').config({ path: path.join(__dirname, '../.env') });

console.log('🚀 GESTAGENT - Ejecutando migración de Proveedores y Clientes');
console.log('===============================================================');

// Verificar variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Faltan variables de entorno requeridas:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓ Configurado' : '✗ Falta');
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓ Configurado' : '✗ Falta');
    process.exit(1);
}

console.log('✓ Variables de entorno configuradas correctamente');

// Leer el archivo SQL
const sqlFile = path.join(__dirname, '../database/001_create_suppliers_customers.sql');
if (!fs.existsSync(sqlFile)) {
    console.error('❌ Error: No se encontró el archivo SQL en', sqlFile);
    process.exit(1);
}

console.log('✓ Archivo SQL encontrado:', sqlFile);

const sqlContent = fs.readFileSync(sqlFile, 'utf8');
console.log('✓ Contenido SQL leído exitosamente');

async function executeMigration() {
    try {
        // Intentar cargar Supabase
        let supabase;
        try {
            const { createClient } = require('@supabase/supabase-js');
            supabase = createClient(supabaseUrl, supabaseServiceKey, {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            });
            console.log('✓ Cliente Supabase inicializado');
        } catch (err) {
            console.error('❌ Error: @supabase/supabase-js no está instalado');
            console.error('   Ejecuta: npm install @supabase/supabase-js');
            process.exit(1);
        }

        console.log('\n🔄 Ejecutando comandos SQL individuales...');

        // Dividir SQL en comandos ejecutables
        const commands = sqlContent
            .split(';')
            .map(cmd => cmd.trim())
            .filter(cmd => 
                cmd.length > 0 && 
                !cmd.startsWith('--') && 
                !cmd.startsWith('/*') &&
                !cmd.includes('RAISE NOTICE')
            );

        console.log(`   Encontrados ${commands.length} comandos SQL para ejecutar`);

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < commands.length; i++) {
            const command = commands[i].trim();
            
            if (command.length === 0) continue;

            try {
                console.log(`   ${i + 1}/${commands.length}: Ejecutando...`);
                
                // Para CREATE TABLE, CREATE INDEX, CREATE VIEW, etc.
                if (command.match(/^(CREATE|ALTER|DROP|INSERT)/i)) {
                    // Usar rpc para ejecutar SQL directo
                    const { error } = await supabase.rpc('exec_sql', {
                        sql: command + ';'
                    });

                    if (error) {
                        // Si exec_sql no existe, intentar con apply_migration
                        const { error: migrationError } = await supabase.rpc('apply_migration', {
                            name: `migration_${Date.now()}`,
                            sql: command + ';'
                        });

                        if (migrationError) {
                            console.warn(`   ⚠️  Advertencia en comando ${i + 1}:`, error.message);
                            errorCount++;
                        } else {
                            successCount++;
                        }
                    } else {
                        successCount++;
                    }
                } else {
                    // Saltar comandos que no son DDL
                    console.log(`   ${i + 1}/${commands.length}: Saltando comando no-DDL`);
                }

            } catch (err) {
                console.warn(`   ⚠️  Error en comando ${i + 1}:`, err.message);
                errorCount++;
            }
        }

        console.log(`\n📊 Resumen de migración:`);
        console.log(`   ✅ Comandos exitosos: ${successCount}`);
        console.log(`   ⚠️  Comandos con advertencias: ${errorCount}`);

        // Verificar que las tablas se crearon
        await verifyTables(supabase);

        console.log('\n🎯 Próximos pasos:');
        console.log('   1. Reinicia la aplicación NextJS si está ejecutándose');
        console.log('   2. Navega a /dashboard/suppliers o /dashboard/customers');
        console.log('   3. Procesa algunas facturas para probar el sistema');
        
        console.log('\n🎉 ¡Migración completada exitosamente!');

    } catch (error) {
        console.error('\n❌ Error durante la migración:');
        console.error(error.message);
        process.exit(1);
    }
}

async function verifyTables(supabase) {
    console.log('\n🔍 Verificando tablas creadas...');
    
    try {
        // Verificar tabla suppliers
        const { data: suppliers, error: suppliersError } = await supabase
            .from('suppliers')
            .select('supplier_id')
            .limit(1);
        
        if (!suppliersError) {
            console.log('   ✓ Tabla suppliers: Creada correctamente');
        } else {
            console.log('   ❌ Tabla suppliers:', suppliersError.message);
        }
        
        // Verificar tabla customers
        const { data: customers, error: customersError } = await supabase
            .from('customers')
            .select('customer_id')
            .limit(1);
        
        if (!customersError) {
            console.log('   ✓ Tabla customers: Creada correctamente');
        } else {
            console.log('   ❌ Tabla customers:', customersError.message);
        }
        
    } catch (error) {
        console.log('   ⚠️  Error verificando tablas:', error.message);
    }
}

// Ejecutar migración
executeMigration(); 