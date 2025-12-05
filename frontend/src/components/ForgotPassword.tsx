import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import Card from './ui/Card';
import Button from './ui/Button';
import { ArrowLeft } from 'lucide-react';

const ForgotPassword: React.FC = () => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const { resetPasswordForEmail } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await resetPasswordForEmail(email);
            setIsSuccess(true);
        } catch (err) {
            const message = err instanceof Error
                ? err.message
                : 'Failed to send password reset email. Please try again.';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

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
                                    Reset your password
                                </h2>
                                <p className="mt-3 text-center text-sm text-slate-muted">
                                    Enter your email address and we'll send you a link to reset your password
                                </p>
                            </div>

                            {isSuccess ? (
                                <div className="space-y-4">
                                    <div className="rounded-xl glass-emerald border border-neon-emerald/30 p-4">
                                        <div className="text-sm font-medium text-neon-emerald">
                                            Password reset email sent!
                                        </div>
                                        <div className="text-xs text-slate-muted mt-2">
                                            Check your email for a link to reset your password. If it doesn't appear within a few minutes, check your spam folder.
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <Link
                                            to="/login"
                                            className="text-neon-emerald hover:text-neon-emerald/80 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-emerald focus-visible:ring-offset-2 rounded-md"
                                        >
                                            Back to sign in
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <form className="space-y-6" onSubmit={handleSubmit}>
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-semibold text-white mb-2">
                                            Email address
                                        </label>
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            required
                                            className="input glass border-white/10 text-white placeholder:text-slate-muted focus-visible:ring-neon-emerald"
                                            placeholder="Email address"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
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
                                            {isLoading ? 'Sending...' : 'Send reset link'}
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

export default ForgotPassword;

