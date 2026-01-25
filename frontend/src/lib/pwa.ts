/**
 * PWA utility functions for handling service worker updates and install prompts
 */

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installPromptCallbacks: Array<() => void> = [];

/**
 * Listen for the beforeinstallprompt event and store it
 * @param onPromptAvailable - Optional callback when install prompt becomes available
 */
export function setupInstallPrompt(onPromptAvailable?: () => void): void {
  if (onPromptAvailable) {
    installPromptCallbacks.push(onPromptAvailable);
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent default to capture the event for our custom banner
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;

    // Notify all registered callbacks
    installPromptCallbacks.forEach(callback => callback());
  });
}

/**
 * Show the install prompt if available
 * @returns Promise that resolves when user makes a choice
 */
export async function showInstallPrompt(): Promise<boolean> {
  if (!deferredPrompt) {
    return false;
  }

  try {
    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    deferredPrompt = null;
    return choiceResult.outcome === 'accepted';
  } catch (error) {
    console.error('Error showing install prompt:', error);
    return false;
  }
}

/**
 * Check if the app is installable
 */
export function isInstallable(): boolean {
  return deferredPrompt !== null;
}

/**
 * Register a callback to be notified when install prompt becomes available
 * @param callback - Function to call when install prompt is available
 * @returns Cleanup function to unregister the callback
 */
export function onInstallPromptAvailable(callback: () => void): () => void {
  installPromptCallbacks.push(callback);

  // If prompt is already available, call immediately
  if (deferredPrompt) {
    callback();
  }

  // Return cleanup function
  return () => {
    installPromptCallbacks = installPromptCallbacks.filter(cb => cb !== callback);
  };
}

/**
 * Check if the app is running as a PWA (installed)
 */
export function isInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://');
}

/**
 * Register service worker update handler
 * Works with vite-plugin-pwa's automatic service worker registration
 */
export function registerSWUpdateHandler(
  onUpdateAvailable: () => void,
  onUpdateInstalled: () => void
): () => void {
  if ('serviceWorker' in navigator) {
    let refreshing = false;

    // Listen for controller change (new service worker activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        onUpdateInstalled();
      }
    });

    // Check for updates periodically
    const checkForUpdates = () => {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          registration.update();

          // Listen for waiting service worker (update available)
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker is installed and waiting
                  onUpdateAvailable();
                }
              });
            }
          });
        }
      });
    };

    // Check for updates on load
    checkForUpdates();

    // Check for updates every hour
    const intervalId = setInterval(checkForUpdates, 60 * 60 * 1000);

    // Also listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SKIP_WAITING') {
        // Service worker is asking to skip waiting
        onUpdateAvailable();
      }
    });

    return () => clearInterval(intervalId);
  }

  return () => { };
}

/**
 * Reload the page to apply service worker updates
 */
export function reloadToUpdate(): void {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration && registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      } else {
        window.location.reload();
      }
    });
  } else {
    window.location.reload();
  }
}
