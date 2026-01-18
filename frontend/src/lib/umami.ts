/**
 * Umami Analytics Integration
 * 
 * This module handles initialization of Umami self-hosted analytics.
 * Tracking is only enabled in production mode when environment variables are configured.
 */

const UMAMI_URL = import.meta.env.VITE_UMAMI_URL;
const UMAMI_WEBSITE_ID = import.meta.env.VITE_UMAMI_WEBSITE_ID;
const IS_PRODUCTION = import.meta.env.PROD;

/**
 * Check if Umami analytics should be enabled
 */
export const isUmamiEnabled = (): boolean => {
  return IS_PRODUCTION && !!UMAMI_URL && !!UMAMI_WEBSITE_ID;
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
