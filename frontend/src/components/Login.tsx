import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

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
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 py-6 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full">
                {/* Card Container */}
                <div className="bg-white rounded-2xl shadow-card-hover border border-gray-100 p-8 sm:p-10">
                    <div className="space-y-6 sm:space-y-8">
                        <div>
                            <h2 className="text-center text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                                {isRegistering ? 'Create your account' : 'Sign in to your account'}
                            </h2>
                            <p className="mt-3 text-center text-sm text-gray-600">
                                {isRegistering
                                    ? 'After creating an account, ask an admin to assign you to a company.'
                                    : 'Access your contracting business accounting tool'}
                            </p>
                        </div>
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            <div className="space-y-4">
                                {isRegistering && (
                                    <div>
                                        <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
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
                                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
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
                                    <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
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
                                <div className="rounded-xl bg-red-50 border-2 border-red-200 p-4">
                                    <div className="text-sm font-medium text-red-700">{error}</div>
                                </div>
                            )}

                            <div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="btn btn-primary w-full"
                                >
                                    {isLoading ? (isRegistering ? 'Creating account...' : 'Signing in...') : (isRegistering ? 'Create account' : 'Sign in')}
                                </button>
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
                                    className="text-primary-600 hover:text-primary-700 text-sm font-semibold transition-colors"
                                >
                                    {isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
