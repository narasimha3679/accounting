/**
 * Umami Analytics Integration
 * 
 * This module handles initialization of Umami self-hosted analytics.
 * Tracking is only enabled in production mode when environment variables are configured.
 */

const UMAMI_URL = import.meta.env.VITE_UMAMI_URL;
const UMAMI_WEBSITE_ID = import.meta.env.VITE_UMAMI_WEBSITE_ID;
const IS_PRODUCTION = import.meta.env.PROD;

// Type declaration for Umami global object
declare global {
  interface Window {
    umami?: {
      track: (payload?: { website?: string; url?: string; title?: string } | ((props: any) => any)) => void;
    };
  }
}

/**
 * Check if Umami analytics should be enabled
 */
export const isUmamiEnabled = (): boolean => {
  return IS_PRODUCTION && !!UMAMI_URL && !!UMAMI_WEBSITE_ID;
};

/**
 * Check if Umami script has loaded and is ready to use
 */
export const isUmamiReady = (): boolean => {
  return typeof window !== 'undefined' && typeof window.umami !== 'undefined';
};

/**
 * Initialize Umami analytics tracking
 * 
 * This function dynamically injects the Umami script tag into the document head.
 * It only runs in production mode when both URL and Website ID are configured.
 */
export const initUmami = (): void => {
  // Only initialize in production with valid configuration
  if (!isUmamiEnabled()) {
    if (!IS_PRODUCTION) {
      console.log('[Umami] Analytics disabled - development mode');
    } else {
      console.warn('[Umami] Analytics disabled - missing configuration (VITE_UMAMI_URL or VITE_UMAMI_WEBSITE_ID)');
    }
    return;
  }

  // Check if script already exists
  const existingScript = document.querySelector('script[data-website-id]');
  if (existingScript) {
    console.log('[Umami] Analytics script already loaded');
    return;
  }

  // Create and inject the Umami script
  const script = document.createElement('script');
  script.async = true;
  script.defer = true;
  script.setAttribute('data-website-id', UMAMI_WEBSITE_ID);
  script.src = `${UMAMI_URL}/script.js`;

  // Add to document head
  document.head.appendChild(script);

  console.log('[Umami] Analytics initialized', {
    url: UMAMI_URL,
    websiteId: UMAMI_WEBSITE_ID,
  });
};

/**
 * Track a page view manually
 * 
 * This is useful for SPAs where route changes don't trigger full page reloads.
 * 
 * @param url - The URL path to track (e.g., '/dashboard', '/invoices')
 * @param title - Optional page title (defaults to document.title)
 */
export const trackPageView = (url: string, title?: string): void => {
  // Only track in production when enabled
  if (!isUmamiEnabled()) {
    return;
  }

  // Wait for Umami to be ready, with a small delay to ensure script has loaded
  const attemptTrack = () => {
    if (isUmamiReady() && window.umami) {
      try {
        // Umami's track() method with custom payload for page views
        // Preserves default properties (hostname, language, referrer, etc.) and overrides url/title
        window.umami.track((props: any) => ({
          ...props,
          url: url,
          title: title || document.title,
        }));
      } catch (error) {
        console.warn('[Umami] Failed to track page view:', error);
      }
    } else {
      // Retry after a short delay if Umami isn't ready yet
      setTimeout(attemptTrack, 100);
    }
  };

  attemptTrack();
};

/**
 * Track a custom event
 * 
 * Use this to track important user actions like invoice creation, expense submission, etc.
 * 
 * Note: Umami's track() method is primarily for page views. For custom events,
 * you may need to use Umami's event tracking feature if available, or track events
 * as part of the page view payload. This function provides a foundation for future
 * event tracking capabilities.
 * 
 * @param eventName - Name of the event (e.g., 'invoice_created', 'expense_submitted')
 * @param eventData - Optional event data object
 */
export const trackEvent = (eventName: string, eventData?: Record<string, any>): void => {
  // Only track in production when enabled
  if (!isUmamiEnabled()) {
    return;
  }

  // Wait for Umami to be ready
  const attemptTrack = () => {
    if (isUmamiReady() && window.umami) {
      try {
        // For now, track events as part of page view with event data
        // This can be enhanced when Umami adds explicit event tracking
        window.umami.track((props: any) => ({
          ...props,
          event: eventName,
          ...eventData,
        }));
      } catch (error) {
        console.warn('[Umami] Failed to track event:', error);
      }
    } else {
      // Retry after a short delay if Umami isn't ready yet
      setTimeout(attemptTrack, 100);
    }
  };

  attemptTrack();
};
