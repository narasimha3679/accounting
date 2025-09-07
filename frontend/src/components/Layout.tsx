import React from 'react';
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
    Banknote
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const { user, logout } = useAuth();
    const location = useLocation();

    const navigation = [
        { name: 'Dashboard', href: '/', icon: Home },
        { name: 'Invoices', href: '/invoices', icon: FileText },
        { name: 'Income', href: '/income', icon: DollarSign },
        { name: 'Expenses', href: '/expenses', icon: Receipt },
        { name: 'Dividends', href: '/dividends', icon: Banknote },
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
            {/* Sidebar */}
            <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg">
                <div className="flex h-full flex-col">
                    {/* Logo */}
                    <div className="flex h-16 items-center justify-center border-b border-gray-200">
                        <h1 className="text-xl font-bold text-primary-600">Accounting Tool</h1>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-1 px-2 py-4">
                        {navigation.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${isActive(item.href)
                                        ? 'bg-primary-100 text-primary-700'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                >
                                    <Icon
                                        className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive(item.href) ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                                            }`}
                                    />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User info and logout */}
                    <div className="border-t border-gray-200 p-4">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                                    <span className="text-sm font-medium text-primary-700">
                                        {user?.name?.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            </div>
                            <div className="ml-3 flex-1">
                                <p className="text-sm font-medium text-gray-700">{user?.name}</p>
                                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                            </div>
                            <button
                                onClick={logout}
                                className="ml-2 p-1 text-gray-400 hover:text-gray-600"
                                title="Logout"
                            >
                                <LogOut className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="pl-64">
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
