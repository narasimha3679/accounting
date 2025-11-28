/**
 * Mock helpers for Supabase in tests
 * Use these to mock Supabase client behavior in your tests
 */

import { vi } from 'vitest';

export const createMockSupabaseClient = () => ({
  auth: {
    getSession: vi.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    }),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
  })),
});

