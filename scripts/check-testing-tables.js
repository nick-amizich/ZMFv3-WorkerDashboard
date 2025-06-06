const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
);

async function checkTestingTables() {
  console.log('Checking testing infrastructure tables...\n');
  
  const tables = [
    'test_runs',
    'test_results', 
    'bugs',
    'error_logs',
    'performance_metrics',
    'test_coverage'
  ];
  
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: exists (${count || 0} records)`);
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
    }
  }
  
  // Check views
  console.log('\nChecking views...');
  const views = [
    'testing_dashboard_summary',
    'bug_summary',
    'performance_summary'
  ];
  
  for (const view of views) {
    try {
      const { error } = await supabase
        .from(view)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ ${view}: ${error.message}`);
      } else {
        console.log(`✅ ${view}: exists`);
      }
    } catch (err) {
      console.log(`❌ ${view}: ${err.message}`);
    }
  }
}

checkTestingTables().catch(console.error);