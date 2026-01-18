import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { registerSWUpdateHandler, reloadToUpdate } from '../lib/pwa';
import { Button } from './ui/Button';

/**
 * Component to notify users when a new version of the app is available
 */
export const UpdateAvailable: React.FC = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInstalled, setUpdateInstalled] = useState(false);
  const hasShownUpdateAvailable = useRef(false);

  useEffect(() => {
    const cleanup = registerSWUpdateHandler(
      () => {
        hasShownUpdateAvailable.current = true;
        setUpdateAvailable(true);
      },
      () => {
        // Only show "Update installed" if we previously showed "Update available"
        // This prevents showing it on first-time service worker installation
        if (hasShownUpdateAvailable.current) {
          setUpdateInstalled(true);
        }
      }
    );

    return cleanup;
  }, []);

  // Auto-reload when update is installed (after a short delay)
  useEffect(() => {
    if (updateInstalled) {
      const timer = setTimeout(() => {
        reloadToUpdate();
      }, 2000); // 2 second delay to show the message

      return () => clearTimeout(timer);
    }
  }, [updateInstalled]);

  const handleUpdate = () => {
    reloadToUpdate();
  };

  const handleDismiss = () => {
    setUpdateAvailable(false);
  };

  if (!updateAvailable && !updateInstalled) {
    return null;
  }

  if (updateInstalled) {
    return (
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto z-50">
        <div className="glass-emerald border border-neon-emerald/30 rounded-lg p-4 flex items-center gap-3 shadow-lg">
          <RefreshCw className="w-5 h-5 text-neon-emerald flex-shrink-0 animate-spin" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Update installed</p>
            <p className="text-xs text-muted-foreground">
              The app will reload to apply the update.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto z-50">
      <div className="glass border border-border rounded-lg p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <RefreshCw className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground mb-1">
              Update available
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              A new version of the app is available. Reload to get the latest features and improvements.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={handleUpdate}
                size="sm"
                className="flex-1 sm:flex-none"
              >
                Reload now
              </Button>
              <Button
                onClick={handleDismiss}
                variant="secondary"
                size="sm"
                className="flex-1 sm:flex-none"
              >
                Later
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
