const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function applyMigration() {
  console.log('Applying worker approval functions migration...\n')
  
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250205_add_worker_approval_functions.sql')
  const sql = fs.readFileSync(migrationPath, 'utf8')
  
  // Split by statement and execute each one
  const statements = sql.split(/;\s*$/m).filter(s => s.trim())
  
  for (const statement of statements) {
    if (!statement.trim()) continue
    
    console.log('Executing:', statement.substring(0, 50) + '...')
    
    try {
      const { data, error } = await supabase
        .from('_sql')
        .select()
        .rpc('exec', { query: statement + ';' })
      
      if (error) {
        // Try direct approach
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/query`, {
          method: 'POST',
          headers: {
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query: statement + ';' })
        })
        
        if (!response.ok) {
          console.error('❌ Failed:', await response.text())
        } else {
          console.log('✅ Success')
        }
      } else {
        console.log('✅ Success')
      }
    } catch (e) {
      console.error('❌ Error:', e.message)
    }
  }
  
  console.log('\nChecking if functions exist now...')
  
  const functions = ['approve_worker', 'reject_worker', 'suspend_worker', 'reactivate_worker']
  
  for (const funcName of functions) {
    const { error } = await supabase.rpc(funcName, {
      p_worker_id: '00000000-0000-0000-0000-000000000000',
      p_approved_by_id: '00000000-0000-0000-0000-000000000000'
    })
    
    if (error?.message?.includes('schema cache')) {
      console.log(`❌ ${funcName}: Still not found`)
    } else {
      console.log(`✅ ${funcName}: Now exists!`)
    }
  }
  
  console.log('\n⚠️  If functions still don\'t exist, you may need to:')
  console.log('1. Run the migration directly in Supabase SQL Editor')
  console.log('2. Or use: npx supabase db push')
}

applyMigration().catch(console.error)