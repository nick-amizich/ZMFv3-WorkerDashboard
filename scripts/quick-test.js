#!/usr/bin/env node

/**
 * Quick test script to identify bugs in the ZMF Worker Dashboard
 * Focuses on finding common issues without complex setup
 */

const http = require('http');

const BASE_URL = 'http://localhost:3002';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Store results
const issues = [];
const successes = [];

function log(message, type = 'info') {
  const color = type === 'error' ? colors.red : 
                type === 'success' ? colors.green :
                type === 'warning' ? colors.yellow :
                type === 'test' ? colors.cyan : colors.blue;
  console.log(`${color}${message}${colors.reset}`);
}

function makeRequest(path, method = 'GET') {
  return new Promise((resolve) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
          path
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        status: 0,
        error: error.message,
        path
      });
    });

    req.end();
  });
}

async function checkEndpoint(name, path, expectedStatus = 200) {
  log(`Testing: ${name}`, 'test');
  const result = await makeRequest(path);
  
  if (result.error) {
    issues.push({
      type: 'connection',
      name,
      path,
      error: result.error
    });
    log(`  ✗ Connection error: ${result.error}`, 'error');
    return false;
  }

  // Check for common error patterns in response
  if (result.body) {
    try {
      const json = JSON.parse(result.body);
      
      // Database errors
      if (json.code && json.code.startsWith('PGRST')) {
        issues.push({
          type: 'database',
          name,
          path,
          error: json.message || json.details,
          code: json.code
        });
        log(`  ✗ Database error: ${json.message}`, 'error');
        return false;
      }

      // PostgreSQL errors
      if (json.code && /^\d{5}$/.test(json.code)) {
        issues.push({
          type: 'postgres',
          name,
          path,
          error: json.message,
          code: json.code,
          hint: json.hint
        });
        log(`  ✗ PostgreSQL error: ${json.message}`, 'error');
        return false;
      }

      // Application errors
      if (json.error && result.status >= 400) {
        issues.push({
          type: 'application',
          name,
          path,
          error: json.error,
          status: result.status
        });
        log(`  ✗ Application error (${result.status}): ${json.error}`, 'error');
        return false;
      }
    } catch (e) {
      // Not JSON, check for HTML error pages
      if (result.body.includes('<!DOCTYPE') && result.status >= 400) {
        issues.push({
          type: 'http',
          name,
          path,
          status: result.status,
          error: `HTML error page returned`
        });
        log(`  ✗ HTTP ${result.status} error`, 'error');
        return false;
      }
    }
  }

  // Check status code
  if (result.status !== expectedStatus) {
    issues.push({
      type: 'status',
      name,
      path,
      expected: expectedStatus,
      actual: result.status
    });
    log(`  ✗ Unexpected status: ${result.status} (expected ${expectedStatus})`, 'error');
    return false;
  }

  successes.push({ name, path });
  log(`  ✓ Success`, 'success');
  return true;
}

async function runTests() {
  log('\n🔍 ZMF Worker Dashboard - Quick Bug Scanner\n', 'info');

  // Check if server is running
  const healthCheck = await makeRequest('/api/health');
  if (healthCheck.error) {
    log('❌ Server is not running at ' + BASE_URL, 'error');
    log('   Please start the server with: npm run dev', 'warning');
    process.exit(1);
  }

  log('✅ Server is running\n', 'success');

  // Test public endpoints (no auth required)
  log('📋 Testing Public Endpoints:\n', 'info');
  
  await checkEndpoint('Health Check', '/api/health');
  await checkEndpoint('Home Page', '/');
  await checkEndpoint('Login Page', '/login');

  // Test API endpoints (will show auth errors but helps identify other issues)
  log('\n📋 Testing API Endpoints:\n', 'info');

  // These should return 401 (unauthorized) if working correctly
  await checkEndpoint('Orders API', '/api/orders', 401);
  await checkEndpoint('Workflows API', '/api/workflows', 401);
  await checkEndpoint('Batches API', '/api/batches', 401);
  await checkEndpoint('Tasks API', '/api/tasks', 401);
  await checkEndpoint('Workers API', '/api/workers', 401);

  // Test specific endpoints that showed errors in console
  log('\n📋 Testing Known Problem Areas:\n', 'info');
  
  // This endpoint had the employee_id error
  await checkEndpoint('Batch Time Logs', '/api/time/batch/test-id', 401);
  
  // V3 endpoints that might have issues
  await checkEndpoint('Quality Metrics', '/api/analytics/quality-metrics', 401);
  await checkEndpoint('Production Analytics', '/api/analytics/production', 401);
  await checkEndpoint('Bottlenecks', '/api/analytics/bottlenecks', 401);

  // Generate bug report
  log('\n' + '='.repeat(60), 'info');
  log('🐛 BUG REPORT', 'info');
  log('='.repeat(60) + '\n', 'info');

  if (issues.length === 0) {
    log('✅ No bugs detected! All endpoints are responding correctly.\n', 'success');
  } else {
    log(`Found ${issues.length} issue(s):\n`, 'error');

    // Group issues by type
    const groupedIssues = issues.reduce((acc, issue) => {
      if (!acc[issue.type]) acc[issue.type] = [];
      acc[issue.type].push(issue);
      return acc;
    }, {});

    // Database issues
    if (groupedIssues.database) {
      log('🗄️  Database Issues:', 'error');
      groupedIssues.database.forEach(issue => {
        log(`  - ${issue.name} (${issue.path})`, 'error');
        log(`    Error: ${issue.error}`, 'warning');
        if (issue.code) log(`    Code: ${issue.code}`, 'warning');
      });
      log('', 'info');
    }

    // PostgreSQL specific errors
    if (groupedIssues.postgres) {
      log('🐘 PostgreSQL Errors:', 'error');
      groupedIssues.postgres.forEach(issue => {
        log(`  - ${issue.name} (${issue.path})`, 'error');
        log(`    Error: ${issue.error}`, 'warning');
        log(`    Code: ${issue.code}`, 'warning');
        if (issue.hint) log(`    Hint: ${issue.hint}`, 'cyan');
      });
      log('', 'info');
    }

    // Application errors
    if (groupedIssues.application) {
      log('⚠️  Application Errors:', 'error');
      groupedIssues.application.forEach(issue => {
        log(`  - ${issue.name} (${issue.path})`, 'error');
        log(`    Status: ${issue.status}`, 'warning');
        log(`    Error: ${issue.error}`, 'warning');
      });
      log('', 'info');
    }

    // Status code mismatches
    if (groupedIssues.status) {
      log('📊 Unexpected Status Codes:', 'warning');
      groupedIssues.status.forEach(issue => {
        log(`  - ${issue.name} (${issue.path})`, 'warning');
        log(`    Expected: ${issue.expected}, Got: ${issue.actual}`, 'warning');
      });
      log('', 'info');
    }
  }

  // Specific bug analysis
  log('🔧 SPECIFIC BUG ANALYSIS', 'info');
  log('='.repeat(60) + '\n', 'info');

  // Check for the employee_id bug
  const employeeIdBug = issues.find(i => 
    i.error && i.error.includes('employee_id does not exist')
  );
  
  if (employeeIdBug) {
    log('❌ Employee ID Bug Detected:', 'error');
    log('   The workers table uses "id" not "employee_id"', 'warning');
    log('   Fix: Update queries to use workers.id', 'cyan');
    log('', 'info');
  }

  // Check for relationship errors
  const relationshipErrors = issues.filter(i => 
    i.code === 'PGRST200' || (i.error && i.error.includes('relationship'))
  );

  if (relationshipErrors.length > 0) {
    log('❌ Database Relationship Errors:', 'error');
    relationshipErrors.forEach(issue => {
      log(`   - ${issue.path}: ${issue.error}`, 'warning');
    });
    log('   Fix: Check foreign key constraints and table relationships', 'cyan');
    log('', 'info');
  }

  // Check for missing v3 features
  const v3Errors = issues.filter(i => 
    i.path.includes('/api/analytics') || 
    i.path.includes('/api/quality') ||
    i.path.includes('/api/automation')
  );

  if (v3Errors.length > 0) {
    log('⚠️  V3 Feature Issues:', 'warning');
    log('   Some v3 features may not be fully implemented', 'warning');
    log('   Fix: Run database migrations for v3 tables', 'cyan');
    log('', 'info');
  }

  // Summary
  log('\n📊 SUMMARY', 'info');
  log('='.repeat(60), 'info');
  log(`✅ Successful checks: ${successes.length}`, 'success');
  log(`❌ Failed checks: ${issues.length}`, issues.length > 0 ? 'error' : 'success');

  if (issues.length > 0) {
    log('\n🛠️  Next Steps:', 'info');
    log('1. Fix database queries using wrong column names', 'cyan');
    log('2. Check database migrations are up to date', 'cyan');
    log('3. Verify all API endpoints have proper error handling', 'cyan');
    log('4. Test with proper authentication for protected endpoints', 'cyan');
  }
}

// Run the tests
runTests().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'error');
  process.exit(1);
});