#!/usr/bin/env node

/**
 * Browser-based automated testing using Puppeteer
 * This will test the actual UI flow and find bugs
 */

const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3002';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'test123';

// Bug tracking
const bugs = [];
const testResults = [];

async function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const emoji = type === 'error' ? '❌' : 
                type === 'success' ? '✅' :
                type === 'warning' ? '⚠️' :
                type === 'test' ? '🧪' : '📝';
  console.log(`[${timestamp}] ${emoji} ${message}`);
}

async function captureConsoleErrors(page) {
  const errors = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      log(`Console error: ${msg.text()}`, 'error');
    }
  });
  
  page.on('pageerror', error => {
    errors.push(error.message);
    log(`Page error: ${error.message}`, 'error');
  });
  
  page.on('requestfailed', request => {
    errors.push(`Request failed: ${request.url()} - ${request.failure().errorText}`);
    log(`Request failed: ${request.url()}`, 'error');
  });
  
  return errors;
}

async function testLogin(page) {
  log('Testing login flow...', 'test');
  
  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    
    // Check if login page loaded
    const loginForm = await page.$('form');
    if (!loginForm) {
      bugs.push({
        page: '/login',
        issue: 'Login form not found',
        severity: 'high'
      });
      return false;
    }
    
    // Try to log in
    await page.type('input[type="email"]', TEST_EMAIL);
    await page.type('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for navigation or error
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      // Still on login page - check for error message
      const errorText = await page.evaluate(() => {
        const alerts = document.querySelectorAll('[role="alert"]');
        return Array.from(alerts).map(a => a.textContent).join(' ');
      });
      
      log(`Login failed: ${errorText || 'No error message shown'}`, 'warning');
      return false;
    }
    
    log('Login successful', 'success');
    return true;
  } catch (error) {
    bugs.push({
      page: '/login',
      issue: `Login test failed: ${error.message}`,
      severity: 'high'
    });
    return false;
  }
}

async function testProductionFlow(page) {
  log('Testing production flow...', 'test');
  
  try {
    await page.goto(`${BASE_URL}/manager/production-flow`, { waitUntil: 'networkidle0' });
    
    // Check for the Create Batch button
    const createBatchBtn = await page.$('button:has-text("Create Batch")');
    if (!createBatchBtn) {
      bugs.push({
        page: '/manager/production-flow',
        issue: 'Create Batch button not found',
        severity: 'medium'
      });
      return;
    }
    
    // Click Create Batch
    await createBatchBtn.click();
    await page.waitForTimeout(1000);
    
    // Check if modal opened
    const modal = await page.$('[role="dialog"]');
    if (!modal) {
      bugs.push({
        page: '/manager/production-flow',
        issue: 'Batch creation modal did not open',
        severity: 'high'
      });
      return;
    }
    
    // Check for empty select value error
    const selectError = await page.evaluate(() => {
      const selects = document.querySelectorAll('select');
      for (const select of selects) {
        const options = select.querySelectorAll('option');
        for (const option of options) {
          if (option.value === '') {
            return 'Found empty select option value';
          }
        }
      }
      return null;
    });
    
    if (selectError) {
      bugs.push({
        page: '/manager/production-flow',
        issue: selectError,
        severity: 'medium',
        note: 'This causes React errors'
      });
    }
    
    log('Production flow basic test passed', 'success');
  } catch (error) {
    bugs.push({
      page: '/manager/production-flow',
      issue: `Production flow test failed: ${error.message}`,
      severity: 'high'
    });
  }
}

async function testDragAndDrop(page) {
  log('Testing drag and drop functionality...', 'test');
  
  try {
    // Find draggable elements
    const draggables = await page.$$('[draggable="true"]');
    if (draggables.length === 0) {
      log('No draggable elements found', 'warning');
      return;
    }
    
    // Test drag behavior
    const firstDraggable = draggables[0];
    const box = await firstDraggable.boundingBox();
    
    if (box) {
      // Simulate drag
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + 200, box.y);
      
      // Check if drag state is maintained during refresh
      const isDragging = await page.evaluate(() => {
        return document.body.classList.contains('dragging') || 
               document.querySelector('.dragging') !== null;
      });
      
      if (!isDragging) {
        bugs.push({
          page: '/manager/production-flow',
          issue: 'Drag state not properly maintained',
          severity: 'low',
          note: 'This could cause buggy drag behavior'
        });
      }
      
      await page.mouse.up();
    }
    
    log('Drag and drop test completed', 'success');
  } catch (error) {
    bugs.push({
      page: '/manager/production-flow',
      issue: `Drag and drop test failed: ${error.message}`,
      severity: 'medium'
    });
  }
}

async function testAPIEndpoints(page) {
  log('Testing API endpoints...', 'test');
  
  const endpoints = [
    { path: '/api/batches', method: 'GET' },
    { path: '/api/workflows', method: 'GET' },
    { path: '/api/tasks', method: 'GET' },
    { path: '/api/time/batch/test-id', method: 'GET' },
    { path: '/api/analytics/quality-metrics', method: 'GET' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await page.evaluate(async (url) => {
        try {
          const res = await fetch(url);
          const data = await res.json();
          return { status: res.status, data, ok: res.ok };
        } catch (error) {
          return { error: error.message };
        }
      }, BASE_URL + endpoint.path);
      
      if (response.error) {
        bugs.push({
          page: 'API',
          issue: `${endpoint.path} - ${response.error}`,
          severity: 'high'
        });
      } else if (response.data && response.data.code) {
        // Database error
        bugs.push({
          page: 'API',
          issue: `${endpoint.path} - ${response.data.message || response.data.code}`,
          severity: 'high',
          note: response.data.hint || response.data.details
        });
      }
      
    } catch (error) {
      bugs.push({
        page: 'API',
        issue: `${endpoint.path} - ${error.message}`,
        severity: 'high'
      });
    }
  }
  
  log('API endpoint tests completed', 'success');
}

async function runTests() {
  log('Starting Puppeteer-based bug detection...', 'info');
  
  const browser = await puppeteer.launch({
    headless: false, // Set to true for CI
    slowMo: 50 // Slow down for visibility
  });
  
  try {
    const page = await browser.newPage();
    
    // Capture console errors
    const consoleErrors = await captureConsoleErrors(page);
    
    // Run tests
    await testLogin(page);
    await testProductionFlow(page);
    await testDragAndDrop(page);
    await testAPIEndpoints(page);
    
    // Check for React errors
    const reactErrors = await page.evaluate(() => {
      const errorOverlay = document.querySelector('#webpack-dev-server-client-overlay');
      if (errorOverlay) {
        return errorOverlay.textContent;
      }
      return null;
    });
    
    if (reactErrors) {
      bugs.push({
        page: 'React',
        issue: 'React development errors detected',
        severity: 'high',
        note: reactErrors
      });
    }
    
  } finally {
    await browser.close();
  }
  
  // Generate report
  console.log('\n' + '='.repeat(60));
  console.log('🐛 BUG DETECTION REPORT');
  console.log('='.repeat(60) + '\n');
  
  if (bugs.length === 0) {
    log('No bugs detected!', 'success');
  } else {
    log(`Found ${bugs.length} potential issues:\n`, 'warning');
    
    // Group by severity
    const highSeverity = bugs.filter(b => b.severity === 'high');
    const mediumSeverity = bugs.filter(b => b.severity === 'medium');
    const lowSeverity = bugs.filter(b => b.severity === 'low');
    
    if (highSeverity.length > 0) {
      console.log('🔴 HIGH SEVERITY:');
      highSeverity.forEach(bug => {
        console.log(`  - [${bug.page}] ${bug.issue}`);
        if (bug.note) console.log(`    Note: ${bug.note}`);
      });
      console.log('');
    }
    
    if (mediumSeverity.length > 0) {
      console.log('🟡 MEDIUM SEVERITY:');
      mediumSeverity.forEach(bug => {
        console.log(`  - [${bug.page}] ${bug.issue}`);
        if (bug.note) console.log(`    Note: ${bug.note}`);
      });
      console.log('');
    }
    
    if (lowSeverity.length > 0) {
      console.log('🟢 LOW SEVERITY:');
      lowSeverity.forEach(bug => {
        console.log(`  - [${bug.page}] ${bug.issue}`);
        if (bug.note) console.log(`    Note: ${bug.note}`);
      });
      console.log('');
    }
  }
  
  // Specific recommendations
  console.log('💡 RECOMMENDATIONS:');
  console.log('='.repeat(60));
  
  if (bugs.some(b => b.issue.includes('employee_id'))) {
    console.log('1. Fix database queries: Change "employee_id" to "id" in workers table queries');
  }
  
  if (bugs.some(b => b.issue.includes('empty select'))) {
    console.log('2. Fix Select components: Replace empty string values with "none" or similar');
  }
  
  if (bugs.some(b => b.issue.includes('drag'))) {
    console.log('3. Improve drag and drop: Add isDragging state management');
  }
  
  if (bugs.some(b => b.page === 'API')) {
    console.log('4. Run database migrations: npx supabase db push');
  }
  
  console.log('\nTo install Puppeteer: npm install --save-dev puppeteer');
}

// Check if Puppeteer is installed
try {
  require.resolve('puppeteer');
  runTests().catch(console.error);
} catch (e) {
  console.log('⚠️  Puppeteer not installed. Install with: npm install --save-dev puppeteer');
  console.log('   Then run: node scripts/test-with-puppeteer.js');
}