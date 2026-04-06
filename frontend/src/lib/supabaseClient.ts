import { createGoClient } from './goSupabase';

/** Base URL for the Go API (same host as legacy VITE_BACKEND_URL). */
export const API_URL =
    import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

export const supabase = createGoClient(API_URL);

/** Bucket name for expense files (used with future /v1/storage); objects live in Backblaze B2. */
export const SUPABASE_STORAGE_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'expense-files';
