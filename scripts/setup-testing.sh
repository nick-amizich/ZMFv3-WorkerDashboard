#!/bin/bash

echo "Setting up testing infrastructure..."

# Apply the testing infrastructure migration
echo "Applying database migrations..."
node scripts/apply-migrations.js

# Install testing dependencies
echo "Installing testing dependencies..."
npm install

# Create initial test
echo "Creating sample test file..."
mkdir -p src/components/__tests__
cat > src/components/__tests__/Button.test.tsx << 'EOF'
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('applies variant classes correctly', () => {
    const { rerender } = render(<Button variant="default">Default</Button>);
    expect(screen.getByText('Default')).toHaveClass('bg-primary');
    
    rerender(<Button variant="destructive">Destructive</Button>);
    expect(screen.getByText('Destructive')).toHaveClass('bg-destructive');
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    screen.getByText('Click me').click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
EOF

echo "Testing infrastructure setup complete!"
echo ""
echo "Available commands:"
echo "  npm test          - Run tests"
echo "  npm test:watch    - Run tests in watch mode"
echo "  npm test:coverage - Run tests with coverage report"
echo ""
echo "Dashboard available at: /manager/testing-dashboard"