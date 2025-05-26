const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables!')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function executeSQLFile(filePath, fileName) {
  console.log(`\n📄 Applying migration: ${fileName}`)
  console.log('=' + '='.repeat(fileName.length + 19))
  
  const sql = fs.readFileSync(filePath, 'utf8')
  
  // Split into individual statements
  const statements = sql
    .split(/;\s*$/m)
    .filter(s => s.trim())
    .map(s => s.trim() + ';')
  
  let successCount = 0
  let errorCount = 0
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    if (!statement.trim() || statement.trim() === ';') continue
    
    // Get first 50 chars of statement for logging
    const preview = statement.substring(0, 50).replace(/\n/g, ' ') + '...'
    
    try {
      // Use raw HTTP request to execute SQL
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/query`, {
        method: 'POST',
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ query: statement })
      })
      
      if (response.ok) {
        console.log(`✅ [${i+1}/${statements.length}] ${preview}`)
        successCount++
      } else {
        const error = await response.text()
        console.error(`❌ [${i+1}/${statements.length}] ${preview}`)
        console.error(`   Error: ${error}`)
        errorCount++
      }
    } catch (error) {
      console.error(`❌ [${i+1}/${statements.length}] ${preview}`)
      console.error(`   Error: ${error.message}`)
      errorCount++
    }
  }
  
  console.log(`\nSummary: ${successCount} successful, ${errorCount} failed`)
  return { successCount, errorCount }
}

async function applyAllMigrations() {
  console.log('🚀 Starting migration process...\n')
  
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations')
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort()
  
  console.log(`Found ${files.length} migration files:\n`)
  files.forEach((f, i) => console.log(`${i + 1}. ${f}`))
  
  let totalSuccess = 0
  let totalErrors = 0
  
  for (const file of files) {
    const filePath = path.join(migrationsDir, file)
    const { successCount, errorCount } = await executeSQLFile(filePath, file)
    totalSuccess += successCount
    totalErrors += errorCount
  }
  
  console.log('\n' + '='.repeat(50))
  console.log('🏁 Migration process complete!')
  console.log(`Total: ${totalSuccess} successful statements, ${totalErrors} failed statements`)
  
  if (totalErrors > 0) {
    console.log('\n⚠️  Some migrations failed. This might be because:')
    console.log('- Tables/functions already exist')
    console.log('- RLS policies are already in place')
    console.log('- You need to check the specific errors above')
  }
}

// Create a function to execute SQL directly
async function executeSQL(sql) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/query`, {
    method: 'POST',
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ query: sql })
  })
  
  if (!response.ok) {
    throw new Error(await response.text())
  }
  
  return response
}

// First, create the query function if it doesn't exist
async function ensureQueryFunction() {
  console.log('🔧 Ensuring query function exists...')
  
  const createFunction = `
    CREATE OR REPLACE FUNCTION query(sql text)
    RETURNS json
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      result json;
    BEGIN
      EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || sql || ') t' INTO result;
      RETURN COALESCE(result, '[]'::json);
    END;
    $$;
  `
  
  try {
    // Try using the service role key directly with the SQL endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
      method: 'POST',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        query: createFunction
      })
    })
    
    if (response.ok) {
      console.log('✅ Query function created')
    } else {
      console.log('⚠️  Could not create query function, will try direct execution')
    }
  } catch (error) {
    console.log('⚠️  Could not create query function, will try direct execution')
  }
}

// Run everything
async function main() {
  try {
    await ensureQueryFunction()
    await applyAllMigrations()
  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  }
}

main()