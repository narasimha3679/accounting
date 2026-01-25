import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api, { type Company } from '../../lib/api';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

const TimeSettings: React.FC = () => {
    const { user, refreshUser } = useAuth();
    const [company, setCompany] = useState<Company | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [initialTimeEntryMode, setInitialTimeEntryMode] = useState<'allotted' | 'submitted' | null>(null);

    useEffect(() => {
        loadCompanyData();
    }, [user]);

    const loadCompanyData = async () => {
        if (!user?.company_id) return;
        try {
            const companyData = await api.getCompany(user.company_id);
            setCompany(companyData);
            setInitialTimeEntryMode(companyData.time_entry_mode ?? null);
        } catch (error) {
            console.error('Error loading company data:', error);
            setError('Failed to load settings');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (field: keyof Company, value: any) => {
        if (!company) return;
        setCompany({ ...company, [field]: value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!company) return;

        setIsSaving(true);
        setError('');
        setSuccess('');

        try {
            const updatedCompany = await api.updateCompany(company.id, {
                time_entry_mode: company.time_entry_mode ?? null,
            });

            setCompany(updatedCompany);
            setInitialTimeEntryMode(updatedCompany.time_entry_mode ?? null);
            setSuccess('Time settings saved successfully!');
            await refreshUser();
        } catch (error: any) {
            console.error('Error saving time settings:', error);
            setError(error?.message || 'Failed to save settings.');
        } finally {
            setIsSaving(false);
        }
    };

    const hasTimeModeChanged = !!company
        && initialTimeEntryMode !== null
        && company.time_entry_mode !== initialTimeEntryMode;

    if (isLoading) return <div>Loading...</div>;
    if (!company) return <div>Failed to load company data.</div>;

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <Card className="p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                    <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
                </Card>
            )}

            {success && (
                <Card className="p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                    <div className="text-sm text-green-700 dark:text-green-300">{success}</div>
                </Card>
            )}

            <Card className="p-6">
                <div className="flex items-center mb-4">
                    <Clock className="h-5 w-5 text-muted-foreground mr-2" />
                    <h2 className="text-lg font-medium text-foreground">Time Management</h2>
                </div>
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Choose the workflow your company uses for time tracking. Employees will see the matching experience.
                    </p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <label className={`flex items-start gap-3 rounded-lg border p-4 transition-colors ${company.time_entry_mode === 'submitted' ? 'border-primary bg-muted/40' : 'border-border'}`}>
                            <input
                                type="radio"
                                name="time_entry_mode"
                                value="submitted"
                                checked={company.time_entry_mode === 'submitted'}
                                onChange={() => handleInputChange('time_entry_mode', 'submitted')}
                                className="mt-1"
                            />
                            <div>
                                <div className="text-sm font-medium text-foreground">Employees enter time</div>
                                <p className="text-sm text-muted-foreground">
                                    Employees log hours and managers approve submissions.
                                </p>
                            </div>
                        </label>
                        <label className={`flex items-start gap-3 rounded-lg border p-4 transition-colors ${company.time_entry_mode === 'allotted' ? 'border-primary bg-muted/40' : 'border-border'}`}>
                            <input
                                type="radio"
                                name="time_entry_mode"
                                value="allotted"
                                checked={company.time_entry_mode === 'allotted'}
                                onChange={() => handleInputChange('time_entry_mode', 'allotted')}
                                className="mt-1"
                            />
                            <div>
                                <div className="text-sm font-medium text-foreground">Fixed schedules</div>
                                <p className="text-sm text-muted-foreground">
                                    Managers build schedules and employees view assigned shifts.
                                </p>
                            </div>
                        </label>
                    </div>
                    {!company.time_entry_mode && (
                        <p className="text-sm text-muted-foreground">
                            No mode selected yet. Choose one and save to enable time management.
                        </p>
                    )}
                    {hasTimeModeChanged && (
                        <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                            Changing the time management mode affects what employees and managers can access. Consider saving
                            outside of peak scheduling periods.
                        </div>
                    )}
                </div>
            </Card>

            <div className="flex justify-end">
                <Button type="submit" disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>
        </form>
    );
};

export default TimeSettings;
