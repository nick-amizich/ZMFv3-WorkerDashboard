# Testing Guide for ZMFv3 Worker Dashboard

## Overview

This guide explains how to write tests for the ZMFv3 Worker Dashboard and use the integrated testing infrastructure we've built.

## Testing Infrastructure

We have a comprehensive testing system that:
- Automatically reports test results to a dashboard
- Tracks code coverage
- Logs test failures and errors
- Monitors test performance over time

### Key Components:

1. **Test Reporter** (`test-reporter.js`): Automatically sends test results to our API
2. **Testing Dashboard** (`/manager/testing-dashboard`): View test results, coverage, and trends
3. **Error Tracking** (`src/lib/error-tracking.ts`): Captures and logs errors
4. **Bug Reporting**: Manual bug reporting through the UI

## Writing Tests

### Test File Structure

Place test files next to the components they test:
```
src/
  components/
    Button.tsx
    __tests__/
      Button.test.tsx
```

Or in a dedicated `__tests__` folder at the module level:
```
src/
  lib/
    __tests__/
      utils.test.ts
    utils.ts
```

### Basic Test Template

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { ComponentName } from '../ComponentName';

describe('ComponentName', () => {
  it('renders correctly', () => {
    render(<ComponentName />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles user interactions', () => {
    render(<ComponentName />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    // Assert expected behavior
  });
});
```

### Testing Best Practices

1. **Test user behavior, not implementation details**
   ```typescript
   // Good: Testing what the user sees
   expect(screen.getByText('Loading...')).toBeInTheDocument();
   
   // Bad: Testing internal state
   expect(component.state.isLoading).toBe(true);
   ```

2. **Use Testing Library queries correctly**
   ```typescript
   // Preferred queries (in order):
   getByRole('button', { name: 'Submit' })
   getByLabelText('Email')
   getByPlaceholderText('Search...')
   getByText('Welcome')
   getByTestId('custom-element') // Last resort
   ```

3. **Mock external dependencies**
   ```typescript
   jest.mock('@/lib/supabase/client', () => ({
     createClient: () => ({
       from: jest.fn().mockReturnThis(),
       select: jest.fn().mockReturnThis(),
       insert: jest.fn().mockResolvedValue({ data: [], error: null })
     })
   }));
   ```

4. **Test async behavior**
   ```typescript
   it('loads data asynchronously', async () => {
     render(<DataComponent />);
     
     // Wait for async operation
     await waitFor(() => {
       expect(screen.getByText('Data loaded')).toBeInTheDocument();
     });
   });
   ```

### Testing API Routes

```typescript
import { GET, POST } from '@/app/api/endpoint/route';
import { NextRequest } from 'next/server';

describe('API: /api/endpoint', () => {
  it('handles GET requests', async () => {
    const request = new NextRequest('http://localhost:3000/api/endpoint');
    const response = await GET(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('success');
  });
});
```

### Mocking Common Dependencies

#### Supabase Client
```typescript
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockResolvedValue({ data: [], error: null }),
    insert: jest.fn().mockResolvedValue({ data: {}, error: null }),
    update: jest.fn().mockResolvedValue({ data: {}, error: null }),
    delete: jest.fn().mockResolvedValue({ data: {}, error: null }),
  })
}));
```

#### Next.js Router
```typescript
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/test-path',
  useSearchParams: () => new URLSearchParams(),
}));
```

#### React Query
```typescript
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn().mockReturnValue({
    data: undefined,
    isLoading: false,
    error: null,
  }),
  useMutation: jest.fn().mockReturnValue({
    mutate: jest.fn(),
    isLoading: false,
  }),
}));
```

## Running Tests

### Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- Button.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="should render"
```

### Using the Testing Dashboard

1. Navigate to `/manager/testing-dashboard`
2. Click "Run Tests" to execute tests from the UI
3. View results, coverage, and trends
4. Report bugs directly from the dashboard

## Test Results

Test results are automatically:
- Sent to the testing database
- Displayed in the dashboard
- Tracked over time for trend analysis

### Coverage Requirements

- Statements: 70%
- Branches: 70%
- Functions: 70%
- Lines: 70%

## Common Testing Patterns

### Testing Loading States
```typescript
it('shows loading state', () => {
  const { rerender } = render(<Component isLoading={true} />);
  expect(screen.getByText('Loading...')).toBeInTheDocument();
  
  rerender(<Component isLoading={false} />);
  expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
});
```

### Testing Error States
```typescript
it('displays error message', () => {
  render(<Component error="Something went wrong" />);
  expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
});
```

### Testing Forms
```typescript
it('submits form with correct data', async () => {
  const onSubmit = jest.fn();
  render(<Form onSubmit={onSubmit} />);
  
  fireEvent.change(screen.getByLabelText('Name'), {
    target: { value: 'John Doe' }
  });
  
  fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
  
  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'John Doe'
    });
  });
});
```

## Debugging Tests

1. **Use `screen.debug()`** to see the current DOM
2. **Check test output** in the testing dashboard
3. **Look for console errors** in test logs
4. **Use `waitFor` for async assertions**

## Integration with CI/CD

The test reporter works with any CI environment. Set these environment variables:
- `PORT`: The port your app runs on
- `GIT_BRANCH`: Current branch name
- `GIT_COMMIT`: Current commit SHA

Tests will automatically report results to the dashboard during CI runs.