import React from 'react';
import { CalendarCheck, Clock, Users } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';

interface ModeSelectionModalProps {
    onSelect: (mode: 'allotted' | 'submitted') => void;
    isSaving?: boolean;
}

const ModeSelectionModal: React.FC<ModeSelectionModalProps> = ({ onSelect, isSaving = false }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-4xl rounded-lg border border-border bg-card p-6 shadow-lg">
                <div className="mb-6 text-center">
                    <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                        Choose your time management style
                    </h2>
                    <p className="text-muted-foreground mt-2">
                        Pick the workflow that matches how your company tracks time. You can change this anytime in Settings.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <Card className="p-5 border border-border">
                        <div className="flex items-center gap-2 text-foreground">
                            <Clock className="h-5 w-5 text-primary" />
                            <h3 className="text-lg font-semibold">Employees enter time</h3>
                        </div>
                        <p className="text-muted-foreground mt-2">
                            Employees log their hours. Managers review and approve submissions.
                        </p>
                        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                            <li className="flex items-start gap-2">
                                <Users className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                Flexible schedules and self-reporting
                            </li>
                            <li className="flex items-start gap-2">
                                <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                Ideal for project-based or remote teams
                            </li>
                        </ul>
                        <div className="mt-6">
                            <Button
                                type="button"
                                onClick={() => onSelect('submitted')}
                                disabled={isSaving}
                                className="w-full"
                            >
                                {isSaving ? 'Saving...' : 'Use this mode'}
                            </Button>
                        </div>
                    </Card>

                    <Card className="p-5 border border-border">
                        <div className="flex items-center gap-2 text-foreground">
                            <CalendarCheck className="h-5 w-5 text-primary" />
                            <h3 className="text-lg font-semibold">Fixed schedules</h3>
                        </div>
                        <p className="text-muted-foreground mt-2">
                            Managers create schedules. Employees view assigned shifts.
                        </p>
                        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                            <li className="flex items-start gap-2">
                                <CalendarCheck className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                Predictable hours and planned shifts
                            </li>
                            <li className="flex items-start gap-2">
                                <Users className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                Great for shift-based teams
                            </li>
                        </ul>
                        <div className="mt-6">
                            <Button
                                type="button"
                                onClick={() => onSelect('allotted')}
                                disabled={isSaving}
                                className="w-full"
                            >
                                {isSaving ? 'Saving...' : 'Use this mode'}
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default ModeSelectionModal;
