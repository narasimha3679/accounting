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
import { ThemeToggle } from './ThemeToggle';
import { cn } from '../lib/utils';

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
        <div className="min-h-screen bg-background text-foreground">
            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={cn(
                "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border shadow-sm transform transition-transform duration-300 ease-in-out lg:translate-x-0",
                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            )}>
                <div className="flex h-full flex-col">
                    {/* Logo */}
                    <div className="flex h-16 items-center justify-between border-b border-border px-6">
                        <h1 className="text-xl font-bold text-primary">
                            Accounting Tool
                        </h1>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-1 px-3 py-6 overflow-y-auto">
                        {navigation.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.href);
                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={cn(
                                        "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-200",
                                        active
                                            ? 'bg-primary text-primary-foreground shadow-sm'
                                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                    )}
                                >
                                    <Icon
                                        className={cn(
                                            "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                                            active
                                                ? 'text-primary-foreground'
                                                : 'text-muted-foreground group-hover:text-accent-foreground'
                                        )}
                                    />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User info and logout */}
                    <div className="border-t border-border p-4 bg-muted/20">
                        <div className="flex items-center justify-between mb-4">
                            <ThemeToggle />
                            <button
                                onClick={logout}
                                className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                                title="Logout"
                            >
                                <LogOut className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center shadow-sm">
                                    <span className="text-sm font-bold text-primary-foreground">
                                        {user?.name?.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            </div>
                            <div className="ml-3 flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
                                <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="lg:pl-64 transition-all duration-300">
                {/* Mobile header */}
                <div className="lg:hidden sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border px-4 py-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        >
                            <Menu className="h-6 w-6" />
                        </button>
                        <h1 className="text-lg font-bold text-foreground">
                            Accounting Tool
                        </h1>
                        <div className="w-10 flex justify-end">
                            <ThemeToggle />
                        </div>
                    </div>
                </div>

                <main className="py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;

