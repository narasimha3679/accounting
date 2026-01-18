import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@latest';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:support@example.com';

// Configure web-push with VAPID keys
if (vapidPrivateKey && vapidPublicKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  enabled: boolean;
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: any;
  schema: string;
  old_record?: any;
}

interface RequestPayload {
  type: 'test' | 'timesheet' | 'custom';
  userId?: string;
  companyId?: number;
  title?: string;
  body?: string;
  data?: any;
}

/**
 * Send push notification to a subscription
 */
async function sendNotification(
  subscription: PushSubscriptionRow,
  payload: NotificationPayload
): Promise<{ success: boolean; error?: string }> {
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
  } catch (error: any) {
    console.error('Error sending notification:', error);
    
    // If subscription is invalid (410 Gone), mark it as disabled
    if (error.statusCode === 410) {
      await supabase
        .from('push_subscriptions')
        .update({ enabled: false })
        .eq('id', subscription.id);
      return { success: false, error: 'Subscription expired' };
    }
    
    return { success: false, error: error.message };
  }
}

/**
 * Send notifications to all enabled subscriptions for a user
 */
async function sendToUser(
  userId: string,
  payload: NotificationPayload
): Promise<{ sent: number; failed: number }> {
  const { data: subscriptions, error } = await supabase
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
    subscriptions.map((sub) => sendNotification(sub as PushSubscriptionRow, payload))
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
async function sendTestNotification(userId: string): Promise<{ success: boolean; message: string }> {
  const payload: NotificationPayload = {
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
async function sendTimesheetNotification(companyId: number, timesheetData: any): Promise<{ sent: number; failed: number }> {
  // Find all company owners (admins)
  const { data: profiles, error } = await supabase
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

  const payload: NotificationPayload = {
    title: 'Timesheet Submitted',
    body: `${employeeName} submitted a timesheet for ${periodStart} to ${periodEnd}`,
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: `timesheet-${timesheetData.id || 'new'}`,
    data: {
      type: 'timesheet',
      id: timesheetData.id,
      url: '/salary',
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

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Check if VAPID keys are configured
    if (!vapidPrivateKey || !vapidPublicKey) {
      return new Response(
        JSON.stringify({ error: 'VAPID keys are not configured. Please set VAPID_PRIVATE_KEY and VAPID_PUBLIC_KEY secrets.' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const payload: RequestPayload | WebhookPayload = await req.json();

    // Handle webhook payload (from database webhook)
    if ('type' in payload && 'table' in payload) {
      const webhookPayload = payload as WebhookPayload;
      
      // Future: Handle timesheet webhook
      if (webhookPayload.table === 'timesheets' && webhookPayload.type === 'INSERT') {
        const timesheet = webhookPayload.record;
        if (timesheet.status === 'pending' && timesheet.company_id) {
          const result = await sendTimesheetNotification(timesheet.company_id, timesheet);
          return new Response(
            JSON.stringify({ success: true, sent: result.sent, failed: result.failed }),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              },
            }
          );
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Webhook received but no action taken' }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Handle direct API call
    const requestPayload = payload as RequestPayload;

    if (requestPayload.type === 'test') {
      if (!requestPayload.userId) {
        return new Response(
          JSON.stringify({ error: 'userId is required for test notifications' }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }

      const result = await sendTestNotification(requestPayload.userId);
      return new Response(
        JSON.stringify(result),
        {
          status: result.success ? 200 : 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    if (requestPayload.type === 'timesheet' && requestPayload.companyId) {
      const result = await sendTimesheetNotification(
        requestPayload.companyId,
        requestPayload.data || {}
      );
      return new Response(
        JSON.stringify({ success: true, sent: result.sent, failed: result.failed }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    if (requestPayload.type === 'custom' && requestPayload.userId) {
      const customPayload: NotificationPayload = {
        title: requestPayload.title || 'Notification',
        body: requestPayload.body || '',
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        data: requestPayload.data || {},
      };

      const result = await sendToUser(requestPayload.userId, customPayload);
      return new Response(
        JSON.stringify({ success: true, sent: result.sent, failed: result.failed }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid request payload' }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error: any) {
    console.error('Error in send-push-notification function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
