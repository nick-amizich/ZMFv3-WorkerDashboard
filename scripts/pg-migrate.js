
const { Client } = require('pg')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

// You need to add this to your .env.local:
// DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-us-east-2.pooler.supabase.com:6543/postgres

async function runMigrations() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  })
  
  await client.connect()
  
  try {
    const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations')
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort()
    
    for (const file of files) {
      console.log(`Running ${file}...`)
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
      
      // Split into statements
      const statements = sql.split(/;\s*$/m).filter(s => s.trim())
      
      for (const statement of statements) {
        try {
          await client.query(statement)
          console.log('✅ Success')
        } catch (error) {
          console.log(`⚠️  ${error.message}`)
        }
      }
    }
  } finally {
    await client.end()
  }
}

runMigrations().catch(console.error)
