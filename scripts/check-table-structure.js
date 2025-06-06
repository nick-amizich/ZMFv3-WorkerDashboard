const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
);

async function checkTableStructure() {
  // Check bugs table structure
  const { data: bugs, error: bugsError } = await supabase
    .rpc('query', { 
      query: `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'bugs' 
        AND table_schema = 'public'
        ORDER BY ordinal_position;
      `
    });
    
  if (bugsError) {
    console.log('Failed to get bugs structure, trying direct query...');
    // Try a simple select to see what columns exist
    const { data, error } = await supabase
      .from('bugs')
      .select('*')
      .limit(0);
    
    if (!error && data !== null) {
      console.log('Bugs table exists but might have different columns');
    }
  } else {
    console.log('Bugs table structure:', bugs);
  }
  
  // Check test_runs constraints
  const { data: constraints, error: constraintsError } = await supabase
    .rpc('query', {
      query: `
        SELECT conname, consrc 
        FROM pg_constraint 
        WHERE conrelid = 'test_runs'::regclass 
        AND contype = 'c';
      `
    });
    
  if (!constraintsError) {
    console.log('Test runs constraints:', constraints);
  }
}

// Alternative approach - try to insert with minimal fields
async function testMinimalInserts() {
  console.log('\n🧪 Testing minimal inserts...');
  
  // Try minimal bug
  const { data: bug, error: bugError } = await supabase
    .from('bugs')
    .insert({
      title: 'Test Bug',
      description: 'Test description',
      severity: 'medium',
      status: 'open'
    })
    .select()
    .single();
    
  if (bugError) {
    console.log('Bug insert error:', bugError.message);
  } else {
    console.log('✅ Bug created with minimal fields');
  }
  
  // Try minimal test run
  const { data: testRun, error: runError } = await supabase
    .from('test_runs')
    .insert({
      branch: 'main',
      commit_sha: 'test123',
      total_tests: 10,
      passed_tests: 10,
      failed_tests: 0,
      status: 'completed'
    })
    .select()
    .single();
    
  if (runError) {
    console.log('Test run insert error:', runError.message);
  } else {
    console.log('✅ Test run created with minimal fields');
  }
}

async function run() {
  await checkTableStructure();
  await testMinimalInserts();
}

run().catch(console.error);