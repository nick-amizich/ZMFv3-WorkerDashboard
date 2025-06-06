// Error tracking utilities
interface ErrorInfo {
  componentStack: string;
  digest?: string;
}

class ErrorTracker {
  private static instance: ErrorTracker;
  private errorQueue: any[] = [];
  private isOnline: boolean = true;

  private constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.flushErrorQueue();
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }

  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  async logError(error: Error, errorInfo?: ErrorInfo, additionalData?: any) {
    const errorData = {
      errorType: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      component: this.extractComponentFromStack(errorInfo?.componentStack),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      severity: this.determineSeverity(error),
      environment: process.env.NODE_ENV,
      additionalData: {
        ...additionalData,
        errorInfo,
        timestamp: new Date().toISOString(),
      },
    };

    if (this.isOnline) {
      await this.sendError(errorData);
    } else {
      this.errorQueue.push(errorData);
    }
  }

  private async sendError(errorData: any) {
    try {
      const response = await fetch('/api/testing/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorData),
      });

      if (!response.ok) {
        console.error('Failed to log error to server:', await response.text());
      }
    } catch (error) {
      console.error('Error sending error to server:', error);
      this.errorQueue.push(errorData);
    }
  }

  private async flushErrorQueue() {
    while (this.errorQueue.length > 0) {
      const errorData = this.errorQueue.shift();
      await this.sendError(errorData);
    }
  }

  private extractComponentFromStack(componentStack?: string): string {
    if (!componentStack) return 'Unknown';
    
    // Extract the first component name from the stack
    const match = componentStack.match(/in (\w+)/);
    return match ? match[1] : 'Unknown';
  }

  private determineSeverity(error: Error): string {
    // Determine severity based on error type
    if (error.name === 'TypeError' || error.name === 'ReferenceError') {
      return 'fatal';
    }
    if (error.message.toLowerCase().includes('network') || 
        error.message.toLowerCase().includes('fetch')) {
      return 'warning';
    }
    return 'error';
  }

  // Performance monitoring
  async logPerformance(metric: {
    metricType: 'api' | 'database' | 'render' | 'custom';
    endpoint?: string;
    method?: string;
    duration: number;
    statusCode?: number;
  }) {
    try {
      await fetch('/api/testing/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metric),
      });
    } catch (error) {
      console.error('Failed to log performance metric:', error);
    }
  }

  // Bug reporting
  async reportBug(bug: {
    title: string;
    description: string;
    component: string;
    severity?: 'critical' | 'high' | 'medium' | 'low' | 'info';
  }) {
    try {
      const response = await fetch('/api/testing/bugs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...bug,
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to report bug');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to report bug:', error);
      throw error;
    }
  }
}

export const errorTracker = ErrorTracker.getInstance();