import { NextRequest, NextResponse } from 'next/server';
import { errorTracker } from '@/lib/error-tracking';

export async function performanceMiddleware(
  request: NextRequest,
  handler: () => Promise<NextResponse>
) {
  const start = Date.now();
  let response: NextResponse;
  let statusCode = 200;

  try {
    response = await handler();
    statusCode = response.status;
  } catch (error) {
    statusCode = 500;
    throw error;
  } finally {
    const duration = Date.now() - start;
    
    // Only log API routes
    if (request.nextUrl.pathname.startsWith('/api/')) {
      // Log performance metric asynchronously
      errorTracker.logPerformance({
        metricType: 'api',
        endpoint: request.nextUrl.pathname,
        method: request.method,
        duration,
        statusCode,
      }).catch(err => {
        console.error('Failed to log performance metric:', err);
      });
    }
  }

  return response!;
}

// Hook for measuring component render performance
export function usePerformanceMonitor(componentName: string) {
  if (typeof window === 'undefined') return;

  const start = performance.now();
  
  // Use cleanup function to measure render time
  return () => {
    const duration = performance.now() - start;
    
    // Only log slow renders (> 16ms, which is one frame at 60fps)
    if (duration > 16) {
      errorTracker.logPerformance({
        metricType: 'render',
        endpoint: componentName,
        duration: Math.round(duration),
      }).catch(err => {
        console.error('Failed to log render performance:', err);
      });
    }
  };
}