import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../lib/umami';

const NAV_OFFSET = 80;

/**
 * Scrolls to top on route change, or to a hash target when one is present.
 * Also tracks page views for Umami analytics on SPA route changes.
 */
export const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const id = hash.startsWith('#') ? hash : `#${hash}`;
      // Wait for the destination page to mount before scrolling
      const timer = window.setTimeout(() => {
        const element = document.querySelector(id);
        if (element) {
          const top =
            element.getBoundingClientRect().top + window.pageYOffset - NAV_OFFSET;
          window.scrollTo({ top, left: 0, behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
        }
      }, 50);
      trackPageView(pathname + hash, document.title);
      return () => window.clearTimeout(timer);
    }

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth',
    });
    trackPageView(pathname, document.title);
  }, [pathname, hash]);

  return null;
};

export default ScrollToTop;
