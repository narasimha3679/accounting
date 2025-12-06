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
    CreditCard,
    Briefcase,
    PieChart
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
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
        { name: 'Investments', href: '/investments', icon: PieChart },
        { name: 'Dividends', href: '/dividends', icon: Banknote },
        { name: 'Salary', href: '/salary', icon: Briefcase },
        { name: 'Owner Reimbursement', href: '/owner-payments', icon: CreditCard },
        { name: 'Clients', href: '/clients', icon: Users },
        { name: 'Reports', href: '/reports', icon: TrendingUp },
        { name: 'Tax Calculator', href: '/tax-calculator', icon: Calculator },
        { name: 'Settings', href: '/settings', icon: Settings },
    ];

    const isActive = (href: string) => {
        return location.pathname === href;
    };

    return (
        <div className="min-h-screen bg-deep-forest text-white">
            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-deep-forest/80 backdrop-blur-sm lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={cn(
                "fixed inset-y-0 left-0 z-50 w-64 glass-heavy border-r border-white/10 transform transition-transform duration-300 ease-in-out lg:translate-x-0",
                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            )}>
                <div className="flex h-full flex-col">
                    {/* Logo */}
                    <div className="flex h-16 items-center justify-between border-b border-white/10 px-6">
                        <h1 className="text-xl font-bold bg-gradient-to-r from-neon-emerald to-golden-hour bg-clip-text text-transparent">
                            Accounting Tool
                        </h1>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden p-2 rounded-md text-slate-muted hover:text-white hover:bg-white/10 transition-colors"
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
                                        "group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                                        active
                                            ? 'bg-neon-emerald/20 text-neon-emerald border border-neon-emerald/30 glow-emerald'
                                            : 'text-slate-muted hover:bg-white/10 hover:text-white'
                                    )}
                                >
                                    <Icon
                                        className={cn(
                                            "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                                            active
                                                ? 'text-neon-emerald'
                                                : 'text-slate-muted group-hover:text-white'
                                        )}
                                    />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User info and logout */}
                    <div className="border-t border-white/10 p-4 bg-black/20">
                        <div className="flex items-center justify-end mb-4">
                            <button
                                onClick={logout}
                                className="p-2 rounded-md text-slate-muted hover:text-white hover:bg-white/10 transition-colors"
                                title="Logout"
                            >
                                <LogOut className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-neon-emerald to-golden-hour flex items-center justify-center shadow-sm">
                                    <span className="text-sm font-bold text-deep-forest">
                                        {user?.name?.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            </div>
                            <div className="ml-3 flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                                <p className="text-xs text-slate-muted capitalize">{user?.role}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="lg:pl-64 transition-all duration-300">
                {/* Mobile header */}
                <div className="lg:hidden sticky top-0 z-30 glass-heavy border-b border-white/10 px-4 py-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 rounded-md text-slate-muted hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <Menu className="h-6 w-6" />
                        </button>
                        <h1 className="text-lg font-bold bg-gradient-to-r from-neon-emerald to-golden-hour bg-clip-text text-transparent">
                            Accounting Tool
                        </h1>
                        <div className="w-10"></div>
                    </div>
                </div>

                <main className="py-8">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;

