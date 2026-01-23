import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import Card from './ui/Card';
import Button from './ui/Button';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const { login, register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            if (isRegistering) {
                await register(email, password, name);
                // After registration, redirect to onboarding if no company
                navigate('/onboarding/company');
            } else {
                await login(email, password);
                // After login, navigate to landing page which will handle redirect
                // based on user state (employee, has company, or needs onboarding)
                navigate('/');
            }
        } catch (err) {
            const message = err instanceof Error
                ? err.message
                : (isRegistering ? 'Couldn\'t create account. Please try again.' : 'Email or password is incorrect');
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
                                    {isRegistering ? 'Create your account' : 'Sign in to your account'}
                                </h2>
                                <p className="mt-3 text-center text-sm text-slate-muted">
                                    {isRegistering
                                        ? ''
                                        : 'Access your contracting business accounting tool'}
                                </p>
                            </div>
                            <form className="space-y-6" onSubmit={handleSubmit}>
                                <div className="space-y-4">
                                    {isRegistering && (
                                        <div>
                                            <label htmlFor="name" className="block text-sm font-semibold text-white mb-2">
                                                Full Name
                                            </label>
                                            <input
                                                id="name"
                                                name="name"
                                                type="text"
                                                autoComplete="name"
                                                required
                                                className="input glass border-white/10 text-white placeholder:text-slate-muted focus-visible:ring-neon-emerald"
                                                placeholder="Full Name"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                            />
                                        </div>
                                    )}
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
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label htmlFor="password" className="block text-sm font-semibold text-white">
                                                Password
                                            </label>
                                            {!isRegistering && (
                                                <Link
                                                    to="/forgot-password"
                                                    className="text-sm text-neon-emerald hover:text-neon-emerald/80 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-emerald focus-visible:ring-offset-2 rounded-md"
                                                >
                                                    Forgot password?
                                                </Link>
                                            )}
                                        </div>
                                        <input
                                            id="password"
                                            name="password"
                                            type="password"
                                            autoComplete={isRegistering ? "new-password" : "current-password"}
                                            required
                                            className="input glass border-white/10 text-white placeholder:text-slate-muted focus-visible:ring-neon-emerald"
                                            placeholder="Password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
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
                                        {isLoading ? (isRegistering ? 'Creating account...' : 'Signing in...') : (isRegistering ? 'Create account' : 'Sign in')}
                                    </Button>
                                </div>

                                <div className="text-center">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsRegistering(!isRegistering);
                                            setError('');
                                            setEmail('');
                                            setPassword('');
                                            setName('');
                                        }}
                                        className="text-neon-emerald hover:text-neon-emerald/80 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-emerald focus-visible:ring-offset-2 rounded-md"
                                    >
                                        {isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
};

export default Login;
