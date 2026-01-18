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
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    // Store subscription in database
    const subscriptionJson = subscription.toJSON();
    if (subscriptionJson.keys) {
      await api.subscribeToPushNotifications({
        endpoint: subscriptionJson.endpoint || '',
        keys: {
          p256dh: subscriptionJson.keys.p256dh || '',
          auth: subscriptionJson.keys.auth || '',
        },
      });
    }

    return subscription;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    throw error;
  }
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
      await subscription.unsubscribe();
      await api.unsubscribeFromPushNotifications();
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
    // Check database first - this is the source of truth
    const status = await api.getPushSubscriptionStatus();
    if (status.subscribed && status.enabled) {
      // Verify browser subscription exists as well
      const subscription = await getCurrentSubscription();
      if (subscription) {
        return 'subscribed';
      }
      // Database says subscribed but browser doesn't have it - might be syncing
      // Still return subscribed since database is source of truth
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
