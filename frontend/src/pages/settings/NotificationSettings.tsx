import React, { useState, useEffect } from 'react';
import { Bell, BellOff, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import HelpIcon from '../../components/ui/HelpIcon';
import {
    isPushSupported,
    getSubscriptionStatus,
    subscribeToPush,
    unsubscribeFromPush,
    type PushSubscriptionStatus,
} from '../../lib/pushNotifications';

const NotificationSettings: React.FC = () => {
    const { user } = useAuth();

    // Push notification state
    const [pushStatus, setPushStatus] = useState<PushSubscriptionStatus>('not-subscribed');
    const [pushEnabled, setPushEnabled] = useState(false);
    const [isLoadingPush, setIsLoadingPush] = useState(false);
    const [pushError, setPushError] = useState('');
    const [pushSuccess, setPushSuccess] = useState('');

    useEffect(() => {
        if (user) {
            loadPushStatus();
        }
    }, [user]);

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

    return (
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
    );
};

export default NotificationSettings;
