import React, { useState, useEffect, useRef } from 'react';
import { Download, X } from 'lucide-react';
import { isInstallable, isInstalled, showInstallPrompt, onInstallPromptAvailable } from '../lib/pwa';
import { Button } from './ui/Button';

const DISMISSED_KEY = 'pwa-install-dismissed';
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Component to prompt users to install the PWA
 * Automatically appears when the app is installable
 */
export const InstallPrompt: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const hasCheckedDismissed = useRef(false);
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if user has dismissed the prompt recently
    const checkDismissed = () => {
      if (hasCheckedDismissed.current) return;
      hasCheckedDismissed.current = true;

      const dismissedTimestamp = localStorage.getItem(DISMISSED_KEY);
      if (dismissedTimestamp) {
        const dismissedTime = parseInt(dismissedTimestamp, 10);
        const now = Date.now();
        if (now - dismissedTime < DISMISS_DURATION) {
          // Still within dismissal period
          return;
        }
        // Dismissal period expired, remove the key
        localStorage.removeItem(DISMISSED_KEY);
      }
    };

    checkDismissed();

    // Check if already installed
    if (isInstalled()) {
      return;
    }

    // Set up listener for when install prompt becomes available
    const cleanup = onInstallPromptAvailable(() => {
      // Check again if dismissed
      const dismissedTimestamp = localStorage.getItem(DISMISSED_KEY);
      if (dismissedTimestamp) {
        const dismissedTime = parseInt(dismissedTimestamp, 10);
        const now = Date.now();
        if (now - dismissedTime < DISMISS_DURATION) {
          return;
        }
        localStorage.removeItem(DISMISSED_KEY);
      }

      // Show prompt after a short delay (3 seconds) to avoid being too aggressive
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current);
      }
      showTimeoutRef.current = setTimeout(() => {
        if (isInstallable() && !isInstalled()) {
          setShowPrompt(true);
        }
      }, 3000);
    });

    // Also check immediately if already available
    if (isInstallable() && !isInstalled()) {
      const dismissedTimestamp = localStorage.getItem(DISMISSED_KEY);
      if (!dismissedTimestamp) {
        showTimeoutRef.current = setTimeout(() => {
          setShowPrompt(true);
        }, 3000);
      } else {
        const dismissedTime = parseInt(dismissedTimestamp, 10);
        const now = Date.now();
        if (now - dismissedTime >= DISMISS_DURATION) {
          showTimeoutRef.current = setTimeout(() => {
            setShowPrompt(true);
          }, 3000);
        }
      }
    }

    return () => {
      cleanup();
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current);
      }
    };
  }, []);

  // Hide prompt if app becomes installed
  useEffect(() => {
    if (isInstalled()) {
      setShowPrompt(false);
    }
  }, []);

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const accepted = await showInstallPrompt();
      if (accepted) {
        setShowPrompt(false);
      }
    } catch (error) {
      console.error('Error showing install prompt:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Store dismissal timestamp
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
  };

  if (!showPrompt || isInstalled()) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto z-50">
      <div className="glass border border-border rounded-lg p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <Download className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground mb-1">
              Install App
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              Install this app on your device for quick access. Works offline and can be launched from your home screen.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={handleInstall}
                size="sm"
                disabled={isInstalling}
                className="flex-1 sm:flex-none"
              >
                {isInstalling ? 'Installing...' : 'Install'}
              </Button>
              <Button
                onClick={handleDismiss}
                variant="secondary"
                size="sm"
                className="flex-1 sm:flex-none"
              >
                Not now
              </Button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
