import { describe, it, expect, vi } from 'vitest';
import { render } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
// screen is available through the wildcard export from test-utils
// Using getByRole, getByPlaceholderText, etc. directly from render result
import Login from '../Login';

// Mock the auth context
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    login: vi.fn().mockResolvedValue(undefined),
    register: vi.fn().mockResolvedValue(undefined),
    user: null,
    isLoading: false,
    isAuthenticated: false,
  }),
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Login Component', () => {
  it('should render login form', () => {
    const { getByRole, getByPlaceholderText } = render(<Login />);
    
    expect(getByRole('heading', { name: /sign in to your account/i })).toBeInTheDocument();
    expect(getByPlaceholderText(/email address/i)).toBeInTheDocument();
    expect(getByPlaceholderText(/password/i)).toBeInTheDocument();
    expect(getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should toggle to registration form', async () => {
    const user = userEvent.setup();
    const { getByRole, getByPlaceholderText } = render(<Login />);
    
    const toggleButton = getByRole('button', { name: /don't have an account/i });
    await user.click(toggleButton);
    
    expect(getByRole('heading', { name: /create your account/i })).toBeInTheDocument();
    expect(getByPlaceholderText(/full name/i)).toBeInTheDocument();
  });

  it('should toggle back to login form', async () => {
    const user = userEvent.setup();
    const { getByRole } = render(<Login />);
    
    // Switch to register
    await user.click(getByRole('button', { name: /don't have an account/i }));
    expect(getByRole('heading', { name: /create your account/i })).toBeInTheDocument();
    
    // Switch back to login
    await user.click(getByRole('button', { name: /already have an account/i }));
    expect(getByRole('heading', { name: /sign in to your account/i })).toBeInTheDocument();
  });

  it('should update email input value', async () => {
    const user = userEvent.setup();
    const { getByPlaceholderText } = render(<Login />);
    
    const emailInput = getByPlaceholderText(/email address/i);
    await user.type(emailInput, 'test@example.com');
    
    expect(emailInput).toHaveValue('test@example.com');
  });

  it('should update password input value', async () => {
    const user = userEvent.setup();
    const { getByPlaceholderText } = render(<Login />);
    
    const passwordInput = getByPlaceholderText(/password/i);
    await user.type(passwordInput, 'password123');
    
    expect(passwordInput).toHaveValue('password123');
  });
});

