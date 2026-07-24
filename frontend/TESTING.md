# Testing Guide

This project uses unit and component testing for code quality assurance.

## Testing Stack

- **Vitest** - Fast unit and component testing (works seamlessly with Vite)
- **React Testing Library** - Component testing utilities

## Running Tests

### Unit & Component Tests

```bash
# Run tests in watch mode (default)
npm run test

# Run tests with UI
npm run test:ui

# Run tests once with coverage
npm run test:coverage
```

## Writing Tests

### Unit/Component Tests

Create test files next to your components with the `.test.tsx` or `.test.ts` extension:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/test-utils';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

## Test Utilities

### Test Utils (`src/test/test-utils.tsx`)

Provides a custom `render` function that wraps components with all necessary providers (Router, QueryClient, AuthProvider).

### Test Setup (`src/test/setup.ts`)

Configures the testing environment, including:
- Jest DOM matchers
- Window.matchMedia mock
- Cleanup after each test

## Best Practices

1. **Test user behavior, not implementation details**
2. **Use accessible queries** (getByRole, getByLabelText, etc.)
3. **Keep tests isolated** - each test should be independent
4. **Use descriptive test names** that explain what is being tested
5. **Mock external dependencies** (API calls, auth, etc.)
6. **Test error states and edge cases**

## Debugging Tests

### Vitest
- Use `console.log` or `debugger` statements
- Run with `--ui` flag for interactive debugging
- Use `--reporter=verbose` for detailed output

## Coverage

Coverage reports are generated in the `coverage/` directory. Open `coverage/index.html` in a browser to view detailed coverage information.

## End-to-End (Playwright)

UI E2E lives in the repo-root [`playwright-ui/`](../playwright-ui/) package (not under `frontend/`). See [`playwright-ui/README.md`](../playwright-ui/README.md).

```bash
# From repo root
npm run test:ui
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
