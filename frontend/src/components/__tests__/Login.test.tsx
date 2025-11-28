import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
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
    render(<Login />);
    
    expect(screen.getByRole('heading', { name: /sign in to your account/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/email address/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should toggle to registration form', async () => {
    const user = userEvent.setup();
    render(<Login />);
    
    const toggleButton = screen.getByRole('button', { name: /don't have an account/i });
    await user.click(toggleButton);
    
    expect(screen.getByRole('heading', { name: /create your account/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/full name/i)).toBeInTheDocument();
  });

  it('should toggle back to login form', async () => {
    const user = userEvent.setup();
    render(<Login />);
    
    // Switch to register
    await user.click(screen.getByRole('button', { name: /don't have an account/i }));
    expect(screen.getByRole('heading', { name: /create your account/i })).toBeInTheDocument();
    
    // Switch back to login
    await user.click(screen.getByRole('button', { name: /already have an account/i }));
    expect(screen.getByRole('heading', { name: /sign in to your account/i })).toBeInTheDocument();
  });

  it('should update email input value', async () => {
    const user = userEvent.setup();
    render(<Login />);
    
    const emailInput = screen.getByPlaceholderText(/email address/i);
    await user.type(emailInput, 'test@example.com');
    
    expect(emailInput).toHaveValue('test@example.com');
  });

  it('should update password input value', async () => {
    const user = userEvent.setup();
    render(<Login />);
    
    const passwordInput = screen.getByPlaceholderText(/password/i);
    await user.type(passwordInput, 'password123');
    
    expect(passwordInput).toHaveValue('password123');
  });
});

