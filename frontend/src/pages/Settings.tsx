import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api, { type Company } from '../lib/api';
import { Save, Building2, Percent, Calendar, Bell, BellOff, CheckCircle, XCircle, AlertCircle, Download, Smartphone } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import HelpIcon from '../components/ui/HelpIcon';
import { getCurrentFiscalYear, formatFiscalYearPeriod } from '../lib/fiscalYear';
import {
    isPushSupported,
    getSubscriptionStatus,
    subscribeToPush,
    unsubscribeFromPush,
    type PushSubscriptionStatus,
} from '../lib/pushNotifications';
import { isInstallable, isInstalled, showInstallPrompt } from '../lib/pwa';

const Settings: React.FC = () => {
    const { user, refreshUser } = useAuth();
    const navigate = useNavigate();
    const [company, setCompany] = useState<Company | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    
    // Push notification state
    const [pushStatus, setPushStatus] = useState<PushSubscriptionStatus>('not-subscribed');
    const [pushEnabled, setPushEnabled] = useState(false);
    const [isLoadingPush, setIsLoadingPush] = useState(false);
    const [pushError, setPushError] = useState('');
    const [pushSuccess, setPushSuccess] = useState('');
    
    // PWA install state
    const [isPWAInstallable, setIsPWAInstallable] = useState(false);
    const [isPWAInstalled, setIsPWAInstalled] = useState(false);
    const [isInstalling, setIsInstalling] = useState(false);

    useEffect(() => {
        if (!user) {
            // Not authenticated – stop loading to avoid infinite spinner
            setIsLoading(false);
            return;
        }

        if (!user.company_id) {
            // Authenticated but no company configured – stop loading and show message
            setIsLoading(false);
            return;
        }

        // Don't reload if we're currently updating to avoid overwriting the update
        if (!isUpdating) {
            loadCompanyData();
        }
        
        // Load push notification status
        loadPushStatus();
        
        // Check PWA install status
        checkPWAStatus();
        const interval = setInterval(checkPWAStatus, 2000); // Check every 2 seconds
        
        return () => clearInterval(interval);
    }, [user, isUpdating]);

    const loadCompanyData = async () => {
        if (!user?.company_id) {
            return;
        }

        try {
            const companyData = await api.getCompany(user.company_id);
            setCompany(companyData);
        } catch (error) {
            console.error('Error loading company data:', error);
            setError('Failed to load company settings');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!company) return;

        setIsSaving(true);
        setIsUpdating(true);
        setError('');
        setSuccess('');

        try {
            const updatedCompany = await api.updateCompany(company.id, {
                name: company.name,
                business_number: company.business_number,
                hst_number: company.hst_number,
                hst_registered: company.hst_registered,
                fiscal_year_end: company.fiscal_year_end,
                hst_filing_frequency: company.hst_filing_frequency || 'annual',
                hst_filing_period_start: company.hst_filing_period_start,
                small_business_rate: company.small_business_rate,
                hst_rate: company.hst_rate,
            });

            // Use the updated company data directly - this ensures we have the correct value
            setCompany(updatedCompany);
            setSuccess('Settings saved successfully!');
            
            // Refresh user context to update company data throughout the app
            // Do this after setting local state to avoid race conditions
            refreshUser().catch(err => {
                console.error('Error refreshing user:', err);
            }).finally(() => {
                setIsUpdating(false);
            });
        } catch (error: any) {
            console.error('Error saving settings:', error);
            const errorMessage = error?.message || 'Couldn\'t save. Please check your information and try again.';
            setError(errorMessage);
            setIsUpdating(false);
        } finally {
            setIsSaving(false);
        }
    };

    const handleInputChange = (field: keyof Company, value: string | number | boolean) => {
        if (!company) return;

        setCompany({
            ...company,
            [field]: value,
        });
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toISOString().split('T')[0];
    };

    const loadPushStatus = async () => {
        if (!user) return;
        
        try {
            const status = await getSubscriptionStatus();
            setPushStatus(status);
            
            if (status === 'subscribed') {
                const subscriptionStatus = await api.getPushSubscriptionStatus();
                setPushEnabled(subscriptionStatus.enabled);
            }
        } catch (error) {
            console.error('Error loading push status:', error);
        }
    };

    const handleSubscribe = async () => {
        setIsLoadingPush(true);
        setPushError('');
        setPushSuccess('');

        try {
            if (!isPushSupported()) {
                throw new Error('Push notifications are not supported in this browser');
            }

            await subscribeToPush();
            
            // Wait a moment for the database to sync
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Check database status directly
            const subscriptionStatus = await api.getPushSubscriptionStatus();
            if (subscriptionStatus.subscribed) {
                setPushStatus('subscribed');
                setPushEnabled(subscriptionStatus.enabled);
            } else {
                // If database check fails, try the full status check
                await loadPushStatus();
            }
            
            setPushSuccess('Successfully subscribed to push notifications!');
        } catch (error: any) {
            console.error('Error subscribing to push:', error);
            setPushError(error?.message || 'Failed to subscribe to push notifications');
        } finally {
            setIsLoadingPush(false);
        }
    };

    const handleUnsubscribe = async () => {
        setIsLoadingPush(true);
        setPushError('');
        setPushSuccess('');

        try {
            await unsubscribeFromPush();
            await loadPushStatus();
            setPushSuccess('Successfully unsubscribed from push notifications');
        } catch (error: any) {
            console.error('Error unsubscribing from push:', error);
            setPushError(error?.message || 'Failed to unsubscribe from push notifications');
        } finally {
            setIsLoadingPush(false);
        }
    };

    const handleToggleEnabled = async (enabled: boolean) => {
        setIsLoadingPush(true);
        setPushError('');
        setPushSuccess('');

        try {
            await api.togglePushNotifications(enabled);
            setPushEnabled(enabled);
            setPushSuccess(enabled ? 'Notifications enabled' : 'Notifications disabled');
        } catch (error: any) {
            console.error('Error toggling notifications:', error);
            setPushError(error?.message || 'Failed to update notification settings');
        } finally {
            setIsLoadingPush(false);
        }
    };

    const handleTestNotification = async () => {
        setIsLoadingPush(true);
        setPushError('');
        setPushSuccess('');

        try {
            await api.triggerTestNotification();
            setPushSuccess('Test notification sent! Check your notifications.');
        } catch (error: any) {
            console.error('Error sending test notification:', error);
            setPushError(error?.message || 'Failed to send test notification');
        } finally {
            setIsLoadingPush(false);
        }
    };

    const checkPWAStatus = () => {
        setIsPWAInstallable(isInstallable());
        setIsPWAInstalled(isInstalled());
    };

    const handleInstall = async () => {
        setIsInstalling(true);
        try {
            const accepted = await showInstallPrompt();
            if (accepted) {
                setSuccess('App installed successfully!');
            }
        } catch (error: any) {
            console.error('Error installing app:', error);
            setError('Failed to install app. Please try again.');
        } finally {
            setIsInstalling(false);
            checkPWAStatus();
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-emerald"></div>
            </div>
        );
    }

    if (!user?.company_id) {
        return (
            <div className="p-6 space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Settings</h1>
                    <p className="text-slate-muted mt-2">
                        You don&apos;t have a company set up yet. You&apos;ll need to create one before you can manage
                        settings.
                    </p>
                </div>
                <Card className="p-4 border-dashed border-neon-emerald bg-primary/5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-white">Create your company</h2>
                            <p className="text-sm text-slate-muted">
                                Set up your corporation details once, and we&apos;ll use them across invoices, reports, and taxes.
                            </p>
                        </div>
                        <Button
                            type="button"
                            onClick={() => navigate('/onboarding/company')}
                            className="w-full sm:w-auto"
                        >
                            Go to company setup
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    if (!company) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold text-white">Settings</h1>
                <p className="text-destructive">Failed to load company settings</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white">Settings</h1>
                <p className="text-slate-muted mt-2">Manage your company settings and tax preferences</p>
            </div>

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

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Company Information */}
                <Card className="p-6">
                    <div className="flex items-center mb-4">
                        <Building2 className="h-5 w-5 text-slate-muted mr-2" />
                        <h2 className="text-lg font-medium text-white">Company Information</h2>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-white mb-2">
                                Company Name
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={company.name}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="business_number" className="block text-sm font-medium text-white mb-2">
                                Business Number
                            </label>
                            <input
                                type="text"
                                id="business_number"
                                value={company.business_number}
                                onChange={(e) => handleInputChange('business_number', e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="hst_number" className="block text-sm font-medium text-white mb-2">
                                HST Number (Optional)
                            </label>
                            <input
                                type="text"
                                id="hst_number"
                                value={company.hst_number || ''}
                                onChange={(e) => handleInputChange('hst_number', e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>

                        <div>
                            <label htmlFor="fiscal_year_end" className="block text-sm font-medium text-white mb-2">
                                Fiscal Year End
                                <span className="text-xs text-slate-muted ml-2">(The last day of your company's financial year)</span>
                            </label>
                            <input
                                type="date"
                                id="fiscal_year_end"
                                value={formatDate(company.fiscal_year_end)}
                                onChange={(e) => handleInputChange('fiscal_year_end', e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                required
                            />
                            {company.fiscal_year_end && (
                                <div className="mt-2 p-3 rounded-lg bg-muted/30 border border-border">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-muted-foreground">Current Fiscal Year:</span>
                                        <span className="font-medium text-foreground">
                                            {formatFiscalYearPeriod(getCurrentFiscalYear(company.fiscal_year_end), company.fiscal_year_end)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Tax Settings */}
                <Card className="p-6">
                    <div className="flex items-center mb-4">
                        <Percent className="h-5 w-5 text-slate-muted mr-2" />
                        <h2 className="text-lg font-medium text-white">Tax Settings</h2>
                    </div>

                    <div className="space-y-4">
                        {/* HST Registration Toggle */}
                        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-medium text-white">HST Registration</h3>
                                    <HelpIcon
                                        content="Are you registered for HST/GST? If yes, you can claim Input Tax Credits (ITCs) for HST paid on business expenses, which reduces the HST you owe to the government."
                                        size="sm"
                                    />
                                </div>
                                <p className="text-sm text-slate-muted">
                                    Enable if your business is HST/GST registered and can claim Input Tax Credits
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={company.hst_registered}
                                    onChange={(e) => handleInputChange('hst_registered', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-input peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ring/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-input after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                        </div>

                        {/* HST Filing Frequency */}
                        {company.hst_registered && (
                            <div>
                                <label htmlFor="hst_filing_frequency" className="block text-sm font-medium text-white mb-2">
                                    HST Filing Frequency
                                    <HelpIcon
                                        content="How often do you file HST returns? Monthly, quarterly, or annually. This affects how HST periods are calculated and displayed in reports."
                                        size="sm"
                                    />
                                </label>
                                <select
                                    id="hst_filing_frequency"
                                    value={company.hst_filing_frequency || 'annual'}
                                    onChange={(e) => handleInputChange('hst_filing_frequency', e.target.value as 'monthly' | 'quarterly' | 'annual')}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="monthly">Monthly</option>
                                    <option value="quarterly">Quarterly</option>
                                    <option value="annual">Annual</option>
                                </select>
                                <p className="mt-1 text-sm text-slate-muted">
                                    Select how often you file HST returns with CRA
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="small_business_rate" className="block text-sm font-medium text-white mb-2">
                                    Small Business Tax Rate (%)
                                </label>
                                <div className="relative rounded-md shadow-sm">
                                    <input
                                        type="number"
                                        id="small_business_rate"
                                        step="0.1"
                                        min="0"
                                        max="100"
                                        value={company.small_business_rate * 100}
                                        onChange={(e) => handleInputChange('small_business_rate', parseFloat(e.target.value) / 100)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        required
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                        <span className="text-slate-muted text-sm">%</span>
                                    </div>
                                </div>
                                <p className="mt-1 text-sm text-slate-muted">
                                    Ontario small business tax rate (default: 12.5%)
                                </p>
                            </div>

                            <div>
                                <label htmlFor="hst_rate" className="block text-sm font-medium text-white mb-2">
                                    HST Rate (%)
                                </label>
                                <div className="relative rounded-md shadow-sm">
                                    <input
                                        type="number"
                                        id="hst_rate"
                                        step="0.1"
                                        min="0"
                                        max="100"
                                        value={company.hst_rate * 100}
                                        onChange={(e) => handleInputChange('hst_rate', parseFloat(e.target.value) / 100)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        required
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                        <span className="text-slate-muted text-sm">%</span>
                                    </div>
                                </div>
                                <p className="mt-1 text-sm text-slate-muted">
                                    Ontario HST rate (default: 13%)
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Push Notifications */}
                <Card className="p-6">
                    <div className="flex items-center mb-4">
                        <Bell className="h-5 w-5 text-slate-muted mr-2" />
                        <h2 className="text-lg font-medium text-white">Push Notifications</h2>
                        <HelpIcon
                            content="Receive push notifications for important events like timesheet approvals. Notifications work even when the app is closed."
                            size="sm"
                        />
                    </div>

                    {pushError && (
                        <div className="mb-4 p-3 rounded-lg bg-red-900/20 border border-red-800 text-sm text-red-300">
                            {pushError}
                        </div>
                    )}

                    {pushSuccess && (
                        <div className="mb-4 p-3 rounded-lg bg-green-900/20 border border-green-800 text-sm text-green-300">
                            {pushSuccess}
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* Status indicator */}
                        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                            <div className="flex items-center gap-2">
                                {pushStatus === 'subscribed' && (
                                    <>
                                        <CheckCircle className="h-5 w-5 text-green-500" />
                                        <span className="text-sm font-medium text-white">Subscribed</span>
                                    </>
                                )}
                                {pushStatus === 'not-subscribed' && (
                                    <>
                                        <XCircle className="h-5 w-5 text-slate-muted" />
                                        <span className="text-sm font-medium text-white">Not Subscribed</span>
                                    </>
                                )}
                                {pushStatus === 'not-supported' && (
                                    <>
                                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                                        <span className="text-sm font-medium text-white">Not Supported</span>
                                    </>
                                )}
                                {pushStatus === 'denied' && (
                                    <>
                                        <XCircle className="h-5 w-5 text-red-500" />
                                        <span className="text-sm font-medium text-white">Permission Denied</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Enable/Disable toggle (only show if subscribed) */}
                        {pushStatus === 'subscribed' && (
                            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                                <div>
                                    <h3 className="text-sm font-medium text-white">Enable Notifications</h3>
                                    <p className="text-sm text-slate-muted">
                                        Turn notifications on or off without unsubscribing
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={pushEnabled}
                                        onChange={(e) => handleToggleEnabled(e.target.checked)}
                                        disabled={isLoadingPush}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-input peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ring/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-input after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                </label>
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex flex-col sm:flex-row gap-2">
                            {pushStatus === 'not-subscribed' && (
                                <Button
                                    type="button"
                                    onClick={handleSubscribe}
                                    disabled={isLoadingPush || !isPushSupported()}
                                    icon={Bell}
                                    className="w-full sm:w-auto"
                                >
                                    {isLoadingPush ? 'Subscribing...' : 'Subscribe to Notifications'}
                                </Button>
                            )}

                            {pushStatus === 'subscribed' && (
                                <>
                                    <Button
                                        type="button"
                                        onClick={handleUnsubscribe}
                                        disabled={isLoadingPush}
                                        icon={BellOff}
                                        variant="outline"
                                        className="w-full sm:w-auto"
                                    >
                                        {isLoadingPush ? 'Unsubscribing...' : 'Unsubscribe'}
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={handleTestNotification}
                                        disabled={isLoadingPush || !pushEnabled}
                                        variant="outline"
                                        className="w-full sm:w-auto"
                                    >
                                        {isLoadingPush ? 'Sending...' : 'Send Test Notification'}
                                    </Button>
                                </>
                            )}

                            {pushStatus === 'denied' && (
                                <p className="text-sm text-slate-muted">
                                    Notification permission was denied. Please enable it in your browser settings.
                                </p>
                            )}

                            {pushStatus === 'not-supported' && (
                                <p className="text-sm text-slate-muted">
                                    Push notifications are not supported in this browser.
                                </p>
                            )}
                        </div>
                    </div>
                </Card>

                {/* PWA Install */}
                {!isPWAInstalled && (
                    <Card className="p-6">
                        <div className="flex items-center mb-4">
                            <Smartphone className="h-5 w-5 text-slate-muted mr-2" />
                            <h2 className="text-lg font-medium text-white">Install App</h2>
                            <HelpIcon
                                content="Install this app on your device for quick access. The app works offline and can be launched from your home screen."
                                size="sm"
                            />
                        </div>

                        <div className="space-y-4">
                            {/* Status indicator */}
                            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                                <div className="flex items-center gap-2">
                                    {isPWAInstallable ? (
                                        <>
                                            <CheckCircle className="h-5 w-5 text-green-500" />
                                            <span className="text-sm font-medium text-white">Ready to Install</span>
                                        </>
                                    ) : (
                                        <>
                                            <AlertCircle className="h-5 w-5 text-yellow-500" />
                                            <span className="text-sm font-medium text-white">Install Not Available</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {isPWAInstallable && (
                                <Button
                                    type="button"
                                    onClick={handleInstall}
                                    disabled={isInstalling}
                                    icon={Download}
                                    className="w-full sm:w-auto"
                                >
                                    {isInstalling ? 'Installing...' : 'Install App'}
                                </Button>
                            )}

                            {!isPWAInstallable && (
                                <p className="text-sm text-slate-muted">
                                    The install option will appear when your browser detects the app is installable. Make sure you&apos;re using a supported browser (Chrome, Edge, Safari) and the app meets installation requirements.
                                </p>
                            )}
                        </div>
                    </Card>
                )}

                {/* Save Button */}
                <div className="flex justify-end">
                    <Button
                        type="submit"
                        disabled={isSaving}
                        icon={Save}
                    >
                        {isSaving ? 'Saving...' : 'Save Settings'}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default Settings;
