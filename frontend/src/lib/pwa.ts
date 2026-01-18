/**
 * PWA utility functions for handling service worker updates and install prompts
 */

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

/**
 * Listen for the beforeinstallprompt event and store it
 */
export function setupInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
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

  return () => {};
}

/**
 * Reload the page to apply service worker updates
 */
export function reloadToUpdate(): void {
  window.location.reload();
}
