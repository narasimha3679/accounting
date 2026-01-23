import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, User } from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';
import { Logo } from './ui/Logo';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
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
        <div className="min-h-screen flex items-center justify-center bg-deep-forest py-6 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Enhanced background with gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-deep-forest via-charcoal/50 to-deep-forest opacity-60"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(52,211,153,0.05),transparent_50%)]"></div>
            
            <div className="max-w-md w-full relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                >
                    <Card className="p-6 sm:p-8 lg:p-10 glass-heavy">
                        <div className="space-y-6 sm:space-y-8">
                            {/* Logo with glow effect */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                                className="flex justify-center mb-6 sm:mb-8 lg:mb-10"
                            >
                                <div className="relative">
                                    <Logo size="lg" className="relative z-10" />
                                    <div className="absolute inset-0 bg-neon-emerald/20 blur-2xl rounded-full -z-0"></div>
                                </div>
                            </motion.div>

                            {/* Header */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                            >
                                <h2 className="text-center text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white">
                                    {isRegistering ? 'Create your account' : 'Sign in to your account'}
                                </h2>
                            </motion.div>

                            <form className="space-y-5 sm:space-y-6" onSubmit={handleSubmit}>
                                <div className="space-y-5 sm:space-y-6">
                                    {/* Name field for registration */}
                                    <AnimatePresence>
                                        {isRegistering && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                transition={{ duration: 0.3 }}
                                            >
                                                <label htmlFor="name" className="block text-sm font-semibold text-white mb-2">
                                                    Full Name
                                                </label>
                                                <div className="relative">
                                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-muted pointer-events-none" />
                                                    <input
                                                        id="name"
                                                        name="name"
                                                        type="text"
                                                        autoComplete="name"
                                                        required
                                                        className="input glass border-white/10 text-white placeholder:text-slate-muted focus-visible:ring-2 focus-visible:ring-neon-emerald focus-visible:ring-offset-2 focus-visible:ring-offset-deep-forest pl-10 pr-4 py-3 sm:py-2.5 transition-all duration-200 focus-visible:border-neon-emerald/50"
                                                        placeholder="Full Name"
                                                        value={name}
                                                        onChange={(e) => setName(e.target.value)}
                                                        disabled={isLoading}
                                                    />
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Email field */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.5, delay: isRegistering ? 0.3 : 0.3 }}
                                    >
                                        <label htmlFor="email" className="block text-sm font-semibold text-white mb-2">
                                            Email address
                                        </label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-muted pointer-events-none" />
                                            <input
                                                id="email"
                                                name="email"
                                                type="email"
                                                autoComplete="email"
                                                required
                                                className="input glass border-white/10 text-white placeholder:text-slate-muted focus-visible:ring-2 focus-visible:ring-neon-emerald focus-visible:ring-offset-2 focus-visible:ring-offset-deep-forest pl-10 pr-4 py-3 sm:py-2.5 transition-all duration-200 focus-visible:border-neon-emerald/50"
                                                placeholder="Email address"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                disabled={isLoading}
                                            />
                                        </div>
                                    </motion.div>

                                    {/* Password field */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.5, delay: isRegistering ? 0.4 : 0.4 }}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <label htmlFor="password" className="block text-sm font-semibold text-white">
                                                Password
                                            </label>
                                            {!isRegistering && (
                                                <Link
                                                    to="/forgot-password"
                                                    className="text-sm text-neon-emerald hover:text-neon-emerald/80 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-emerald focus-visible:ring-offset-2 rounded-md touch-manipulation min-h-[44px] flex items-center"
                                                >
                                                    Forgot password?
                                                </Link>
                                            )}
                                        </div>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-muted pointer-events-none" />
                                            <input
                                                id="password"
                                                name="password"
                                                type={showPassword ? "text" : "password"}
                                                autoComplete={isRegistering ? "new-password" : "current-password"}
                                                required
                                                className="input glass border-white/10 text-white placeholder:text-slate-muted focus-visible:ring-2 focus-visible:ring-neon-emerald focus-visible:ring-offset-2 focus-visible:ring-offset-deep-forest pl-10 pr-12 py-3 sm:py-2.5 transition-all duration-200 focus-visible:border-neon-emerald/50"
                                                placeholder="Password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                disabled={isLoading}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-muted hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-emerald focus-visible:ring-offset-2 rounded-md p-1 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                                                aria-label={showPassword ? "Hide password" : "Show password"}
                                                disabled={isLoading}
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="h-5 w-5" />
                                                ) : (
                                                    <Eye className="h-5 w-5" />
                                                )}
                                            </button>
                                        </div>
                                    </motion.div>
                                </div>

                                {/* Error message with icon */}
                                <AnimatePresence>
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10, height: 0 }}
                                            animate={{ opacity: 1, y: 0, height: "auto" }}
                                            exit={{ opacity: 0, y: -10, height: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="rounded-xl glass border border-destructive/30 bg-destructive/10 p-4"
                                        >
                                            <div className="flex items-start gap-3">
                                                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                                                <div className="text-sm font-medium text-destructive flex-1">{error}</div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Submit button */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: isRegistering ? 0.5 : 0.5 }}
                                >
                                    <Button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full py-3 sm:py-2.5 relative overflow-hidden"
                                        size="lg"
                                    >
                                        {isLoading && (
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        )}
                                        {isLoading 
                                            ? (isRegistering ? 'Creating account...' : 'Signing in...') 
                                            : (isRegistering ? 'Create account' : 'Sign in')
                                        }
                                    </Button>
                                </motion.div>

                                {/* Toggle between login/register */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.5, delay: 0.6 }}
                                    className="pt-4 border-t border-white/10"
                                >
                                    <div className="text-center">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsRegistering(!isRegistering);
                                                setError('');
                                                setEmail('');
                                                setPassword('');
                                                setName('');
                                                setShowPassword(false);
                                            }}
                                            className="text-neon-emerald hover:text-neon-emerald/80 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-emerald focus-visible:ring-offset-2 rounded-md touch-manipulation min-h-[44px] flex items-center justify-center mx-auto px-4"
                                            disabled={isLoading}
                                        >
                                            {isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
                                        </button>
                                    </div>
                                </motion.div>
                            </form>
                        </div>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
};

export default Login;
