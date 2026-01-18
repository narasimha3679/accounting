import React from 'react';
import { WifiOff } from 'lucide-react';

/**
 * Component to show when the app is offline
 */
export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto z-50">
      <div className="glass-emerald border border-neon-emerald/30 rounded-lg p-4 flex items-center gap-3 shadow-lg">
        <WifiOff className="w-5 h-5 text-neon-emerald flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">You're offline</p>
          <p className="text-xs text-muted-foreground">
            Some features may be limited. Data will sync when connection is restored.
          </p>
        </div>
      </div>
    </div>
  );
};
