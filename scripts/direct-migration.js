const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

// Extract connection details from Supabase URL
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Parse the project ref from the URL
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
if (!projectRef) {
  console.error('❌ Could not parse project ref from Supabase URL')
  process.exit(1)
}

console.log(`🔗 Project: ${projectRef}`)
console.log(`🔑 Service Role Key: ${serviceRoleKey.substring(0, 20)}...`)

async function executeSQLViaAPI(sql) {
  // Supabase doesn't expose a direct SQL execution endpoint via REST
  // But we can use the Edge Function approach
  
  const response = await fetch(`${supabaseUrl}/functions/v1/execute-sql`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql })
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(error)
  }
  
  return await response.json()
}

// Let's create an Edge Function to execute SQL
async function createSQLExecutor() {
  console.log('📝 Creating SQL executor edge function...')
  
  const edgeFunctionCode = `
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const { query } = await req.json()
    
    // Get the service role key from the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401 })
    }
    
    const token = authHeader.replace('Bearer ', '')
    
    // Create a Supabase client with the service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabase = createClient(supabaseUrl, token)
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('query', { sql: query })
    
    if (error) throw error
    
    return new Response(JSON.stringify({ data }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
`

  // This would need to be deployed via Supabase CLI
  console.log('⚠️  Edge function approach requires Supabase CLI deployment')
}

// Alternative: Use the pg library directly
async function setupDirectConnection() {
  console.log('\n🔧 Setting up direct connection...')
  console.log('\nTo run migrations directly, you need to:')
  console.log('1. Install pg: npm install pg')
  console.log('2. Get your database password from Supabase dashboard')
  console.log('3. Run: node scripts/pg-migrate.js')
  
  // Create the pg migration script
  const pgScript = `
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
      console.log(\`Running \${file}...\`)
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
      
      // Split into statements
      const statements = sql.split(/;\\s*$/m).filter(s => s.trim())
      
      for (const statement of statements) {
        try {
          await client.query(statement)
          console.log('✅ Success')
        } catch (error) {
          console.log(\`⚠️  \${error.message}\`)
        }
      }
    }
  } finally {
    await client.end()
  }
}

runMigrations().catch(console.error)
`

  fs.writeFileSync(path.join(__dirname, 'pg-migrate.js'), pgScript)
  console.log('\n✅ Created: scripts/pg-migrate.js')
}

// The simplest approach: Generate a SQL file to run manually
async function generateConsolidatedSQL() {
  console.log('\n📄 Generating consolidated SQL file...')
  
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations')
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort()
  
  let consolidatedSQL = '-- Consolidated migrations for ZMF Worker Dashboard\n'
  consolidatedSQL += `-- Generated on ${new Date().toISOString()}\n\n`
  
  for (const file of files) {
    consolidatedSQL += `-- ========================================\n`
    consolidatedSQL += `-- Migration: ${file}\n`
    consolidatedSQL += `-- ========================================\n\n`
    
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
    consolidatedSQL += sql + '\n\n'
  }
  
  const outputPath = path.join(__dirname, 'all-migrations.sql')
  fs.writeFileSync(outputPath, consolidatedSQL)
  
  console.log(`✅ Created: ${outputPath}`)
  console.log('\n📋 Next steps:')
  console.log('1. Copy to clipboard: cat scripts/all-migrations.sql | pbcopy')
  console.log('2. Go to: https://supabase.com/dashboard/project/kjdicpudxqxenhjwdrzg/sql/new')
  console.log('3. Paste and execute')
}

// Main execution
async function main() {
  console.log('🚀 Fixing migration setup...\n')
  
  // Generate consolidated SQL for manual execution
  await generateConsolidatedSQL()
  
  // Setup direct connection script
  await setupDirectConnection()
  
  console.log('\n✨ Quick fix for approval functions:')
  console.log('Run: cat scripts/create-approval-functions.sql | pbcopy')
  console.log('Then paste in Supabase SQL editor')
}

main().catch(console.error)