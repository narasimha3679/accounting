import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../lib/umami';

/**
 * ScrollToTop component that scrolls to top of page on route change
 * This ensures users see the new page content when navigating.
 * Also tracks page views for Umami analytics on route changes.
 */
export const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to top smoothly when route changes
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });

    // Track page view for analytics (SPA route changes)
    trackPageView(pathname, document.title);
  }, [pathname]);

  return null;
};

export default ScrollToTop;
