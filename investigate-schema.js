const { Client } = require('pg');

async function investigateSchema() {
  console.log('🔍 Investigating PostgreSQL Schema...');
  
  const client = new Client({
    host: 'localhost',
    port: 5433,  
    database: 'gestagent',
    user: 'gestagent_user',
    password: 'gestagent_pass_2024'
  });

  try {
    await client.connect();
    console.log('✅ Connected successfully!');
    
    // 1. List all tables
    console.log('\n📋 Tables in database:');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    // 2. Check users table structure
    console.log('\n👥 Users table structure:');
    const usersStructure = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    if (usersStructure.rows.length > 0) {
      usersStructure.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
      });
      
      // 3. Show sample users with correct column names
      const columns = usersStructure.rows.map(col => col.column_name);
      const sampleQuery = `SELECT ${columns.join(', ')} FROM users LIMIT 3`;
      
      console.log('\n👤 Sample users:');
      const sampleUsers = await client.query(sampleQuery);
      sampleUsers.rows.forEach((user, index) => {
        console.log(`   User ${index + 1}:`);
        Object.entries(user).forEach(([key, value]) => {
          console.log(`     ${key}: ${value}`);
        });
        console.log('');
      });
      
    } else {
      console.log('   ❌ No users table found!');
    }
    
    // 4. Check documents table if exists
    console.log('\n📄 Documents table structure:');
    const docsStructure = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'documents' 
      ORDER BY ordinal_position
    `);
    
    if (docsStructure.rows.length > 0) {
      docsStructure.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log('   ⚠️ No documents table found');
    }

    // 5. Create .env.local with correct config
    const fs = require('fs');
    const envContent = `# ===============================================
# GESTAGENT - Configuración Ambiente Local
# ===============================================

# ===== DATABASE (PostgreSQL) =====
DATABASE_URL=postgresql://gestagent_user:gestagent_pass_2024@localhost:5433/gestagent
POSTGRESQL_URL=postgresql://gestagent_user:gestagent_pass_2024@localhost:5433/gestagent

# ===== NEXTAUTH =====
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=gestagent-secret-key-super-secure-2024

# ===== API KEYS (Replace with real keys) =====
MISTRAL_API_KEY=your-mistral-api-key-here
OPENAI_API_KEY=your-openai-api-key-here

# ===== APP CONFIG =====
NODE_ENV=development
API_URL=http://localhost:3000/api
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ===== DEBUG =====
DEBUG=true
NEXT_PUBLIC_DEBUG=true
`;

    fs.writeFileSync('.env.local', envContent);
    console.log('\n📝 Created .env.local file with working PostgreSQL configuration!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

investigateSchema().catch(console.error); 