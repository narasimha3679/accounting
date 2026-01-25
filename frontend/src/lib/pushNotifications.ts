/**
 * Push notification utilities for Web Push API
 */

import api from './api';

export type PushSubscriptionStatus = 'subscribed' | 'not-subscribed' | 'not-supported' | 'denied';

/**
 * Check if browser supports push notifications
 */
export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Check current notification permission status
 */
export function getPermissionStatus(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Request notification permission from user
 */
export async function requestPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    throw new Error('Notifications are not supported in this browser');
  }

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Convert VAPID public key from base64 URL-safe string to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Get the service worker registration
 */
async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers are not supported');
  }

  const registration = await navigator.serviceWorker.ready;
  return registration;
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported in this browser');
  }

  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    throw new Error('VAPID public key is not configured');
  }

  // Check permission first
  const permission = getPermissionStatus();
  if (permission !== 'granted') {
    const newPermission = await requestPermission();
    if (newPermission !== 'granted') {
      throw new Error('Notification permission denied');
    }
  }

  try {
    const registration = await getServiceWorkerRegistration();
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as any,
    });

    // Store subscription in database
    const subscriptionJson = subscription.toJSON();
    if (subscriptionJson.keys) {
      // Get device info
      const deviceName = getDeviceName();

      await api.subscribeToPushNotifications({
        endpoint: subscriptionJson.endpoint || '',
        keys: {
          p256dh: subscriptionJson.keys.p256dh || '',
          auth: subscriptionJson.keys.auth || '',
        },
        device_name: deviceName,
        user_agent: navigator.userAgent,
      });
    }

    return subscription;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    throw error;
  }
}

/**
 * Get a friendly device name
 */
function getDeviceName(): string {
  const ua = navigator.userAgent;
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';

  // Detect Browser
  if (ua.indexOf('Firefox') !== -1) browser = 'Firefox';
  else if (ua.indexOf('Chrome') !== -1) browser = 'Chrome';
  else if (ua.indexOf('Safari') !== -1) browser = 'Safari';
  else if (ua.indexOf('Edge') !== -1) browser = 'Edge';

  // Detect OS
  if (ua.indexOf('Win') !== -1) os = 'Windows';
  else if (ua.indexOf('Mac') !== -1) os = 'MacOS';
  else if (ua.indexOf('Linux') !== -1) os = 'Linux';
  else if (ua.indexOf('Android') !== -1) os = 'Android';
  else if (ua.indexOf('iPhone') !== -1) os = 'iPhone';
  else if (ua.indexOf('iPad') !== -1) os = 'iPad';

  return `${browser} on ${os}`;
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) {
    return;
  }

  try {
    const registration = await getServiceWorkerRegistration();
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      // Pass endpoint to only unsubscribe this device/browser
      await api.unsubscribeFromPushNotifications(endpoint);
    }
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    throw error;
  }
}

/**
 * Get current push subscription
 */
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    return null;
  }

  try {
    const registration = await getServiceWorkerRegistration();
    return await registration.pushManager.getSubscription();
  } catch (error) {
    console.error('Error getting current subscription:', error);
    return null;
  }
}

/**
 * Get subscription status
 */
export async function getSubscriptionStatus(): Promise<PushSubscriptionStatus> {
  if (!isPushSupported()) {
    return 'not-supported';
  }

  const permission = getPermissionStatus();
  if (permission === 'denied') {
    return 'denied';
  }

  try {
    // Check if browser has a subscription
    const subscription = await getCurrentSubscription();

    if (subscription) {
      // Browser is subscribed. 
      // Ideally we should also check if it's in the DB and enabled,
      // but 'subscribed' here means "this device is set up".
      // The API call to get status can return global "enabled" state if needed,
      // but for "is this device subscribed", valid browser subscription is key.
      return 'subscribed';
    }

    return 'not-subscribed';
  } catch (error) {
    console.error('Error getting subscription status:', error);
    return 'not-subscribed';
  }
}

/**
 * Check if user has an active subscription stored in database
 */
export async function hasStoredSubscription(): Promise<boolean> {
  try {
    const status = await api.getPushSubscriptionStatus();
    return status.subscribed && status.enabled;
  } catch (error) {
    console.error('Error checking stored subscription:', error);
    return false;
  }
}
