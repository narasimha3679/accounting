import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Mail, User } from 'lucide-react';
import Button from './ui/Button';
import { cn } from '../lib/utils';

interface InviteMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    onInvite: (data: { email: string; name: string; role: 'owner' | 'manager' | 'accountant' | 'viewer'; permissions?: any }) => Promise<void>;
}

const roleOptions = [
    { value: 'owner', label: 'Owner', description: 'Full access to manage the company' },
    { value: 'manager', label: 'Manager', description: 'Limited access based on permissions' },
    { value: 'accountant', label: 'Accountant', description: 'Access to financial data' },
    { value: 'viewer', label: 'Viewer', description: 'Read-only access' },
];

const InviteMemberModal: React.FC<InviteMemberModalProps> = ({ isOpen, onClose, onInvite }) => {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState<'owner' | 'manager' | 'accountant' | 'viewer'>('viewer');
    const [permissions, setPermissions] = useState<any>({});
    const [emailError, setEmailError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const validateEmail = (email: string): boolean => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setEmailError('');

        if (!email.trim()) {
            setEmailError('Email is required');
            return;
        }

        if (!validateEmail(email)) {
            setEmailError('Please enter a valid email address');
            return;
        }

        setIsSubmitting(true);
        try {
            await onInvite({
                email: email.trim(),
                name: name.trim() || email.split('@')[0],
                role,
                permissions: role === 'manager' ? permissions : undefined,
            });
            // Reset form
            setEmail('');
            setName('');
            setRole('viewer');
            setPermissions({});
        } catch (error: any) {
            setEmailError(error.message || 'Failed to send invitation');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative z-10 w-full max-w-md bg-card border border-border rounded-lg shadow-xl"
                >
                    <div className="p-6">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-neon-emerald/20 flex items-center justify-center">
                                    <UserPlus className="h-5 w-5 text-neon-emerald" />
                                </div>
                                <h2 className="text-2xl font-semibold text-foreground">Invite Member</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Email */}
                            <div>
                                <label htmlFor="invite-email" className="block text-sm font-medium text-foreground mb-2">
                                    Email address <span className="text-destructive">*</span>
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <input
                                        id="invite-email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value);
                                            setEmailError('');
                                        }}
                                        placeholder="colleague@company.com"
                                        className={cn(
                                            "input pl-10",
                                            emailError && "border-destructive focus-visible:ring-destructive"
                                        )}
                                        required
                                    />
                                </div>
                                {emailError && (
                                    <p className="text-sm text-destructive mt-1">{emailError}</p>
                                )}
                            </div>

                            {/* Name */}
                            <div>
                                <label htmlFor="invite-name" className="block text-sm font-medium text-foreground mb-2">
                                    Name <span className="text-xs text-muted-foreground">(optional)</span>
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <input
                                        id="invite-name"
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="John Smith"
                                        className="input pl-10"
                                    />
                                </div>
                            </div>

                            {/* Role */}
                            <div>
                                <label htmlFor="invite-role" className="block text-sm font-medium text-foreground mb-2">
                                    Role <span className="text-destructive">*</span>
                                </label>
                                <select
                                    id="invite-role"
                                    value={role}
                                    onChange={(e) => setRole(e.target.value as any)}
                                    className="input"
                                    required
                                >
                                    {roleOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label} - {option.description}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={onClose}
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    icon={UserPlus}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Sending...' : 'Send Invitation'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default InviteMemberModal;
