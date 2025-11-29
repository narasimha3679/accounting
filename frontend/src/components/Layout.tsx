import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    Home,
    FileText,
    Receipt,
    TrendingUp,
    Users,
    Settings,
    LogOut,
    Calculator,
    DollarSign,
    Banknote,
    Building2,
    Menu,
    X,
    CreditCard
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const navigation = [
        { name: 'Dashboard', href: '/', icon: Home },
        { name: 'Invoices', href: '/invoices', icon: FileText },
        { name: 'Income', href: '/income', icon: DollarSign },
        { name: 'Expenses', href: '/expenses', icon: Receipt },
        { name: 'Capital Assets', href: '/capital-assets', icon: Building2 },
        { name: 'Dividends', href: '/dividends', icon: Banknote },
        { name: 'Owner Payments', href: '/owner-payments', icon: CreditCard },
        { name: 'Clients', href: '/clients', icon: Users },
        { name: 'Reports', href: '/reports', icon: TrendingUp },
        { name: 'Tax Calculator', href: '/tax-calculator', icon: Calculator },
        { name: 'Settings', href: '/settings', icon: Settings },
    ];

    const isActive = (href: string) => {
        return location.pathname === href;
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}>
                <div className="flex h-full flex-col">
                    {/* Logo */}
                    <div className="flex h-20 items-center justify-between border-b border-gray-200 px-6 bg-gradient-to-r from-primary-50 to-blue-50">
                        <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                            Accounting Tool
                        </h1>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-2 px-3 py-6 overflow-y-auto">
                        {navigation.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`group flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
                                        isActive(item.href)
                                            ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                                >
                                    <Icon
                                        className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors ${
                                            isActive(item.href)
                                                ? 'text-white'
                                                : 'text-gray-400 group-hover:text-gray-600'
                                        }`}
                                    />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User info and logout */}
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-md">
                                    <span className="text-sm font-bold text-white">
                                        {user?.name?.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            </div>
                            <div className="ml-3 flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                            </div>
                            <button
                                onClick={logout}
                                className="ml-2 p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
                                title="Logout"
                            >
                                <LogOut className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="lg:pl-64">
                {/* Mobile header */}
                <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 px-4 py-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                            <Menu className="h-6 w-6" />
                        </button>
                        <h1 className="text-lg font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                            Accounting Tool
                        </h1>
                        <div className="w-10" /> {/* Spacer for centering */}
                    </div>
                </div>

                <main className="py-6">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;

