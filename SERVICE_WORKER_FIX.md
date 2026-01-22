# Service Worker Fix for Blog Routes

## Problem
The service worker was intercepting ALL navigation requests, including `/blog/*`, and serving the React app's `index.html` instead of letting requests go to the blog service.

## Solution
Updated the service worker to exclude `/blog/*` routes from navigation interception.

## Changes Made

**File**: `frontend/src/service-worker.ts`

**Before:**
```typescript
registerRoute(({ request }) => request.mode === 'navigate', navigationHandler);
```

**After:**
```typescript
registerRoute(
  ({ request, url }) => {
    // Don't intercept /blog/* routes - let them go to the blog service
    if (request.mode === 'navigate' && !url.pathname.startsWith('/blog')) {
      return true;
    }
    return false;
  },
  navigationHandler
);
```

## Deployment Steps

1. **Rebuild the frontend:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy to Coolify** (or your deployment method)

3. **After deployment, users need to update their service worker:**
   - Option A: Wait for automatic update (can take time)
   - Option B: Users can manually unregister:
     1. Open DevTools (F12)
     2. Go to Application → Service Workers
     3. Click "Unregister" for the Cashual service worker
     4. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

## Testing

1. Visit `https://cashual.org` (main app loads)
2. Navigate to `https://cashual.org/blog` (should work now!)
3. Navigate back to `https://cashual.org` (should still work)
4. Navigate to `https://cashual.org/blog` again (should work consistently)

## What This Fixes

- ✅ `/blog` routes are no longer intercepted by the service worker
- ✅ Blog service can handle its own routes properly
- ✅ Navigation between main app and blog works seamlessly
- ✅ No more black screen when navigating to `/blog` after visiting main app

## Note

The service worker scope is still `/` which is fine - we're just being selective about which routes it intercepts. The blog routes will pass through to the blog service via the reverse proxy.
