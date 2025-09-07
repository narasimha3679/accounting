import React, { createContext, useContext, useEffect, useState } from 'react';
import api, { type User } from '../lib/api';

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check if user is already authenticated
        const token = localStorage.getItem('auth_token');
        if (token) {
            // Try to get user profile
            api.getProfile()
                .then(userData => {
                    setUser(userData);
                })
                .catch(error => {
                    console.error('Error getting user profile:', error);
                    // Token might be invalid, clear it
                    localStorage.removeItem('auth_token');
                })
                .finally(() => {
                    setIsLoading(false);
                });
        } else {
            setIsLoading(false);
        }
    }, []);

    const login = async (email: string, password: string) => {
        try {
            console.log('Attempting to authenticate with:', email);
            const response = await api.login({ email, password });
            console.log('Login response:', response);
            setUser(response.user);
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    };

    const register = async (email: string, password: string, name: string) => {
        try {
            console.log('Attempting to register user:', email);
            const response = await api.register({ email, password, name });
            console.log('Registration response:', response);
            setUser(response.user);
        } catch (error) {
            console.error('Registration failed:', error);
            throw error;
        }
    };

    const logout = () => {
        api.logout();
        setUser(null);
    };

    const value = {
        user,
        login,
        register,
        logout,
        isLoading,
        isAuthenticated: !!user,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
