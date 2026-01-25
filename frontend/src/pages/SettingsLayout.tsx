import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
    Building2,
    Percent,
    Clock,
    Bell,
    Settings as SettingsIcon,
    CreditCard,
    Heart
} from 'lucide-react';
import Card from '../components/ui/Card';

const SettingsLayout: React.FC = () => {
    const location = useLocation();

    const navigation = [
        { name: 'General', href: '/settings/general', icon: Building2 },
        { name: 'Tax', href: '/settings/tax', icon: Percent },
        { name: 'Features', href: '/settings/features', icon: SettingsIcon },
        { name: 'Time Management', href: '/settings/time', icon: Clock },
        { name: 'Payroll', href: '/settings/payroll', icon: CreditCard },
        { name: 'Benefits', href: '/settings/benefits', icon: Heart },
        { name: 'Notifications', href: '/settings/notifications', icon: Bell },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white">Settings</h1>
                <p className="text-slate-muted mt-2">Manage your company settings and preferences</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Sidebar Navigation */}
                <Card className="lg:w-64 flex-shrink-0 p-2 h-fit">
                    <nav className="space-y-1">
                        {navigation.map((item) => {
                            const isActive = location.pathname === item.href ||
                                (item.href === '/settings/general' && location.pathname === '/settings');

                            return (
                                <NavLink
                                    key={item.name}
                                    to={item.href}
                                    className={({ isActive }) =>
                                        `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-slate-muted hover:bg-muted/50 hover:text-white'
                                        }`
                                    }
                                >
                                    <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-primary' : 'text-slate-muted group-hover:text-white'
                                        }`} />
                                    {item.name}
                                </NavLink>
                            );
                        })}
                    </nav>
                </Card>

                {/* Content Area */}
                <div className="flex-1 min-w-0">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default SettingsLayout;
