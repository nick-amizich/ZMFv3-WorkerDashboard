const { createClient } = require('@supabase/supabase-js');

// Use service role key for testing
const supabase = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
);

async function testBugReporting() {
  console.log('\n🐛 Testing Bug Reporting...');
  
  const bug = {
    title: 'Test Bug - Navigation Menu Not Responsive',
    description: 'The navigation menu does not work on mobile devices',
    component: 'navigation', // Required field
    severity: 'medium',
    status: 'open',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    url: '/manager/dashboard',
    error_message: 'Menu click handler not responding',
    error_stack: 'Error at MenuComponent.handleClick()'
  };
  
  const { data, error } = await supabase
    .from('bugs')
    .insert(bug)
    .select()
    .single();
    
  if (error) {
    console.error('❌ Failed to create bug:', error);
  } else {
    console.log('✅ Bug created:', data);
  }
  
  return data;
}

async function testErrorLogging() {
  console.log('\n🚨 Testing Error Logging...');
  
  const errorLog = {
    error_type: 'TypeError',
    error_message: 'Cannot read property "id" of undefined',
    error_stack: 'TypeError: Cannot read property "id" of undefined\n  at TaskList (/src/components/worker/task-list.tsx:45:23)',
    component: 'TaskList',
    url: '/worker/tasks',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    severity: 'error',
    environment: 'development',
    additional_data: {
      browser: 'Chrome',
      version: '120.0.0'
    }
  };
  
  const { data, error } = await supabase
    .from('error_logs')
    .insert(errorLog)
    .select()
    .single();
    
  if (error) {
    console.error('❌ Failed to log error:', error);
  } else {
    console.log('✅ Error logged:', data);
  }
  
  return data;
}

async function testPerformanceMetrics() {
  console.log('\n⚡ Testing Performance Metrics...');
  
  const metrics = {
    metric_type: 'api',
    endpoint: '/api/tasks',
    method: 'GET',
    duration_ms: 125,
    status_code: 200
  };
  
  const { data, error } = await supabase
    .from('performance_metrics')
    .insert(metrics)
    .select()
    .single();
    
  if (error) {
    console.error('❌ Failed to log performance metric:', error);
  } else {
    console.log('✅ Performance metric logged:', data);
  }
  
  return data;
}

async function testTestRunCreation() {
  console.log('\n🧪 Testing Test Run Creation...');
  
  // First, let's check what the valid status values are
  const testRun = {
    branch: 'main',
    commit_sha: 'abc123def456',
    total_tests: 45,
    passed_tests: 42,
    failed_tests: 3,
    skipped_tests: 0,
    coverage_percentage: 78.5,
    status: 'passed' // Changed from 'completed' to match constraint
  };
  
  const { data: runData, error: runError } = await supabase
    .from('test_runs')
    .insert(testRun)
    .select()
    .single();
    
  if (runError) {
    console.error('❌ Failed to create test run:', runError);
    return;
  }
  
  console.log('✅ Test run created:', runData);
  
  // Add some test results
  const testResults = [
    {
      test_run_id: runData.id,
      test_name: 'should render dashboard correctly',
      test_path: 'src/app/manager/dashboard/dashboard.test.tsx',
      suite_name: 'Dashboard Tests',
      status: 'passed',
      duration_ms: 125
    },
    {
      test_run_id: runData.id,
      test_name: 'should handle API errors gracefully',
      test_path: 'src/app/api/tasks/tasks.test.ts',
      suite_name: 'API Tests',
      status: 'failed',
      duration_ms: 89,
      error_message: 'Expected 200 but got 500',
      error_stack: 'AssertionError: Expected 200 but got 500\n  at Object.<anonymous> (tasks.test.ts:45:5)'
    }
  ];
  
  const { error: resultsError } = await supabase
    .from('test_results')
    .insert(testResults);
    
  if (resultsError) {
    console.error('❌ Failed to create test results:', resultsError);
  } else {
    console.log('✅ Test results created');
  }
  
  // Add coverage data
  const coverageData = {
    test_run_id: runData.id,
    file_path: 'src/app/manager/dashboard/page.tsx',
    statements_total: 100,
    statements_covered: 78,
    branches_total: 20,
    branches_covered: 15,
    functions_total: 10,
    functions_covered: 8,
    lines_total: 100,
    lines_covered: 78
  };
  
  const { error: coverageError } = await supabase
    .from('test_coverage')
    .insert(coverageData);
    
  if (coverageError) {
    console.error('❌ Failed to create coverage data:', coverageError);
  } else {
    console.log('✅ Coverage data created');
  }
  
  return runData;
}

async function checkDashboardViews() {
  console.log('\n📊 Checking Dashboard Views...');
  
  // Check bug summary
  const { data: bugSummary, error: bugError } = await supabase
    .from('bug_summary')
    .select('*');
    
  if (bugError) {
    console.error('❌ Failed to fetch bug summary:', bugError);
  } else {
    console.log('✅ Bug summary:', bugSummary);
  }
  
  // Check error summary
  const { data: errorSummary, error: errorSummaryError } = await supabase
    .from('error_summary')
    .select('*');
    
  if (errorSummaryError) {
    console.error('❌ Failed to fetch error summary:', errorSummaryError);
  } else {
    console.log('✅ Error summary:', errorSummary);
  }
  
  // Check performance summary
  const { data: perfSummary, error: perfError } = await supabase
    .from('performance_summary')
    .select('*');
    
  if (perfError) {
    console.error('❌ Failed to fetch performance summary:', perfError);
  } else {
    console.log('✅ Performance summary:', perfSummary);
  }
}

async function runAllTests() {
  console.log('🚀 Starting Testing Infrastructure Tests...');
  
  await testBugReporting();
  await testErrorLogging();
  await testPerformanceMetrics();
  await testTestRunCreation();
  await checkDashboardViews();
  
  console.log('\n✨ Testing complete!');
}

runAllTests().catch(console.error);