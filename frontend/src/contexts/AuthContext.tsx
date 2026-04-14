import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Employee, CompanyMembership } from '../lib/api';
import { supabase } from '../lib/supabaseClient';
import type { AppSession } from '../lib/goSupabase';

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    switchCompany: (companyId: number) => Promise<void>;
    resetPasswordForEmail: (email: string) => Promise<void>;
    resetPasswordWithToken: (token: string, newPassword: string) => Promise<void>;
    updatePassword: (newPassword: string) => Promise<void>;
    isLoading: boolean;
    isAuthenticated: boolean;
    isPasswordRecovery: boolean;
    session: AppSession | null;
}

interface ProfileRow {
    id: number;
    auth_user_id: string;
    email: string;
    full_name: string | null;
    role: 'admin' | 'owner' | 'accountant' | 'viewer' | 'manager';
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
    const [session, setSession] = useState<AppSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

    const loadProfile = async () => {
        try {
        const { data: sessionData } = await supabase.auth.getSession();
        const sessionUser = sessionData.session?.user;
        if (!sessionUser) {
            setUser(null);
            return;
        }

        const meResult = await supabase.auth.getMe();
        if (meResult.error || !meResult.data) {
            console.warn('Failed to load /v1/auth/me', meResult.error);
            const fallback: User = {
                id: 0,
                email: sessionUser.email ?? '',
                name: '',
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

        const me = meResult.data as {
            kind: string;
            employee?: Employee;
            company?: Employee['company'];
            profile?: ProfileRow;
            memberships?: unknown[];
        };

        if (me.kind === 'employee' && me.employee) {
            const employeeData = me.employee;
            const c = me.company;
            const employeeUser: User = {
                id: employeeData.id,
                email: employeeData.email,
                name: `${employeeData.first_name} ${employeeData.last_name}`,
                role: 'employee',
                company_id: employeeData.company_id,
                company: c ?? undefined,
                isEmployee: true,
                employee: { ...employeeData, company: c },
                created_at: employeeData.created_at,
                updated_at: employeeData.updated_at,
            };
            setUser(employeeUser);
            return;
        }

        const data = me.profile;
        if (!data) {
            const fallback: User = {
                id: 0,
                email: sessionUser.email ?? '',
                name: '',
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

        const companies: CompanyMembership[] = (me.memberships ?? []).map((m: any) => ({
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

        const storedCompanyId = localStorage.getItem('selectedCompanyId');
        if (storedCompanyId && companies.length > 0) {
            const storedMembership = companies.find(c => c.company_id === parseInt(storedCompanyId, 10));
            if (storedMembership) {
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
        } finally {
            const { data: sd } = await supabase.auth.getSession();
            setSession(sd.session ?? null);
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

        const { data: listener } = supabase.auth.onAuthStateChange((event, sess) => {
            if (event === 'PASSWORD_RECOVERY') {
                setIsPasswordRecovery(true);
            } else {
                setIsPasswordRecovery(false);
            }

            setSession(sess);

            if (sess?.user) {
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
        const { error, data } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            throw error;
        }
        setSession(data.session ?? null);
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

        if (error || !data.session) {
            throw error ?? new Error('Registration failed');
        }

        setSession(data.session);
        await loadProfile();
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setSession(null);
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

    const resetPasswordWithToken = async (token: string, newPassword: string) => {
        const { error } = await supabase.auth.resetPasswordWithToken(token, newPassword);
        if (error) {
            throw error;
        }
        setIsPasswordRecovery(false);
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
        resetPasswordWithToken,
        updatePassword,
        isLoading,
        isAuthenticated: !!user,
        isPasswordRecovery,
        session,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
