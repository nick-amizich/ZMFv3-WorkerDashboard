require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

async function applyRepairMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables:')
    console.error('- NEXT_PUBLIC_SUPABASE_URL')
    console.error('- SUPABASE_SERVICE_ROLE_KEY')
    console.error('Please set these in your .env.local file')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false
    }
  })

  try {
    console.log('🚀 Applying repair system migration...\n')

    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250530_create_repair_system.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log(`📋 Found ${statements.length} SQL statements to execute\n`)

    // Execute each statement
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'
      
      // Extract a description from the statement
      let description = statement.substring(0, 50).replace(/\n/g, ' ')
      if (statement.includes('CREATE TABLE')) {
        const match = statement.match(/CREATE TABLE (\w+)/)
        description = `Creating table: ${match ? match[1] : 'unknown'}`
      } else if (statement.includes('CREATE INDEX')) {
        const match = statement.match(/CREATE INDEX (\w+)/)
        description = `Creating index: ${match ? match[1] : 'unknown'}`
      } else if (statement.includes('CREATE POLICY')) {
        const match = statement.match(/CREATE POLICY "([^"]+)"/)
        description = `Creating policy: ${match ? match[1] : 'unknown'}`
      } else if (statement.includes('CREATE FUNCTION')) {
        const match = statement.match(/CREATE (?:OR REPLACE )?FUNCTION (\w+)/)
        description = `Creating function: ${match ? match[1] : 'unknown'}`
      } else if (statement.includes('ALTER TABLE')) {
        const match = statement.match(/ALTER TABLE (\w+)/)
        description = `Altering table: ${match ? match[1] : 'unknown'}`
      }

      process.stdout.write(`[${i + 1}/${statements.length}] ${description}... `)

      const { error } = await supabase.rpc('exec_sql', {
        sql: statement
      }).single()

      if (error) {
        // Try direct execution as backup
        const { error: directError } = await supabase.from('_sql').insert({
          query: statement
        })

        if (directError) {
          console.log('❌')
          console.error(`Error: ${error.message || directError.message}`)
          errorCount++
        } else {
          console.log('✅')
          successCount++
        }
      } else {
        console.log('✅')
        successCount++
      }
    }

    console.log('\n📊 Migration Summary:')
    console.log(`✅ Successful: ${successCount}`)
    console.log(`❌ Failed: ${errorCount}`)

    if (errorCount > 0) {
      console.log('\n⚠️  Some statements failed. This might be okay if tables/policies already exist.')
      console.log('You may need to run the failed statements manually in Supabase SQL editor.')
    } else {
      console.log('\n🎉 Migration completed successfully!')
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  }
}

// Run the migration
applyRepairMigration()