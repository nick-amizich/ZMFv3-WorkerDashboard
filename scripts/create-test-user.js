#!/usr/bin/env node

/**
 * Script to create a test user for development
 * Usage: node scripts/create-test-user.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables. Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY are set in .env.local')
  process.exit(1)
}

// Create a Supabase client with the service key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createTestUser() {
  console.log('🚀 Creating test user...')

  try {
    // Test user details
    const email = 'test@zmf.local'
    const password = 'testpass123'
    const name = 'Test Manager'

    // Create auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name }
    })

    if (authError) {
      console.error('❌ Error creating auth user:', authError.message)
      process.exit(1)
    }

    console.log('✅ Auth user created:', authUser.user.id)

    // Create worker record
    const { data: worker, error: workerError } = await supabase
      .from('workers')
      .insert([{
        auth_user_id: authUser.user.id,
        name,
        email,
        role: 'manager',
        is_active: true,
        approval_status: 'approved'
      }])
      .select()
      .single()

    if (workerError) {
      console.error('❌ Error creating worker record:', workerError.message)
      // Try to clean up the auth user
      await supabase.auth.admin.deleteUser(authUser.user.id)
      process.exit(1)
    }

    console.log('✅ Worker record created:', worker.id)
    console.log('\n📋 Test User Credentials:')
    console.log('   Email:', email)
    console.log('   Password:', password)
    console.log('   Role: Manager (with full access)')
    console.log('\nYou can now login at http://localhost:3000/login')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

// Run the script
createTestUser()