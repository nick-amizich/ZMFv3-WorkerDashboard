const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
);

async function checkTestFailures() {
  // Get the latest test run
  const { data: latestRun } = await supabase
    .from('test_runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
    
  if (!latestRun) {
    console.log('No test runs found');
    return;
  }
  
  console.log('Latest Test Run:');
  console.log(`- Total: ${latestRun.total_tests}`);
  console.log(`- Passed: ${latestRun.passed_tests}`);
  console.log(`- Failed: ${latestRun.failed_tests}`);
  console.log(`- Status: ${latestRun.status}`);
  console.log(`- Coverage: ${latestRun.coverage_percentage}%`);
  
  // Get failed test results
  const { data: failedTests } = await supabase
    .from('test_results')
    .select('*')
    .eq('test_run_id', latestRun.id)
    .eq('status', 'failed');
    
  if (failedTests && failedTests.length > 0) {
    console.log('\nFailed Tests:');
    failedTests.forEach((test, index) => {
      console.log(`\n${index + 1}. ${test.test_name}`);
      console.log(`   Suite: ${test.suite_name}`);
      console.log(`   Path: ${test.test_path}`);
      if (test.error_message) {
        console.log(`   Error: ${test.error_message}`);
      }
    });
  } else {
    console.log('\nNo failed test details found in database');
  }
}

checkTestFailures().catch(console.error);