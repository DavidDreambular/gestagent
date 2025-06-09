const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://gestagent_user:gestagent_pass_2024@localhost:5433/gestagent'
});

// Colores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(level, message, details = null) {
  const timestamp = new Date().toISOString();
  let colorCode = colors.reset;
  let emoji = '';
  
  switch (level) {
    case 'success':
      colorCode = colors.green;
      emoji = '✅';
      break;
    case 'error':
      colorCode = colors.red;
      emoji = '❌';
      break;
    case 'warning':
      colorCode = colors.yellow;
      emoji = '⚠️';
      break;
    case 'info':
      colorCode = colors.blue;
      emoji = 'ℹ️';
      break;
    case 'debug':
      colorCode = colors.cyan;
      emoji = '🔍';
      break;
    default:
      emoji = '📝';
  }
  
  console.log(`${colorCode}${emoji} [${timestamp.split('T')[1].split('.')[0]}] ${message}${colors.reset}`);
  if (details) {
    console.log(`   ${JSON.stringify(details, null, 2)}`);
  }
}

async function testDatabaseConnection() {
  log('info', '🔌 TESTING DATABASE CONNECTION');
  
  try {
    const result = await pool.query('SELECT version(), current_database(), current_user');
    const row = result.rows[0];
    
    log('success', 'Database connection successful');
    log('debug', 'Database info', {
      version: row.version.split(',')[0],
      database: row.current_database,
      user: row.current_user
    });
    
    return true;
  } catch (error) {
    log('error', 'Database connection failed', { error: error.message });
    return false;
  }
}

async function testTableStructures() {
  log('info', '🗃️ TESTING TABLE STRUCTURES');
  
  const tables = ['users', 'documents', 'suppliers', 'customers', 'audit_logs'];
  const results = {};
  
  for (const table of tables) {
    try {
      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = $1 
        ORDER BY ordinal_position
      `, [table]);
      
      if (result.rows.length > 0) {
        results[table] = {
          status: 'exists',
          columns: result.rows.length,
          structure: result.rows
        };
        log('success', `Table ${table} exists with ${result.rows.length} columns`);
      } else {
        results[table] = { status: 'missing' };
        log('error', `Table ${table} does not exist`);
      }
    } catch (error) {
      results[table] = { status: 'error', error: error.message };
      log('error', `Error checking table ${table}`, { error: error.message });
    }
  }
  
  return results;
}

async function testAuditSystem() {
  log('info', '🔐 TESTING AUDIT SYSTEM');
  
  try {
    // Test audit table
    const auditCount = await pool.query('SELECT COUNT(*) as count FROM audit_logs');
    log('debug', `Audit logs count: ${auditCount.rows[0].count}`);
    
    // Test audit functions
    const functions = await pool.query(`
      SELECT routine_name, routine_type
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name LIKE '%audit%'
    `);
    
    log('success', `Audit functions found: ${functions.rows.length}`);
    functions.rows.forEach(func => {
      log('debug', `Function: ${func.routine_name} (${func.routine_type})`);
    });
    
    // Test audit view
    const viewExists = await pool.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_name = 'audit_logs_view'
    `);
    
    if (viewExists.rows.length > 0) {
      log('success', 'Audit logs view exists');
    } else {
      log('warning', 'Audit logs view not found');
    }
    
    // Test manual audit logging
    const testUserId = '00000000-0000-4000-8000-000000000000'; // UUID válido de prueba
    await pool.query(`
      SELECT log_audit_action(
        $1::UUID,
        'TEST_DEBUG',
        'system',
        'debug_test',
        NULL,
        '{"test": "debug_functionality"}'::jsonb,
        '127.0.0.1'::inet,
        'Debug Test Script',
        'debug_session',
        'debug_request',
        '{"source": "debug_test"}'::jsonb
      )
    `, [testUserId]);
    
    log('success', 'Manual audit logging test passed');
    
    return true;
  } catch (error) {
    log('error', 'Audit system test failed', { error: error.message });
    return false;
  }
}

async function testFileStructure() {
  log('info', '📁 TESTING FILE STRUCTURE');
  
  const criticalFiles = [
    // Audit system
    'services/audit.service.ts',
    'app/dashboard/audit/page.tsx',
    'app/api/audit/logs/route.ts',
    'app/api/audit/users/route.ts',
    'app/api/audit/export/route.ts',
    
    // Quick wins
    'hooks/useAutoSave.ts',
    'components/documents/SaveIndicator.tsx',
    'components/documents/AutoSaveEditableField.tsx',
    'hooks/useKeyboardShortcuts.ts',
    'components/layout/KeyboardShortcutsHelp.tsx',
    'contexts/ThemeContext.tsx',
    'components/layout/ThemeToggle.tsx',
    
    // Processing features
    'components/documents/ProcessingQueue.tsx',
    'lib/utils/excel-export.ts',
    
    // Core files
    'lib/postgresql-client.ts',
    'components/layout/Header.tsx',
    'components/dashboard/Sidebar.tsx'
  ];
  
  const results = {};
  
  for (const file of criticalFiles) {
    const fullPath = path.join(process.cwd(), file);
    try {
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        results[file] = {
          status: 'exists',
          size: stats.size,
          sizeKB: (stats.size / 1024).toFixed(1)
        };
        log('success', `${file} (${(stats.size / 1024).toFixed(1)} KB)`);
      } else {
        results[file] = { status: 'missing' };
        log('error', `${file} - Missing`);
      }
    } catch (error) {
      results[file] = { status: 'error', error: error.message };
      log('error', `${file} - Error: ${error.message}`);
    }
  }
  
  return results;
}

async function testDependencies() {
  log('info', '📦 TESTING DEPENDENCIES');
  
  try {
    const packageJson = require('../package.json');
    
    const criticalDeps = {
      dependencies: [
        'next',
        'react',
        'typescript',
        'tailwindcss',
        'pg',
        'uuid',
        'fuse.js',
        'xlsx'
      ],
      devDependencies: [
        '@types/node',
        '@types/react',
        '@types/pg',
        '@types/uuid',
        '@types/xlsx'
      ]
    };
    
    const results = { dependencies: {}, devDependencies: {} };
    
    // Check dependencies
    criticalDeps.dependencies.forEach(dep => {
      if (packageJson.dependencies && packageJson.dependencies[dep]) {
        results.dependencies[dep] = {
          status: 'installed',
          version: packageJson.dependencies[dep]
        };
        log('success', `${dep}: ${packageJson.dependencies[dep]}`);
      } else {
        results.dependencies[dep] = { status: 'missing' };
        log('error', `${dep} - Missing`);
      }
    });
    
    // Check dev dependencies
    criticalDeps.devDependencies.forEach(dep => {
      if (packageJson.devDependencies && packageJson.devDependencies[dep]) {
        results.devDependencies[dep] = {
          status: 'installed',
          version: packageJson.devDependencies[dep]
        };
        log('success', `${dep}: ${packageJson.devDependencies[dep]} (dev)`);
      } else {
        results.devDependencies[dep] = { status: 'missing' };
        log('warning', `${dep} - Missing (dev)`);
      }
    });
    
    return results;
  } catch (error) {
    log('error', 'Dependencies test failed', { error: error.message });
    return false;
  }
}

async function testAPIEndpoints() {
  log('info', '🌐 TESTING API ENDPOINTS');
  
  const endpoints = [
    // Document endpoints
    '/api/documents/upload',
    
    // Audit endpoints
    '/api/audit/logs',
    '/api/audit/users',
    '/api/audit/export',
    
    // Auth endpoints
    '/api/auth/register',
    '/api/auth/login'
  ];
  
  const results = {};
  
  for (const endpoint of endpoints) {
    const filePath = path.join(process.cwd(), 'app', `${endpoint}/route.ts`);
    
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const hasGet = content.includes('export async function GET');
        const hasPost = content.includes('export async function POST');
        const hasPut = content.includes('export async function PUT');
        const hasDelete = content.includes('export async function DELETE');
        
        results[endpoint] = {
          status: 'exists',
          methods: {
            GET: hasGet,
            POST: hasPost,
            PUT: hasPut,
            DELETE: hasDelete
          },
          lineCount: content.split('\n').length
        };
        
        const methods = [];
        if (hasGet) methods.push('GET');
        if (hasPost) methods.push('POST');
        if (hasPut) methods.push('PUT');
        if (hasDelete) methods.push('DELETE');
        
        log('success', `${endpoint} - Methods: ${methods.join(', ')}`);
      } catch (error) {
        results[endpoint] = { status: 'error', error: error.message };
        log('error', `${endpoint} - Error reading file`);
      }
    } else {
      results[endpoint] = { status: 'missing' };
      log('warning', `${endpoint} - Route file missing`);
    }
  }
  
  return results;
}

async function testDataIntegrity() {
  log('info', '🔍 TESTING DATA INTEGRITY');
  
  try {
    // Test users
    const users = await pool.query('SELECT COUNT(*) as count, array_agg(DISTINCT role) as roles FROM users');
    log('debug', `Users: ${users.rows[0].count}, Roles: ${users.rows[0].roles?.join(', ') || 'none'}`);
    
    // Test documents
    const documents = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT document_type) as types,
        array_agg(DISTINCT document_type) as type_list
      FROM documents
    `);
    log('debug', `Documents: ${documents.rows[0].total}, Types: ${documents.rows[0].type_list?.join(', ') || 'none'}`);
    
    // Test foreign key relationships
    const orphanedDocs = await pool.query(`
      SELECT COUNT(*) as count 
      FROM documents d 
      LEFT JOIN users u ON d.user_id = u.user_id 
      WHERE u.user_id IS NULL
    `);
    
    if (orphanedDocs.rows[0].count > 0) {
      log('warning', `Found ${orphanedDocs.rows[0].count} orphaned documents`);
    } else {
      log('success', 'All documents have valid user references');
    }
    
    // Test audit logs
    const auditLogs = await pool.query('SELECT COUNT(*) as count FROM audit_logs');
    log('debug', `Audit logs: ${auditLogs.rows[0].count}`);
    
    return true;
  } catch (error) {
    log('error', 'Data integrity test failed', { error: error.message });
    return false;
  }
}

async function performanceTest() {
  log('info', '⚡ TESTING PERFORMANCE');
  
  try {
    // Test database query performance
    const start = Date.now();
    await pool.query(`
      SELECT d.*, u.username 
      FROM documents d 
      JOIN users u ON d.user_id = u.user_id 
      LIMIT 100
    `);
    const dbTime = Date.now() - start;
    
    log('debug', `Database query time: ${dbTime}ms`);
    
    if (dbTime < 100) {
      log('success', 'Database performance: Excellent');
    } else if (dbTime < 500) {
      log('success', 'Database performance: Good');
    } else {
      log('warning', 'Database performance: Slow');
    }
    
    // Test file system access
    const fsStart = Date.now();
    const files = fs.readdirSync(process.cwd());
    const fsTime = Date.now() - fsStart;
    
    log('debug', `File system access time: ${fsTime}ms for ${files.length} files`);
    
    return { dbTime, fsTime };
  } catch (error) {
    log('error', 'Performance test failed', { error: error.message });
    return false;
  }
}

async function generateReport(results) {
  log('info', '📊 GENERATING DEBUG REPORT');
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      database: results.database ? 'OK' : 'FAIL',
      tables: Object.values(results.tables).every(t => t.status === 'exists') ? 'OK' : 'PARTIAL',
      audit: results.audit ? 'OK' : 'FAIL',
      files: Object.values(results.files).every(f => f.status === 'exists') ? 'OK' : 'PARTIAL',
      dependencies: results.dependencies ? 'OK' : 'FAIL',
      endpoints: Object.values(results.endpoints).every(e => e.status === 'exists') ? 'OK' : 'PARTIAL',
      data: results.data ? 'OK' : 'FAIL',
      performance: results.performance ? 'OK' : 'FAIL'
    },
    details: results
  };
  
  // Write report to file
  const reportPath = path.join(process.cwd(), 'debug-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  log('success', `Debug report saved to: ${reportPath}`);
  
  // Console summary
  console.log('\n' + '='.repeat(80));
  console.log(colors.bright + '📋 DEBUG TEST SUMMARY' + colors.reset);
  console.log('='.repeat(80));
  
  Object.entries(report.summary).forEach(([test, status]) => {
    const emoji = status === 'OK' ? '✅' : status === 'PARTIAL' ? '⚠️' : '❌';
    const color = status === 'OK' ? colors.green : status === 'PARTIAL' ? colors.yellow : colors.red;
    console.log(`${emoji} ${color}${test.toUpperCase()}: ${status}${colors.reset}`);
  });
  
  const totalTests = Object.keys(report.summary).length;
  const passedTests = Object.values(report.summary).filter(s => s === 'OK').length;
  const partialTests = Object.values(report.summary).filter(s => s === 'PARTIAL').length;
  
  console.log('\n' + '='.repeat(80));
  console.log(`${colors.bright}RESULTS: ${passedTests}/${totalTests} PASSED, ${partialTests} PARTIAL${colors.reset}`);
  
  if (passedTests === totalTests) {
    console.log(`${colors.green}🎉 ALL TESTS PASSED! GestAgent is ready for production.${colors.reset}`);
  } else if (passedTests + partialTests === totalTests) {
    console.log(`${colors.yellow}⚠️ Most tests passed with minor issues. System is functional.${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ Some critical tests failed. Please review the issues.${colors.reset}`);
  }
  
  console.log('='.repeat(80) + '\n');
  
  return report;
}

async function runCompleteDebugTest() {
  console.log(colors.bright + colors.blue + '\n🔍 GESTAGENT COMPLETE DEBUG TEST' + colors.reset);
  console.log('='.repeat(80) + '\n');
  
  const results = {};
  
  try {
    // Run all tests
    results.database = await testDatabaseConnection();
    results.tables = await testTableStructures();
    results.audit = await testAuditSystem();
    results.files = await testFileStructure();
    results.dependencies = await testDependencies();
    results.endpoints = await testAPIEndpoints();
    results.data = await testDataIntegrity();
    results.performance = await performanceTest();
    
    // Generate final report
    const report = await generateReport(results);
    
    return report;
    
  } catch (error) {
    log('error', 'Debug test suite failed', { error: error.message });
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the complete debug test
if (require.main === module) {
  runCompleteDebugTest()
    .then((report) => {
      process.exit(0);
    })
    .catch((error) => {
      console.error(colors.red + '❌ Debug test suite failed:' + colors.reset, error);
      process.exit(1);
    });
}

module.exports = { runCompleteDebugTest }; 