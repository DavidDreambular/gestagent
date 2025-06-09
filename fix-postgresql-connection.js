const { Client } = require('pg');

async function testAndFixPostgreSQL() {
  console.log('🔍 Testing PostgreSQL Connection...');
  
  // Configuraciones a probar
  const configs = [
    {
      name: 'Config 1: gestagent_user',
      config: {
        host: 'localhost',
        port: 5433,
        database: 'gestagent',
        user: 'gestagent_user',
        password: 'gestagent_pass_2024'
      }
    },
    {
      name: 'Config 2: postgres user',
      config: {
        host: 'localhost',
        port: 5433,
        database: 'gestagent',
        user: 'postgres',
        password: 'postgres'
      }
    },
    {
      name: 'Config 3: admin user',
      config: {
        host: 'localhost',
        port: 5433,
        database: 'gestagent',
        user: 'admin',
        password: 'admin123'
      }
    }
  ];

  for (const { name, config } of configs) {
    console.log(`\n🧪 Testing: ${name}`);
    const client = new Client(config);
    
    try {
      await client.connect();
      console.log(`✅ Connected with ${name}`);
      
      // Test query
      const result = await client.query('SELECT current_user, current_database(), version()');
      console.log(`   Current user: ${result.rows[0].current_user}`);
      console.log(`   Database: ${result.rows[0].current_database}`);
      
      // Test users table
      try {
        const users = await client.query('SELECT COUNT(*) as count FROM users');
        console.log(`   Users in table: ${users.rows[0].count}`);
        
        // Show some users
        const sampleUsers = await client.query('SELECT id, email, role FROM users LIMIT 3');
        console.log('   Sample users:');
        sampleUsers.rows.forEach(user => {
          console.log(`     - ${user.email} (${user.role})`);
        });
        
        console.log(`\n🎉 SUCCESS! Use this configuration:`);
        console.log(`DATABASE_URL=postgresql://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`);
        
        break; // Exit loop on success
        
      } catch (tableError) {
        console.log(`   ❌ Table access error: ${tableError.message}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Connection failed: ${error.message}`);
    } finally {
      await client.end();
    }
  }
}

// También crear el archivo .env.local correcto
async function createEnvFile(dbConfig) {
  const fs = require('fs');
  
  const envContent = `# ===============================================
# GESTAGENT - Configuración Ambiente Local
# ===============================================

# ===== DATABASE (PostgreSQL) =====
DATABASE_URL=postgresql://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}
POSTGRESQL_URL=postgresql://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}

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
  console.log('\n📝 Created .env.local file with correct configuration');
}

testAndFixPostgreSQL().catch(console.error); 