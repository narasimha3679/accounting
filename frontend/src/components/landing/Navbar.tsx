import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { Logo } from '../ui/Logo';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_OFFSET = 80;

const scrollToHash = (hash: string) => {
  const element = document.querySelector(hash);
  if (!element) return false;
  const offsetPosition =
    element.getBoundingClientRect().top + window.pageYOffset - NAV_OFFSET;
  window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
  return true;
};

export const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const lastHandledHref = useRef<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Smooth-scroll on landing; from other pages navigate home with the hash
  const handleAnchorClick = (
    e: React.MouseEvent<HTMLAnchorElement> | React.TouchEvent<HTMLAnchorElement>,
    href: string
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (lastHandledHref.current === href) {
      return;
    }
    lastHandledHref.current = href;
    setTimeout(() => {
      lastHandledHref.current = null;
    }, 2000);

    if (location.pathname === '/') {
      scrollToHash(href);
      setTimeout(() => setMobileMenuOpen(false), 1500);
      return;
    }

    setMobileMenuOpen(false);
    navigate({ pathname: '/', hash: href.replace(/^#/, '') });
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [mobileMenuOpen]);

  const anchorClass =
    'text-sm font-medium text-slate-300 hover:text-white transition-colors';
  const mobileAnchorClass =
    'block text-slate-300 hover:text-white font-medium py-2 focus:outline-none focus:ring-2 focus:ring-neon-emerald focus:ring-inset rounded-lg px-2 touch-manipulation select-none cursor-pointer';

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-neon-emerald focus:text-deep-forest focus:rounded-lg focus:font-semibold focus:outline-none focus:ring-2 focus:ring-neon-emerald focus:ring-offset-2"
      >
        Skip to main content
      </a>
      <nav
        role="navigation"
        aria-label="Main navigation"
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? 'glass-heavy py-4 border-b border-white/5' : 'bg-transparent py-6'
        }`}
      >
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between">
            <Link to="/" aria-label="Cashual home">
              <Logo variant="icon-text" size="md" />
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <a href="/#features" onClick={(e) => handleAnchorClick(e, '#features')} className={anchorClass}>
                Features
              </a>
              <a
                href="/#how-it-works"
                onClick={(e) => handleAnchorClick(e, '#how-it-works')}
                className={anchorClass}
              >
                How it Works
              </a>
              <a href="/#pricing" onClick={(e) => handleAnchorClick(e, '#pricing')} className={anchorClass}>
                Pricing
              </a>
              <Link to="/tax-calculator" className={anchorClass}>
                Tax Calculator
              </Link>
              <a href="/#faq" onClick={(e) => handleAnchorClick(e, '#faq')} className={anchorClass}>
                FAQ
              </a>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="cta" size="sm" className="group">
                  Get Started
                  <ChevronRight
                    className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </Button>
              </Link>
            </div>

            <button
              className="md:hidden text-white p-2 focus:outline-none focus:ring-2 focus:ring-neon-emerald focus:ring-offset-2 focus:ring-offset-deep-forest rounded-lg"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle mobile menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {mobileMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              id="mobile-menu"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden glass-heavy border-b border-white/10 overflow-hidden"
              role="menu"
            >
              <div className="px-4 py-6 space-y-4">
                <a
                  href="/#features"
                  className={mobileAnchorClass}
                  onClick={(e) => handleAnchorClick(e, '#features')}
                  onTouchEnd={(e) => handleAnchorClick(e, '#features')}
                  role="menuitem"
                >
                  Features
                </a>
                <a
                  href="/#how-it-works"
                  className={mobileAnchorClass}
                  onClick={(e) => handleAnchorClick(e, '#how-it-works')}
                  onTouchEnd={(e) => handleAnchorClick(e, '#how-it-works')}
                  role="menuitem"
                >
                  How it Works
                </a>
                <a
                  href="/#pricing"
                  className={mobileAnchorClass}
                  onClick={(e) => handleAnchorClick(e, '#pricing')}
                  onTouchEnd={(e) => handleAnchorClick(e, '#pricing')}
                  role="menuitem"
                >
                  Pricing
                </a>
                <Link
                  to="/tax-calculator"
                  className={mobileAnchorClass}
                  onClick={() => setMobileMenuOpen(false)}
                  role="menuitem"
                >
                  Tax Calculator
                </Link>
                <a
                  href="/#faq"
                  className={mobileAnchorClass}
                  onClick={(e) => handleAnchorClick(e, '#faq')}
                  onTouchEnd={(e) => handleAnchorClick(e, '#faq')}
                  role="menuitem"
                >
                  FAQ
                </a>
                <div className="pt-4 flex flex-col gap-3">
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="cta" className="w-full">
                      Start Free Forever
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  );
};
