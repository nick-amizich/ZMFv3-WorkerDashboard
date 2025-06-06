// Utilities for test infrastructure

/**
 * Get the current application URL, accounting for dynamic ports
 */
export function getAppUrl(): string {
  // In browser context
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // In Node/test context, check various sources
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // Check for dynamic port from Next.js
  const port = process.env.PORT || process.env.NEXT_PUBLIC_PORT || '3000';
  return `http://localhost:${port}`;
}

/**
 * Configuration for test reporter
 */
export const TEST_REPORTER_CONFIG = {
  // Maximum time to wait for API response
  timeout: 5000,
  
  // Retry configuration
  maxRetries: 3,
  retryDelay: 1000,
  
  // Fallback ports to try if main port fails
  fallbackPorts: ['3000', '3001', '3002'],
};

/**
 * Send test results to API with retry logic
 */
export async function sendTestResults(data: any): Promise<void> {
  const baseUrl = getAppUrl();
  
  // Try primary URL first
  try {
    const response = await fetch(`${baseUrl}/api/testing/test-runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (response.ok) return;
  } catch (error) {
    console.log(`Failed to send to ${baseUrl}, trying fallback ports...`);
  }
  
  // Try fallback ports
  for (const port of TEST_REPORTER_CONFIG.fallbackPorts) {
    try {
      const fallbackUrl = `http://localhost:${port}`;
      const response = await fetch(`${fallbackUrl}/api/testing/test-runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (response.ok) {
        console.log(`Successfully sent test results to ${fallbackUrl}`);
        return;
      }
    } catch (error) {
      continue;
    }
  }
  
  console.error('Failed to send test results to any available port');
}