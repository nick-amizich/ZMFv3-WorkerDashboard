import { errorTracker } from '@/lib/error-tracking';

// Mock fetch
global.fetch = jest.fn();

// Mock navigator
Object.defineProperty(window, 'navigator', {
  value: {
    userAgent: 'Mozilla/5.0 (Test Environment)',
    onLine: true,
  },
  writable: true,
});

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000/test',
  },
  writable: true,
});

describe('ErrorTracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
  });

  describe('logError', () => {
    it('sends error to API endpoint', async () => {
      const error = new Error('Test error');
      await errorTracker.logError(error);

      expect(global.fetch).toHaveBeenCalledWith('/api/testing/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('Test error'),
      });
    });

    it('determines severity based on error type', async () => {
      const typeError = new TypeError('Type error');
      await errorTracker.logError(typeError);

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.severity).toBe('fatal');
    });

    it('queues errors when offline', async () => {
      // Simulate offline by triggering the offline event
      const offlineEvent = new Event('offline');
      window.dispatchEvent(offlineEvent);
      
      // Give the event listener time to process
      await new Promise(resolve => setTimeout(resolve, 10));

      const error = new Error('Offline error');
      await errorTracker.logError(error);

      expect(global.fetch).not.toHaveBeenCalled();
      
      // Clean up - trigger online event
      const onlineEvent = new Event('online');
      window.dispatchEvent(onlineEvent);
    });
  });

  describe('reportBug', () => {
    it('sends bug report to API endpoint', async () => {
      const bug = {
        title: 'Test Bug',
        description: 'Test bug description',
        component: 'TestComponent',
        severity: 'medium' as const,
      };

      await errorTracker.reportBug(bug);

      expect(global.fetch).toHaveBeenCalledWith('/api/testing/bugs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('Test Bug'),
      });
    });

    it('includes browser information', async () => {
      const bug = {
        title: 'Browser Bug',
        description: 'Bug with browser info',
        component: 'TestComponent',
      };

      await errorTracker.reportBug(bug);

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.userAgent).toBeDefined();
      expect(body.url).toBeDefined();
    });
  });

  describe('logPerformance', () => {
    it('sends performance metrics to API endpoint', async () => {
      const metric = {
        metricType: 'api' as const,
        endpoint: '/api/test',
        method: 'GET',
        duration: 125,
        statusCode: 200,
      };

      await errorTracker.logPerformance(metric);

      expect(global.fetch).toHaveBeenCalledWith('/api/testing/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metric),
      });
    });

    it('handles API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const metric = {
        metricType: 'api' as const,
        duration: 100,
      };

      // Should not throw
      await expect(errorTracker.logPerformance(metric)).resolves.not.toThrow();
    });
  });
});