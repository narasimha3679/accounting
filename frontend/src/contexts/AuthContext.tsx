import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '../lib/api';
import { supabase } from '../lib/supabaseClient';

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    isLoading: boolean;
    isAuthenticated: boolean;
}

interface ProfileRow {
    id: number;
    auth_user_id: string;
    email: string;
    full_name: string | null;
    role: 'admin' | 'accountant' | 'viewer';
    company_id: number | null;
    created_at: string;
    updated_at: string;
    company?: {
        id: number;
        name: string;
        business_number: string;
        hst_number: string | null;
        hst_registered: boolean;
        fiscal_year_end: string;
        small_business_rate: number;
        hst_rate: number;
        created_at: string;
        updated_at: string;
    } | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

const mapProfileToUser = (profile: ProfileRow | null): User | null => {
    if (!profile) return null;

    return {
        id: profile.id,
        email: profile.email,
        name: profile.full_name ?? '',
        role: profile.role,
        company_id: profile.company_id ?? 0,
        company: profile.company ?? undefined,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
    };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadProfile = async () => {
        const { data: sessionData } = await supabase.auth.getSession();
        const sessionUser = sessionData.session?.user;
        if (!sessionUser) {
            setUser(null);
            return;
        }

        const { data, error } = await supabase
            .from('profiles')
            .select(`
                id,
                auth_user_id,
                email,
                full_name,
                role,
                company_id,
                created_at,
                updated_at,
                company:companies (
                    id,
                    name,
                    business_number,
                    hst_number,
                    hst_registered,
                    fiscal_year_end,
                    small_business_rate,
                    hst_rate,
                    created_at,
                    updated_at
                )
            `)
            .eq('auth_user_id', sessionUser.id)
            .maybeSingle<ProfileRow>();

        if (error) {
            // If profile lookup fails due to RLS or missing row, fall back to basic auth user info
            console.warn('Failed to load profile, falling back to auth user only', error);
            const fallback: User = {
                id: 0,
                email: sessionUser.email ?? '',
                name: (sessionUser.user_metadata as any)?.full_name ?? '',
                role: 'viewer',
                company_id: 0,
                company: undefined,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            setUser(fallback);
            return;
        }

        const mapped = mapProfileToUser(data);
        if (mapped) {
            setUser(mapped);
        } else {
            // No profile row yet – still allow using the bare auth user
            const fallback: User = {
                id: 0,
                email: sessionUser.email ?? '',
                name: (sessionUser.user_metadata as any)?.full_name ?? '',
                role: 'viewer',
                company_id: 0,
                company: undefined,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            setUser(fallback);
        }
    };

    useEffect(() => {
        loadProfile()
            .catch((error) => {
                console.error('Error initializing auth', error);
            })
            .finally(() => {
                setIsLoading(false);
            });

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                loadProfile().catch((error) => {
                    console.error('Error refreshing profile', error);
                    setUser(null);
                });
            } else {
                setUser(null);
            }
        });

        return () => {
            listener.subscription.unsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const login = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            throw error;
        }
        await loadProfile();
    };

    const register = async (email: string, password: string, name: string) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: name },
            },
        });

        if (error || !data.user) {
            throw error ?? new Error('Registration failed');
        }

        // Best-effort profile creation – don't block signup if this fails due to RLS
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert(
                {
                    auth_user_id: data.user.id,
                    email,
                    full_name: name,
                    role: 'viewer',
                },
                { onConflict: 'auth_user_id' }
            );

        if (profileError) {
            console.warn('Profile upsert failed after signup (continuing anyway)', profileError);
        }

        await loadProfile();
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    const refreshUser = async () => {
        await loadProfile();
    };

    const value = {
        user,
        login,
        register,
        logout,
        refreshUser,
        isLoading,
        isAuthenticated: !!user,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
