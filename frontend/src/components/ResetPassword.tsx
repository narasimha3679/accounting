import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { setTokens } from '../lib/goSupabase';
import Card from './ui/Card';
import Button from './ui/Button';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

const ResetPassword: React.FC = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [confirmPasswordError, setConfirmPasswordError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isChecking, setIsChecking] = useState(true);
    const [canReset, setCanReset] = useState(false);
    const { updatePassword, isPasswordRecovery } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const checkRecoveryState = async () => {
            const hash = window.location.hash;
            if (hash.length > 1) {
                const hashParams = new URLSearchParams(hash.substring(1));
                const accessToken = hashParams.get('access_token');
                const refreshToken = hashParams.get('refresh_token');
                if (accessToken) {
                    setTokens(accessToken, refreshToken || undefined);
                    window.history.replaceState(null, '', window.location.pathname + window.location.search);
                }
            }

            const {
                data: { session },
            } = await supabase.auth.getSession();
            if (session || isPasswordRecovery) {
                setCanReset(true);
            } else if (hash.length > 1) {
                setError(
                    'Invalid or expired reset link. Ask your admin to resend a reset, or use a link that includes access_token in the hash.',
                );
            } else {
                setError('No password reset token found. Please request a new password reset link.');
            }
            setIsChecking(false);
        };

        void checkRecoveryState();
    }, [isPasswordRecovery]);

    const validatePassword = (value: string) => {
        if (value.length > 0 && value.length < 8) {
            return 'Password must be at least 8 characters long';
        }
        return '';
    };

    const validateConfirmPassword = (value: string, passwordValue: string) => {
        if (value.length > 0 && value !== passwordValue) {
            return 'Passwords do not match';
        }
        return '';
    };

    const handlePasswordBlur = () => {
        const error = validatePassword(password);
        setPasswordError(error);
        
        // Also validate confirm password if it has a value
        if (confirmPassword.length > 0) {
            const confirmError = validateConfirmPassword(confirmPassword, password);
            setConfirmPasswordError(confirmError);
        }
    };

    const handleConfirmPasswordBlur = () => {
        const error = validateConfirmPassword(confirmPassword, password);
        setConfirmPasswordError(error);
    };

    const handlePasswordChange = (value: string) => {
        setPassword(value);
        // Clear password error when user starts typing
        if (passwordError) {
            setPasswordError('');
        }
        // Re-validate confirm password if it has a value
        if (confirmPassword.length > 0) {
            const confirmError = validateConfirmPassword(confirmPassword, value);
            setConfirmPasswordError(confirmError);
        }
    };

    const handleConfirmPasswordChange = (value: string) => {
        setConfirmPassword(value);
        // Clear confirm password error when user starts typing
        if (confirmPasswordError) {
            setConfirmPasswordError('');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validate password length
        const passwordErr = validatePassword(password);
        if (passwordErr) {
            setPasswordError(passwordErr);
            return;
        }

        // Validate passwords match
        const confirmErr = validateConfirmPassword(confirmPassword, password);
        if (confirmErr) {
            setConfirmPasswordError(confirmErr);
            return;
        }

        setIsLoading(true);

        try {
            await updatePassword(password);
            setIsSuccess(true);
            // Redirect to login after 3 seconds
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            const message = err instanceof Error
                ? err.message
                : 'Failed to update password. Please try again.';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    if (isChecking || !canReset) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-deep-forest">
                <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-emerald mx-auto"></div>
                    {error && (
                        <div className="max-w-md mx-auto">
                            <div className="rounded-xl glass border border-destructive/30 p-4">
                                <div className="text-sm font-medium text-destructive">{error}</div>
                                <Link
                                    to="/forgot-password"
                                    className="text-neon-emerald hover:text-neon-emerald/80 text-sm font-semibold mt-2 inline-block"
                                >
                                    Request a new reset link
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-deep-forest py-6 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <Card className="p-8 sm:p-10 glass-heavy">
                        <div className="space-y-6 sm:space-y-8">
                            <div>
                                <h2 className="text-center text-3xl sm:text-4xl font-bold tracking-tight text-white">
                                    Set new password
                                </h2>
                                <p className="mt-3 text-center text-sm text-slate-muted">
                                    Enter your new password below
                                </p>
                            </div>

                            {isSuccess ? (
                                <div className="space-y-4">
                                    <div className="rounded-xl glass-emerald border border-neon-emerald/30 p-4">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="w-5 h-5 text-neon-emerald" />
                                            <div className="text-sm font-medium text-neon-emerald">
                                                Password updated successfully!
                                            </div>
                                        </div>
                                        <div className="text-xs text-slate-muted mt-2">
                                            Redirecting you to sign in...
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <form className="space-y-6" onSubmit={handleSubmit}>
                                    <div className="space-y-4">
                                        <div>
                                            <label htmlFor="password" className="block text-sm font-semibold text-white mb-2">
                                                New Password
                                            </label>
                                            <input
                                                id="password"
                                                name="password"
                                                type="password"
                                                autoComplete="new-password"
                                                required
                                                className={`input glass border-white/10 text-white placeholder:text-slate-muted focus-visible:ring-neon-emerald ${
                                                    passwordError ? 'border-destructive focus-visible:ring-destructive' : ''
                                                }`}
                                                placeholder="New password"
                                                value={password}
                                                onChange={(e) => handlePasswordChange(e.target.value)}
                                                onBlur={handlePasswordBlur}
                                            />
                                            {passwordError && (
                                                <p className="mt-1 text-sm text-destructive">{passwordError}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-white mb-2">
                                                Confirm Password
                                            </label>
                                            <input
                                                id="confirmPassword"
                                                name="confirmPassword"
                                                type="password"
                                                autoComplete="new-password"
                                                required
                                                className={`input glass border-white/10 text-white placeholder:text-slate-muted focus-visible:ring-neon-emerald ${
                                                    confirmPasswordError ? 'border-destructive focus-visible:ring-destructive' : ''
                                                }`}
                                                placeholder="Confirm new password"
                                                value={confirmPassword}
                                                onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                                                onBlur={handleConfirmPasswordBlur}
                                            />
                                            {confirmPasswordError && (
                                                <p className="mt-1 text-sm text-destructive">{confirmPasswordError}</p>
                                            )}
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="rounded-xl glass border border-destructive/30 p-4">
                                            <div className="text-sm font-medium text-destructive">{error}</div>
                                        </div>
                                    )}

                                    <div>
                                        <Button
                                            type="submit"
                                            disabled={isLoading}
                                            className="w-full"
                                            size="lg"
                                        >
                                            {isLoading ? 'Updating password...' : 'Update password'}
                                        </Button>
                                    </div>

                                    <div className="text-center">
                                        <Link
                                            to="/login"
                                            className="inline-flex items-center text-neon-emerald hover:text-neon-emerald/80 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-emerald focus-visible:ring-offset-2 rounded-md"
                                        >
                                            <ArrowLeft className="w-4 h-4 mr-1" />
                                            Back to sign in
                                        </Link>
                                    </div>
                                </form>
                            )}
                        </div>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
};

export default ResetPassword;

