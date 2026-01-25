import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { User, Employee, CompanyMembership } from '../lib/api';
import { supabase } from '../lib/supabaseClient';

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    switchCompany: (companyId: number) => Promise<void>;
    resetPasswordForEmail: (email: string) => Promise<void>;
    updatePassword: (newPassword: string) => Promise<void>;
    isLoading: boolean;
    isAuthenticated: boolean;
    isPasswordRecovery: boolean;
    session: Session | null;
}

interface ProfileRow {
    id: number;
    auth_user_id: string;
    email: string;
    full_name: string | null;
    role: 'admin' | 'owner' | 'accountant' | 'viewer';
    company_id: number | null;
    created_at: string;
    updated_at: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

const mapProfileToUser = (profile: ProfileRow | null, companies?: CompanyMembership[]): User | null => {
    if (!profile) return null;

    // Find the primary company membership or fallback to first one
    const primaryMembership = companies?.find(c => c.is_primary) || companies?.[0];
    const currentCompany = primaryMembership?.company;
    const currentRole = primaryMembership?.role ?? profile.role;

    return {
        id: profile.id,
        email: profile.email,
        name: profile.full_name ?? '',
        role: currentRole as User['role'],
        company_id: primaryMembership?.company_id ?? profile.company_id ?? 0,
        company: currentCompany,
        companies: companies,
        currentCompanyId: primaryMembership?.company_id ?? profile.company_id,
        currentCompany: currentCompany,
        permissions: primaryMembership?.permissions ?? undefined,
        isEmployee: false,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
    };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null); // State for session
    const [isLoading, setIsLoading] = useState(true);
    const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

    const loadProfile = async () => {
        const { data: sessionData } = await supabase.auth.getSession();
        const sessionUser = sessionData.session?.user;
        if (!sessionUser) {
            setUser(null);
            return;
        }

        // First check if user is an employee
        const { data: employeeData, error: employeeError } = await supabase
            .from('employees')
            .select(`
                id,
                company_id,
                auth_user_id,
                employee_id,
                first_name,
                last_name,
                email,
                phone,
                position,
                hire_date,
                status,
                address,
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
                    business_type,
                    enabled_features,
                    created_at,
                    updated_at
                )
            `)
            .eq('auth_user_id', sessionUser.id)
            .maybeSingle<Employee>();

        if (!employeeError && employeeData) {
            // User is an employee
            const employeeUser: User = {
                id: employeeData.id,
                email: employeeData.email,
                name: `${employeeData.first_name} ${employeeData.last_name}`,
                role: 'employee',
                company_id: employeeData.company_id,
                company: employeeData.company ?? undefined,
                isEmployee: true,
                employee: employeeData,
                created_at: employeeData.created_at,
                updated_at: employeeData.updated_at,
            };
            setUser(employeeUser);
            return;
        }

        // Check if user is a company user (profile)
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
                    business_type,
                    enabled_features,
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
                isEmployee: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            setUser(fallback);
            return;
        }

        if (!data) {
            // No profile row yet – still allow using the bare auth user
            const fallback: User = {
                id: 0,
                email: sessionUser.email ?? '',
                name: (sessionUser.user_metadata as any)?.full_name ?? '',
                role: 'viewer',
                company_id: 0,
                company: undefined,
                isEmployee: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            setUser(fallback);
            return;
        }

        // Load user's company memberships from user_companies table
        const { data: memberships, error: membershipError } = await supabase
            .from('user_companies')
            .select(`
                id,
                user_id,
                company_id,
                role,
                permissions,
                is_primary,
                invite_status,
                created_at,
                updated_at,
                company:companies (*)
            `)
            .eq('user_id', data.id)
            .eq('invite_status', 'accepted')
            .order('is_primary', { ascending: false });

        if (membershipError) {
            console.warn('Failed to load company memberships', membershipError);
        }

        // Transform memberships to match CompanyMembership interface
        const companies: CompanyMembership[] = (memberships ?? []).map((m: any) => ({
            id: m.id,
            user_id: m.user_id,
            company_id: m.company_id,
            role: m.role,
            permissions: m.permissions,
            is_primary: m.is_primary,
            invite_status: m.invite_status,
            created_at: m.created_at,
            updated_at: m.updated_at,
            company: Array.isArray(m.company) ? m.company[0] : m.company,
        }));

        // Check for stored company preference
        const storedCompanyId = localStorage.getItem('selectedCompanyId');
        if (storedCompanyId && companies.length > 0) {
            const storedMembership = companies.find(c => c.company_id === parseInt(storedCompanyId));
            if (storedMembership) {
                // Move stored preference to be treated as "primary" for this session
                const idx = companies.indexOf(storedMembership);
                if (idx > 0) {
                    companies.splice(idx, 1);
                    companies.unshift(storedMembership);
                }
            }
        }

        const mapped = mapProfileToUser(data, companies);
        if (mapped) {
            setUser({ ...mapped, isEmployee: false });
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

        const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                setIsPasswordRecovery(true);
            } else {
                setIsPasswordRecovery(false);
            }

            setSession(session); // Update session state

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
            console.error('Profile upsert failed after signup:', profileError);
            // Still continue, but log the error for debugging
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

    const resetPasswordForEmail = async (email: string) => {
        const redirectTo = `${window.location.origin}/reset-password`;
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo,
        });
        if (error) {
            throw error;
        }
    };

    const updatePassword = async (newPassword: string) => {
        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        });
        if (error) {
            throw error;
        }
        setIsPasswordRecovery(false);
        await loadProfile();
    };

    const switchCompany = async (companyId: number) => {
        if (!user || !user.companies) return;

        const membership = user.companies.find(c => c.company_id === companyId);
        if (!membership) {
            throw new Error('You do not have access to this company');
        }

        // Update the user state with new current company
        setUser({
            ...user,
            company_id: companyId,
            company: membership.company,
            currentCompanyId: companyId,
            currentCompany: membership.company,
            role: membership.role as User['role'],
            permissions: membership.permissions ?? undefined,
        });

        // Persist selection to localStorage (optional - for session persistence)
        localStorage.setItem('selectedCompanyId', companyId.toString());
    };

    const value = {
        user,
        login,
        register,
        logout,
        refreshUser,
        switchCompany,
        resetPasswordForEmail,
        updatePassword,
        isLoading,
        isAuthenticated: !!user,
        isPasswordRecovery,
        session,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
