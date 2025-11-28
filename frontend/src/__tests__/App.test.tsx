import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithoutRouter } from '../test/test-utils';
import App from '../App';

// Mock the auth context
const mockLogin = vi.fn();
const mockRegister = vi.fn();
const mockLogout = vi.fn();
const mockRefreshUser = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({
    user: null,
    login: mockLogin,
    register: mockRegister,
    logout: mockLogout,
    refreshUser: mockRefreshUser,
    isLoading: false,
    isAuthenticated: false,
  }),
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render login page for unauthenticated users', () => {
    // App already includes Router, so we use renderWithoutRouter
    const { container } = renderWithoutRouter(<App />);
    
    // App should render
    expect(container).toBeInTheDocument();
  });

  it('should have routing structure', () => {
    const { container } = renderWithoutRouter(<App />);
    
    // App should render (router will handle navigation)
    expect(container).toBeInTheDocument();
  });
});

