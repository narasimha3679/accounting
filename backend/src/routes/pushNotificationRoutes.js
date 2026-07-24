const express = require('express');
const router = express.Router();
const webpush = require('web-push');
const authenticateUser = require('../middleware/auth');
const { supabaseAdmin } = require('../config/supabase');

// Configure web-push with VAPID keys
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@example.com';

if (vapidPrivateKey && vapidPublicKey) {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

/**
 * Send push notification to a subscription
 */
async function sendNotification(subscription, payload) {
    try {
        const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
            },
        };

        await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
        return { success: true };
    } catch (error) {
        console.error('Error sending notification:', error);

        // If subscription is invalid (410 Gone), mark it as disabled
        if (error.statusCode === 410) {
            if (supabaseAdmin) {
                await supabaseAdmin
                    .from('push_subscriptions')
                    .update({ enabled: false })
                    .eq('id', subscription.id);
            }
            return { success: false, error: 'Subscription expired' };
        }

        return { success: false, error: error.message };
    }
}

/**
 * Send notifications to all enabled subscriptions for a user
 */
async function sendToUser(userId, payload) {
    if (!supabaseAdmin) {
        return { sent: 0, failed: 0 };
    }

    const { data: subscriptions, error } = await supabaseAdmin
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('enabled', true);

    if (error) {
        console.error('Error fetching subscriptions:', error);
        return { sent: 0, failed: 0 };
    }

    if (!subscriptions || subscriptions.length === 0) {
        return { sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    // Send to all subscriptions in parallel
    const results = await Promise.allSettled(
        subscriptions.map((sub) => sendNotification(sub, payload))
    );

    results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.success) {
            sent++;
        } else {
            failed++;
        }
    });

    return { sent, failed };
}

/**
 * Send test notification to a specific user
 */
async function sendTestNotification(userId) {
    const payload = {
        title: 'Daily Test Notification',
        body: 'This is a test notification from Corporate Accounting. Push notifications are working correctly!',
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: 'daily-test',
        data: {
            type: 'test',
            url: '/',
        },
    };

    const result = await sendToUser(userId, payload);

    if (result.sent > 0) {
        return { success: true, message: `Test notification sent to ${result.sent} device(s)` };
    } else {
        return { success: false, message: 'No active subscriptions found or all notifications failed' };
    }
}

/**
 * Send timesheet notification to company owners
 */
async function sendTimesheetNotification(companyId, timesheetData) {
    if (!supabaseAdmin) {
        return { sent: 0, failed: 0 };
    }

    // Find all company owners (admins)
    const { data: profiles, error } = await supabaseAdmin
        .from('profiles')
        .select('auth_user_id')
        .eq('company_id', companyId)
        .in('role', ['admin', 'accountant']);

    if (error || !profiles || profiles.length === 0) {
        console.error('Error fetching company owners:', error);
        return { sent: 0, failed: 0 };
    }

    const employeeName = timesheetData.employee_name || 'An employee';
    const periodStart = timesheetData.period_start || '';
    const periodEnd = timesheetData.period_end || '';

    const payload = {
        title: 'Timesheet Submitted',
        body: `${employeeName} submitted a timesheet for ${periodStart} to ${periodEnd}`,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: `timesheet-${timesheetData.id || 'new'}`,
        data: {
            type: 'timesheet',
            id: timesheetData.id,
            url: '/time-management',
        },
    };

    let totalSent = 0;
    let totalFailed = 0;

    // Send to all owners
    for (const profile of profiles) {
        const result = await sendToUser(profile.auth_user_id, payload);
        totalSent += result.sent;
        totalFailed += result.failed;
    }

    return { sent: totalSent, failed: totalFailed };
}

// Check if VAPID keys are configured
router.use((req, res, next) => {
    if (!vapidPrivateKey || !vapidPublicKey) {
        return res.status(500).json({
            error: 'VAPID keys are not configured. Please set VAPID_PRIVATE_KEY and VAPID_PUBLIC_KEY environment variables.',
        });
    }
    next();
});

/**
 * POST /api/push-notifications/test
 * Send test notification to authenticated user
 */
router.post('/test', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await sendTestNotification(userId);
        return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Error in test notification:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

/**
 * POST /api/push-notifications/timesheet
 * Send timesheet notification to company owners
 */
router.post('/timesheet', authenticateUser, async (req, res) => {
    try {
        const { companyId, data: timesheetData } = req.body;

        if (!companyId) {
            return res.status(400).json({ error: 'companyId is required' });
        }

        // Verify company_id matches user's company
        if (companyId !== req.user.profile.company_id) {
            return res.status(403).json({ error: 'Forbidden: Company ID mismatch' });
        }

        const result = await sendTimesheetNotification(companyId, timesheetData || {});
        return res.status(200).json({ success: true, sent: result.sent, failed: result.failed });
    } catch (error) {
        console.error('Error in timesheet notification:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

/**
 * POST /api/push-notifications/custom
 * Send custom notification to a user
 */
router.post('/custom', authenticateUser, async (req, res) => {
    try {
        const { userId, title, body, data } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        // Verify userId matches authenticated user or user is admin/accountant
        if (userId !== req.user.id && !['admin', 'accountant'].includes(req.user.profile.role)) {
            return res.status(403).json({ error: 'Forbidden: Cannot send notifications to other users' });
        }

        const payload = {
            title: title || 'Notification',
            body: body || '',
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            data: data || {},
        };

        const result = await sendToUser(userId, payload);
        return res.status(200).json({ success: true, sent: result.sent, failed: result.failed });
    } catch (error) {
        console.error('Error in custom notification:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

/**
 * POST /api/push-notifications/webhook
 * Handle webhook payloads from database triggers
 * This endpoint doesn't require authentication as it's called by Supabase
 */
router.post('/webhook', async (req, res) => {
    try {
        const payload = req.body;

        // Handle webhook payload (from database webhook)
        if ('type' in payload && 'table' in payload) {
            // Future: Handle timesheet webhook
            if (payload.table === 'timesheets' && payload.type === 'INSERT') {
                const timesheet = payload.record;
                if (timesheet.status === 'pending' && timesheet.company_id) {
                    const result = await sendTimesheetNotification(timesheet.company_id, timesheet);
                    return res.status(200).json({ success: true, sent: result.sent, failed: result.failed });
                }
            }

            return res.status(200).json({ success: true, message: 'Webhook received but no action taken' });
        }

        return res.status(400).json({ error: 'Invalid webhook payload' });
    } catch (error) {
        console.error('Error in webhook:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

module.exports = router;
