import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
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
    const [registeredDevices, setRegisteredDevices] = useState<any[]>([]);

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

            // Fetch registered devices
            const devices = await api.getPushSubscriptions();
            setRegisteredDevices(devices);

            // Check if ANY device is enabled (for the toggle)
            // Ideally this should be per-device, but for now global toggle affects 'enabled' flag in DB
            // which we set to true on subscribe.
            const hasEnabledDevice = devices.some(d => d.enabled);
            setPushEnabled(hasEnabledDevice);

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

            await loadPushStatus();
            setPushSuccess('Successfully subscribed this device!');
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
            setPushSuccess('Successfully unsubscribed this device');
        } catch (error: any) {
            console.error('Error unsubscribing from push:', error);
            setPushError(error?.message || 'Failed to unsubscribe from push notifications');
        } finally {
            setIsLoadingPush(false);
        }
    };

    const handleDeleteDevice = async (id: string) => {
        if (!confirm('Are you sure you want to remove this device?')) return;

        setIsLoadingPush(true);
        try {
            await api.deletePushSubscription(id);
            await loadPushStatus();
            setPushSuccess('Device removed successfully');
        } catch (error: any) {
            console.error('Error removing device:', error);
            setPushError(error?.message || 'Failed to remove device');
        } finally {
            setIsLoadingPush(false);
        }
    }

    const handleToggleEnabled = async (enabled: boolean) => {
        setIsLoadingPush(true);
        setPushError('');
        setPushSuccess('');

        try {
            await api.togglePushNotifications(enabled);
            setPushEnabled(enabled);
            // Refresh list to show updated status
            const devices = await api.getPushSubscriptions();
            setRegisteredDevices(devices);

            setPushSuccess(enabled ? 'Notifications enabled for all devices' : 'Notifications disabled for all devices');
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
            setPushSuccess('Test notification sent! Check your devices.');
        } catch (error: any) {
            console.error('Error sending test notification:', error);
            setPushError(error?.message || 'Failed to send test notification');
        } finally {
            setIsLoadingPush(false);
        }
    };

    // Format relative time
    const formatTimeAgo = (dateString: string) => {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        return date.toLocaleDateString();
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

            <div className="space-y-6">
                {/* Status indicator */}
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                        {pushStatus === 'subscribed' && (
                            <>
                                <CheckCircle className="h-5 w-5 text-green-500" />
                                <span className="text-sm font-medium text-white">This Device is Subscribed</span>
                            </>
                        )}
                        {pushStatus === 'not-subscribed' && (
                            <>
                                <Bell className="h-5 w-5 text-slate-muted" />
                                <span className="text-sm font-medium text-white">This Device is Not Subscribed</span>
                            </>
                        )}
                        {pushStatus === 'not-supported' && (
                            <>
                                <AlertCircle className="h-5 w-5 text-yellow-500" />
                                <span className="text-sm font-medium text-white">Not Supported on this Device</span>
                            </>
                        )}
                        {pushStatus === 'denied' && (
                            <>
                                <XCircle className="h-5 w-5 text-red-500" />
                                <span className="text-sm font-medium text-white">Permission Denied</span>
                            </>
                        )}
                    </div>

                    {pushStatus === 'not-subscribed' && isPushSupported() && (
                        <Button
                            type="button"
                            onClick={handleSubscribe}
                            disabled={isLoadingPush}
                            size="sm"
                        >
                            Subscribe
                        </Button>
                    )}

                    {pushStatus === 'subscribed' && (
                        <Button
                            type="button"
                            onClick={handleUnsubscribe}
                            disabled={isLoadingPush}
                            variant="outline"
                            size="sm"
                        >
                            Unsubscribe
                        </Button>
                    )}
                </div>

                {/* Registered Devices List */}
                {registeredDevices.length > 0 && (
                    <div>
                        <h3 className="text-base font-medium text-white mb-3">Registered Devices</h3>
                        <div className="space-y-2">
                            {registeredDevices.map((device) => (
                                <div key={device.id} className="flex items-center justify-between p-3 bg-muted/20 rounded border border-border/50">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-foreground">{device.device_name || 'Unknown Device'}</span>
                                            {device.enabled ?
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-300 border border-green-500/30">Active</span> :
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-500/20 text-slate-300 border border-slate-500/30">Disabled</span>
                                            }
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            Last active: {formatTimeAgo(device.last_used_at || device.created_at)}
                                        </span>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteDevice(device.id)}
                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                    >
                                        <XCircle className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Enable/Disable Global Toggle */}
                {registeredDevices.length > 0 && (
                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                        <div>
                            <h3 className="text-sm font-medium text-white">Receive Notifications</h3>
                            <p className="text-sm text-slate-muted">
                                Toggle notifications for all devices
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

                {registeredDevices.length > 0 && (
                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                        <Button
                            type="button"
                            onClick={handleTestNotification}
                            disabled={isLoadingPush || !pushEnabled}
                            variant="outline"
                            className="w-full sm:w-auto"
                        >
                            {isLoadingPush ? 'Sending...' : 'Send Test Notification to All Devices'}
                        </Button>
                    </div>
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
        </Card>
    );
};

export default NotificationSettings;
