import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Trash2, Mail, User, Info } from 'lucide-react';
import Button from '../ui/Button';
import { cn } from '../../lib/utils';

export interface Shareholder {
    id: string;
    email: string;
    name: string;
    isCurrentUser: boolean;
}

interface ShareholderStepProps {
    shareholders: Shareholder[];
    currentUserEmail: string;
    currentUserName: string;
    onShareholdersChange: (shareholders: Shareholder[]) => void;
}

export const ShareholderStep: React.FC<ShareholderStepProps> = ({
    shareholders,
    currentUserEmail,
    currentUserName,
    onShareholdersChange,
}) => {
    const [newEmail, setNewEmail] = React.useState('');
    const [newName, setNewName] = React.useState('');
    const [emailError, setEmailError] = React.useState('');

    // Ensure current user is always first shareholder
    React.useEffect(() => {
        if (shareholders.length === 0 || !shareholders.find(s => s.isCurrentUser)) {
            onShareholdersChange([
                {
                    id: 'current-user',
                    email: currentUserEmail,
                    name: currentUserName,
                    isCurrentUser: true,
                },
                ...shareholders.filter(s => !s.isCurrentUser),
            ]);
        }
    }, [currentUserEmail, currentUserName, shareholders, onShareholdersChange]);

    const validateEmail = (email: string): boolean => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    };

    const handleAddShareholder = () => {
        setEmailError('');

        if (!newEmail.trim()) {
            setEmailError('Email is required');
            return;
        }

        if (!validateEmail(newEmail)) {
            setEmailError('Please enter a valid email address');
            return;
        }

        if (shareholders.some(s => s.email.toLowerCase() === newEmail.toLowerCase())) {
            setEmailError('This email is already added');
            return;
        }

        const newShareholder: Shareholder = {
            id: `shareholder-${Date.now()}`,
            email: newEmail.trim(),
            name: newName.trim() || newEmail.split('@')[0],
            isCurrentUser: false,
        };

        onShareholdersChange([...shareholders, newShareholder]);
        setNewEmail('');
        setNewName('');
    };

    const handleRemoveShareholder = (id: string) => {
        onShareholdersChange(shareholders.filter(s => s.id !== id));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddShareholder();
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-2 pb-2 border-b border-border">
                <Users className="h-5 w-5 text-neon-emerald" />
                <h2 className="heading-3">Shareholders & Co-Owners</h2>
            </div>

            {/* Info banner */}
            <div className="flex items-start gap-3 p-4 rounded-lg bg-neon-emerald/10 border border-neon-emerald/20">
                <Info className="h-5 w-5 text-neon-emerald flex-shrink-0 mt-0.5" />
                <div className="text-sm text-foreground">
                    <p className="font-medium mb-1">Add your business partners</p>
                    <p className="text-muted-foreground">
                        Shareholders will receive an email invitation to join the company.
                        They'll need to verify their email before accessing shared data.
                        You can skip this step and add shareholders later from Settings.
                    </p>
                </div>
            </div>

            {/* Current shareholders list */}
            <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                    {shareholders.map((shareholder) => (
                        <motion.div
                            key={shareholder.id}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                            className={cn(
                                "flex items-center justify-between p-4 rounded-lg border",
                                shareholder.isCurrentUser
                                    ? "bg-neon-emerald/5 border-neon-emerald/30"
                                    : "bg-card border-border hover:border-neon-emerald/30 transition-colors"
                            )}
                        >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className={cn(
                                    "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0",
                                    shareholder.isCurrentUser
                                        ? "bg-neon-emerald/20 text-neon-emerald"
                                        : "bg-muted text-muted-foreground"
                                )}>
                                    <User className="h-5 w-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-foreground truncate">
                                            {shareholder.name}
                                        </span>
                                        {shareholder.isCurrentUser && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-neon-emerald/20 text-neon-emerald font-medium">
                                                You
                                            </span>
                                        )}
                                        {!shareholder.isCurrentUser && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-medium">
                                                Pending Invite
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                        <Mail className="h-3 w-3" />
                                        <span className="truncate">{shareholder.email}</span>
                                    </div>
                                </div>
                            </div>

                            {!shareholder.isCurrentUser && (
                                <button
                                    type="button"
                                    onClick={() => handleRemoveShareholder(shareholder.id)}
                                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                    title="Remove shareholder"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Add new shareholder form */}
            <div className="space-y-4 p-4 rounded-lg border border-dashed border-border bg-muted/30">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add another shareholder
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label htmlFor="shareholder_email" className="block text-sm font-medium text-muted-foreground">
                            Email address
                        </label>
                        <input
                            id="shareholder_email"
                            type="email"
                            value={newEmail}
                            onChange={(e) => {
                                setNewEmail(e.target.value);
                                setEmailError('');
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder="partner@company.com"
                            className={cn(
                                "input",
                                emailError && "border-destructive focus-visible:ring-destructive"
                            )}
                        />
                        {emailError && (
                            <p className="text-sm text-destructive">{emailError}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="shareholder_name" className="block text-sm font-medium text-muted-foreground">
                            Name <span className="text-xs">(optional)</span>
                        </label>
                        <input
                            id="shareholder_name"
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="John Smith"
                            className="input"
                        />
                    </div>
                </div>

                <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddShareholder}
                    icon={Plus}
                    className="w-full sm:w-auto"
                >
                    Add Shareholder
                </Button>
            </div>

            {/* Skip hint */}
            <p className="text-xs text-muted-foreground text-center">
                You can always add or remove shareholders later from the Settings page.
            </p>
        </div>
    );
};
