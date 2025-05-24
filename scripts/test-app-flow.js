#!/usr/bin/env node

/**
 * Automated test script for ZMF Worker Dashboard
 * Tests the complete flow from order import to task completion
 */

const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3002';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'testpassword123';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Test results storage
const testResults = {
  passed: [],
  failed: [],
  warnings: []
};

// Helper functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const color = type === 'error' ? colors.red : 
                type === 'success' ? colors.green :
                type === 'warning' ? colors.yellow :
                type === 'test' ? colors.cyan : colors.blue;
  console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
}

async function testEndpoint(name, method, path, options = {}) {
  log(`Testing ${method} ${path}`, 'test');
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const data = await response.text();
    let jsonData;
    try {
      jsonData = JSON.parse(data);
    } catch {
      jsonData = data;
    }

    if (!response.ok && !options.expectError) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(jsonData)}`);
    }

    if (response.ok && options.expectError) {
      throw new Error(`Expected error but got success`);
    }

    testResults.passed.push({ name, path, method });
    log(`✓ ${name} passed`, 'success');
    return { response, data: jsonData };
  } catch (error) {
    testResults.failed.push({ name, path, method, error: error.message });
    log(`✗ ${name} failed: ${error.message}`, 'error');
    if (!options.allowFailure) {
      throw error;
    }
    return null;
  }
}

async function setupAuth() {
  log('Setting up authentication...', 'info');
  
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase environment variables not set');
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Try to sign in
  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  });

  if (error) {
    log('Creating test user...', 'info');
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    if (signUpError) {
      throw new Error(`Auth setup failed: ${signUpError.message}`);
    }
    
    return signUpData.session;
  }

  return data.session;
}

async function runTests() {
  log('Starting automated test suite for ZMF Worker Dashboard', 'info');
  log('=' .repeat(60), 'info');

  let session;
  try {
    // 1. Test basic connectivity
    await testEndpoint('Health Check', 'GET', '/api/health');

    // 2. Setup authentication
    session = await setupAuth();
    const authHeaders = session ? { 'Authorization': `Bearer ${session.access_token}` } : {};

    // 3. Test authentication-required endpoints
    await testEndpoint('Get Current User', 'GET', '/api/worker/me', { 
      headers: authHeaders,
      allowFailure: true 
    });

    // 4. Test order management flow
    log('\n--- Testing Order Management Flow ---', 'info');
    
    // Get available orders
    const ordersResult = await testEndpoint('Get Orders', 'GET', '/api/orders', {
      headers: authHeaders,
      allowFailure: true
    });

    // Get pending items for batch creation
    const pendingItemsResult = await testEndpoint('Get Pending Order Items', 'GET', '/api/orders?status=pending', {
      headers: authHeaders,
      allowFailure: true
    });

    // 5. Test workflow management
    log('\n--- Testing Workflow Management ---', 'info');
    
    const workflowsResult = await testEndpoint('Get Workflows', 'GET', '/api/workflows', {
      headers: authHeaders,
      allowFailure: true
    });

    // 6. Test batch operations
    log('\n--- Testing Batch Operations ---', 'info');
    
    const batchesResult = await testEndpoint('Get Batches', 'GET', '/api/batches', {
      headers: authHeaders,
      allowFailure: true
    });

    // Test batch creation with mock data
    const mockBatchData = {
      name: `Test Batch ${Date.now()}`,
      batch_type: 'custom',
      order_item_ids: ['mock-item-1', 'mock-item-2'],
      workflow_template_id: null
    };

    await testEndpoint('Create Batch (Mock)', 'POST', '/api/batches', {
      headers: authHeaders,
      body: mockBatchData,
      allowFailure: true,
      expectError: true // Expect to fail with mock items
    });

    // 7. Test task management
    log('\n--- Testing Task Management ---', 'info');
    
    await testEndpoint('Get Tasks', 'GET', '/api/tasks', {
      headers: authHeaders,
      allowFailure: true
    });

    // 8. Test production flow endpoints
    log('\n--- Testing Production Flow ---', 'info');
    
    if (batchesResult && batchesResult.data && batchesResult.data.length > 0) {
      const testBatchId = batchesResult.data[0].id;
      
      // Test batch transition
      await testEndpoint('Transition Batch', 'POST', `/api/batches/${testBatchId}/transition`, {
        headers: authHeaders,
        body: {
          to_stage: 'pending',
          notes: 'Automated test transition'
        },
        allowFailure: true
      });

      // Test time logs (this was showing errors)
      await testEndpoint('Get Batch Time Logs', 'GET', `/api/time/batch/${testBatchId}`, {
        headers: authHeaders,
        allowFailure: true
      });

      // Test batch tasks
      await testEndpoint('Get Batch Tasks', 'GET', `/api/tasks?batch_id=${testBatchId}`, {
        headers: authHeaders,
        allowFailure: true
      });
    }

    // 9. Test quality and analytics endpoints
    log('\n--- Testing Quality & Analytics ---', 'info');
    
    await testEndpoint('Get Quality Metrics', 'GET', '/api/analytics/quality-metrics', {
      headers: authHeaders,
      allowFailure: true
    });

    await testEndpoint('Get Production Analytics', 'GET', '/api/analytics/production', {
      headers: authHeaders,
      allowFailure: true
    });

    await testEndpoint('Get Bottlenecks', 'GET', '/api/analytics/bottlenecks', {
      headers: authHeaders,
      allowFailure: true
    });

    // 10. Test settings endpoints
    log('\n--- Testing Settings ---', 'info');
    
    await testEndpoint('Get Shopify Status', 'GET', '/api/settings/shopify/status', {
      headers: authHeaders,
      allowFailure: true
    });

    // 11. Check for common issues
    log('\n--- Checking for Common Issues ---', 'info');
    
    // Check for database connection issues
    if (testResults.failed.some(f => f.error.includes('PGRST'))) {
      testResults.warnings.push('Database query errors detected - check table relationships');
    }

    // Check for auth issues
    if (testResults.failed.some(f => f.error.includes('401') || f.error.includes('403'))) {
      testResults.warnings.push('Authentication/authorization issues detected');
    }

    // Check for missing endpoints
    if (testResults.failed.some(f => f.error.includes('404'))) {
      testResults.warnings.push('Missing API endpoints detected');
    }

  } catch (error) {
    log(`Critical error: ${error.message}`, 'error');
  }

  // Generate report
  log('\n' + '=' .repeat(60), 'info');
  log('TEST RESULTS SUMMARY', 'info');
  log('=' .repeat(60), 'info');
  
  log(`\nPassed: ${testResults.passed.length}`, 'success');
  testResults.passed.forEach(t => {
    log(`  ✓ ${t.name} (${t.method} ${t.path})`, 'success');
  });

  if (testResults.failed.length > 0) {
    log(`\nFailed: ${testResults.failed.length}`, 'error');
    testResults.failed.forEach(t => {
      log(`  ✗ ${t.name} (${t.method} ${t.path})`, 'error');
      log(`    Error: ${t.error}`, 'error');
    });
  }

  if (testResults.warnings.length > 0) {
    log(`\nWarnings: ${testResults.warnings.length}`, 'warning');
    testResults.warnings.forEach(w => {
      log(`  ⚠ ${w}`, 'warning');
    });
  }

  // Recommendations
  log('\n' + '=' .repeat(60), 'info');
  log('RECOMMENDATIONS', 'info');
  log('=' .repeat(60), 'info');

  const recommendations = [];

  if (testResults.failed.some(f => f.error.includes('employee_id'))) {
    recommendations.push('Fix database schema: workers table uses "id" not "employee_id"');
  }

  if (testResults.failed.some(f => f.error.includes('PGRST200'))) {
    recommendations.push('Review database relationships and foreign key constraints');
  }

  if (testResults.failed.some(f => f.error.includes('auth'))) {
    recommendations.push('Ensure workers table has proper auth_user_id relationships');
  }

  if (testResults.failed.some(f => f.path.includes('/api/analytics'))) {
    recommendations.push('Check if v3 database migrations have been applied');
  }

  if (recommendations.length === 0) {
    recommendations.push('All tests passed! Application appears to be functioning correctly.');
  }

  recommendations.forEach((r, i) => {
    log(`${i + 1}. ${r}`, 'info');
  });

  // Exit with appropriate code
  process.exit(testResults.failed.length > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  log(`Fatal error: ${error.message}`, 'error');
  process.exit(1);
});