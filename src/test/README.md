# Test Infrastructure

This directory contains test setup and utilities for the Chemistry Reader application.

## Testing Stack

- **Test Framework**: [Vitest](https://vitest.dev/) - Fast unit test framework
- **Testing Library**: [React Testing Library](https://testing-library.com/react) - User-centric testing utilities
- **DOM Environment**: [happy-dom](https://github.com/capricorn86/happy-dom) - Lightweight DOM implementation
- **User Interactions**: [@testing-library/user-event](https://testing-library.com/docs/user-event/intro) - Realistic user event simulation
- **Matchers**: [@testing-library/jest-dom](https://testing-library.com/docs/ecosystem-jest-dom) - Custom DOM matchers

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with interactive UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

## Test Setup

The `setup.ts` file in this directory is automatically loaded before each test file and provides:

### 1. Jest-DOM Matchers

Extends Vitest's `expect` with useful DOM matchers:

```typescript
expect(element).toBeInTheDocument()
expect(element).toBeVisible()
expect(element).toHaveClass('className')
expect(element).toBeDisabled()
// ... and many more
```

### 2. Automatic Cleanup

Automatically cleans up React components after each test to prevent memory leaks and test interference.

### 3. localStorage Mock

Provides a fully functional localStorage mock for testing:

```typescript
localStorage.setItem('key', 'value')
localStorage.getItem('key')
localStorage.removeItem('key')
localStorage.clear()
```

### 4. matchMedia Mock

Mocks `window.matchMedia` for testing responsive components and theme detection.

## Writing Tests

### Basic Component Test

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Testing User Interactions

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from './Button';

describe('Button', () => {
  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click me</Button>);

    await user.click(screen.getByText('Click me'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Testing Async Behavior

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AsyncComponent from './AsyncComponent';

describe('AsyncComponent', () => {
  it('loads data asynchronously', async () => {
    render(<AsyncComponent />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Data loaded!')).toBeInTheDocument();
    });
  });
});
```

## Test File Naming

- Test files should be named `*.test.tsx` or `*.test.ts`
- Place test files next to the components they test
- Example: `Button.tsx` → `Button.test.tsx`

## Coverage

Run coverage reports with:

```bash
npm run test:coverage
```

Coverage reports are generated in:
- Terminal: Text summary
- `coverage/index.html`: Interactive HTML report

**Coverage Goals:**
- Statements: >80%
- Branches: >75%
- Functions: >80%
- Lines: >80%

## Best Practices

### 1. Test User Behavior, Not Implementation

✅ **Good**: Test what users see and interact with
```typescript
expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
```

❌ **Bad**: Test internal state or implementation details
```typescript
expect(component.state.isOpen).toBe(true);
```

### 2. Use Accessible Queries

Prefer queries that match how users interact:
1. `getByRole` - Most accessible
2. `getByLabelText` - For form elements
3. `getByPlaceholderText` - For inputs
4. `getByText` - For non-interactive text
5. `getByTestId` - Last resort only

### 3. Use userEvent Over fireEvent

✅ **Good**: Simulates real user interactions
```typescript
await user.click(button);
await user.type(input, 'text');
```

❌ **Bad**: Low-level DOM events
```typescript
fireEvent.click(button);
```

### 4. Test Accessibility

```typescript
it('is keyboard accessible', async () => {
  const user = userEvent.setup();
  render(<Button onClick={handleClick}>Submit</Button>);

  await user.tab();
  expect(screen.getByText('Submit')).toHaveFocus();

  await user.keyboard('{Enter}');
  expect(handleClick).toHaveBeenCalled();
});
```

### 5. Keep Tests Isolated

- Each test should be independent
- Don't rely on test execution order
- Clean up is automatic via setup.ts

### 6. Use Descriptive Test Names

✅ **Good**:
```typescript
it('disables submit button when form is invalid', () => {})
```

❌ **Bad**:
```typescript
it('works', () => {})
```

## Common Patterns

### Testing Zustand Stores

```typescript
import { renderHook, act } from '@testing-library/react';
import { useMyStore } from './myStore';

it('updates state correctly', () => {
  const { result } = renderHook(() => useMyStore());

  act(() => {
    result.current.increment();
  });

  expect(result.current.count).toBe(1);
});
```

### Testing Router Components

```typescript
import { MemoryRouter } from 'react-router-dom';

it('navigates on click', () => {
  render(
    <MemoryRouter>
      <MyComponent />
    </MemoryRouter>
  );

  // ... test navigation
});
```

### Mocking Modules

```typescript
import { vi } from 'vitest';

vi.mock('./api', () => ({
  fetchData: vi.fn(() => Promise.resolve({ data: 'mock' }))
}));
```

## Troubleshooting

### "Element not found" errors

Use `screen.debug()` to see the current DOM:

```typescript
render(<MyComponent />);
screen.debug(); // Prints the DOM to console
```

### Async queries

Use `findBy` for elements that appear asynchronously:

```typescript
const element = await screen.findByText('Async content');
```

### Testing multiple elements

Use `getAllBy` for multiple matches:

```typescript
const buttons = screen.getAllByRole('button');
expect(buttons).toHaveLength(3);
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Common Testing Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Testing Playground](https://testing-playground.com/) - Interactive query builder
