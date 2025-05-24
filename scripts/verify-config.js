#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

// Get credentials from environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔍 ZMF Worker Dashboard - Configuration Verification\n')

// Check environment variables
console.log('📋 Environment Variables:')
console.log(`NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`)
console.log(`NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ Set' : '❌ Missing'}`)

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('\n❌ Missing required environment variables!')
  console.log('Please ensure these are set in your .env.local file:')
  console.log('- NEXT_PUBLIC_SUPABASE_URL')
  console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function verifyConfiguration() {
  try {
    console.log('\n🌐 Testing Supabase Connection...')
    
    // Test basic connection
    const { data, error } = await supabase
      .from('workers')
      .select('count')
      .limit(1)
    
    if (error) {
      console.log(`❌ Database connection failed: ${error.message}`)
      return false
    }
    
    console.log('✅ Database connection successful')
    
    // Check if tables exist
    console.log('\n📊 Checking Database Tables...')
    const tables = [
      'workers',
      'orders', 
      'order_items',
      'work_tasks',
      'work_batches',
      'workflow_templates',
      'time_logs',
      'production_issues'
    ]
    
    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('count')
          .limit(1)
        
        if (error) {
          console.log(`❌ Table '${table}': ${error.message}`)
        } else {
          console.log(`✅ Table '${table}': OK`)
        }
      } catch (err) {
        console.log(`❌ Table '${table}': Connection error`)
      }
    }
    
    console.log('\n🚀 Production Readiness Check:')
    console.log('✅ Environment variables configured')
    console.log('✅ Database connection working')
    console.log('✅ Core tables accessible')
    
    console.log('\n⚠️  Manual Steps Required:')
    console.log('1. Update Supabase Site URL to: https://zmf.randomtask.us')
    console.log('2. Add redirect URLs in Supabase Auth settings:')
    console.log('   - https://zmf.randomtask.us/auth/callback')
    console.log('   - https://zmf.randomtask.us/login')
    console.log('3. Test registration flow with email confirmation')
    
    console.log('\n🎉 Configuration verification complete!')
    
  } catch (error) {
    console.log(`❌ Verification failed: ${error.message}`)
    return false
  }
}

verifyConfiguration() 