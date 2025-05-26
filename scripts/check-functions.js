const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkFunctions() {
  console.log('Checking for worker management functions...\n')
  
  const functions = [
    'approve_worker',
    'reject_worker',
    'suspend_worker',
    'reactivate_worker'
  ]
  
  for (const funcName of functions) {
    const { data, error } = await supabase
      .rpc(funcName, {
        p_worker_id: '00000000-0000-0000-0000-000000000000',
        p_approved_by_id: '00000000-0000-0000-0000-000000000000'
      })
    
    if (error?.message?.includes('schema cache')) {
      console.log(`❌ ${funcName}: NOT FOUND`)
    } else if (error) {
      console.log(`✅ ${funcName}: EXISTS (error: ${error.message})`)
    } else {
      console.log(`✅ ${funcName}: EXISTS`)
    }
  }
  
  console.log('\nChecking tables...')
  const tables = ['workers', 'user_management_audit_log', 'worker_invitations']
  
  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .select('*')
      .limit(0)
    
    if (error) {
      console.log(`❌ ${table}: ${error.message}`)
    } else {
      console.log(`✅ ${table}: EXISTS`)
    }
  }
}

checkFunctions().catch(console.error)