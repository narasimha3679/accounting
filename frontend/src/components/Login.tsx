import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
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
            } else {
                await login(email, password);
            }
            navigate('/');
        } catch (err) {
            const message = err instanceof Error
                ? err.message
                : (isRegistering ? 'Registration failed. Please try again.' : 'Invalid email or password');
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background py-6 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full">
                <Card className="p-8 sm:p-10">
                    <div className="space-y-6 sm:space-y-8">
                        <div>
                            <h2 className="text-center text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                                {isRegistering ? 'Create your account' : 'Sign in to your account'}
                            </h2>
                            <p className="mt-3 text-center text-sm text-muted-foreground">
                                {isRegistering
                                    ? 'After creating an account, ask an admin to assign you to a company.'
                                    : 'Access your contracting business accounting tool'}
                            </p>
                        </div>
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            <div className="space-y-4">
                                {isRegistering && (
                                    <div>
                                        <label htmlFor="name" className="block text-sm font-semibold text-foreground mb-2">
                                            Full Name
                                        </label>
                                        <input
                                            id="name"
                                            name="name"
                                            type="text"
                                            autoComplete="name"
                                            required
                                            className="input"
                                            placeholder="Full Name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                        />
                                    </div>
                                )}
                                <div>
                                    <label htmlFor="email" className="block text-sm font-semibold text-foreground mb-2">
                                        Email address
                                    </label>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        className="input"
                                        placeholder="Email address"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="password" className="block text-sm font-semibold text-foreground mb-2">
                                        Password
                                    </label>
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        autoComplete={isRegistering ? "new-password" : "current-password"}
                                        required
                                        className="input"
                                        placeholder="Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4">
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
                                    className="text-primary hover:text-primary/80 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
                                >
                                    {isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
                                </button>
                            </div>
                        </form>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default Login;
