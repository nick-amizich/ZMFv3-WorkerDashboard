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
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// First, let's just create the approval functions we need
async function createApprovalFunctions() {
  console.log('🚀 Creating worker approval functions...\n')
  
  const functions = [
    {
      name: 'approve_worker',
      sql: `
        CREATE OR REPLACE FUNCTION approve_worker(
          p_worker_id UUID,
          p_approved_by_id UUID
        )
        RETURNS BOOLEAN AS $$
        BEGIN
          UPDATE workers
          SET 
            approval_status = 'approved',
            approved_by = p_approved_by_id,
            approved_at = NOW(),
            is_active = true
          WHERE id = p_worker_id
          AND approval_status = 'pending';
          
          RETURN FOUND;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    },
    {
      name: 'reject_worker',
      sql: `
        CREATE OR REPLACE FUNCTION reject_worker(
          p_worker_id UUID,
          p_rejected_by_id UUID,
          p_reason TEXT
        )
        RETURNS BOOLEAN AS $$
        BEGIN
          UPDATE workers
          SET 
            approval_status = 'rejected',
            rejection_reason = p_reason,
            approved_by = p_rejected_by_id,
            approved_at = NOW(),
            is_active = false
          WHERE id = p_worker_id
          AND approval_status = 'pending';
          
          RETURN FOUND;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    },
    {
      name: 'suspend_worker',
      sql: `
        CREATE OR REPLACE FUNCTION suspend_worker(
          p_worker_id UUID,
          p_suspended_by_id UUID,
          p_reason TEXT
        )
        RETURNS BOOLEAN AS $$
        BEGIN
          UPDATE workers
          SET 
            approval_status = 'suspended',
            suspension_reason = p_reason,
            suspended_at = NOW(),
            is_active = false
          WHERE id = p_worker_id
          AND approval_status = 'approved';
          
          RETURN FOUND;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    },
    {
      name: 'reactivate_worker',
      sql: `
        CREATE OR REPLACE FUNCTION reactivate_worker(
          p_worker_id UUID,
          p_reactivated_by_id UUID
        )
        RETURNS BOOLEAN AS $$
        BEGIN
          UPDATE workers
          SET 
            approval_status = 'approved',
            suspension_reason = NULL,
            suspended_at = NULL,
            is_active = true
          WHERE id = p_worker_id
          AND approval_status = 'suspended';
          
          RETURN FOUND;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    }
  ]
  
  // We'll use a workaround - create a temporary table to execute our functions
  console.log('Creating functions via workaround...\n')
  
  for (const func of functions) {
    console.log(`Creating ${func.name}...`)
    
    // We can't execute arbitrary SQL via REST API, but we can use a trick
    // Let's check if the function already exists by trying to call it
    const { error } = await supabase.rpc(func.name, {
      p_worker_id: '00000000-0000-0000-0000-000000000000',
      p_approved_by_id: '00000000-0000-0000-0000-000000000000'
    })
    
    if (error?.message?.includes('schema cache')) {
      console.log(`❌ ${func.name} does not exist - needs to be created manually`)
    } else {
      console.log(`✅ ${func.name} already exists`)
    }
  }
  
  console.log('\n📋 Manual steps required:')
  console.log('1. Go to: https://supabase.com/dashboard/project/kjdicpudxqxenhjwdrzg/sql/new')
  console.log('2. Copy the content from: /scripts/create-approval-functions.sql')
  console.log('3. Paste and execute in the SQL editor')
  console.log('\nOR run this command to copy the SQL to your clipboard:')
  console.log('cat scripts/create-approval-functions.sql | pbcopy')
}

// Test the functions
async function testFunctions() {
  console.log('\n🧪 Testing functions...\n')
  
  const functions = ['approve_worker', 'reject_worker', 'suspend_worker', 'reactivate_worker']
  
  for (const funcName of functions) {
    const { error } = await supabase.rpc(funcName, {
      p_worker_id: '00000000-0000-0000-0000-000000000000',
      p_approved_by_id: '00000000-0000-0000-0000-000000000000',
      p_reason: 'test'
    })
    
    if (error?.message?.includes('schema cache')) {
      console.log(`❌ ${funcName}: NOT FOUND`)
    } else if (error) {
      console.log(`✅ ${funcName}: EXISTS (error: ${error.message})`)
    } else {
      console.log(`✅ ${funcName}: EXISTS and callable`)
    }
  }
}

async function main() {
  await createApprovalFunctions()
  await testFunctions()
  
  console.log('\n💡 Alternative approach:')
  console.log('If you have the Supabase CLI database password, run:')
  console.log('cd /Users/nickamizich/localdev/ZMFv3-WorkerDashboard')
  console.log('npx supabase db push')
}

main().catch(console.error)