import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button';
import { ArrowRight, X } from 'lucide-react';

export const FloatingCTA = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show CTA after scrolling past hero section (approximately 600px)
      const heroHeight = 600;
      if (window.scrollY > heroHeight && !isDismissed) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isDismissed]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 md:left-auto md:translate-x-0 md:right-6"
          role="banner"
          aria-label="Get started call to action"
        >
          <div className="glass-heavy rounded-xl border border-white/10 p-4 shadow-2xl shadow-neon-emerald/20 flex items-center gap-4 max-w-md">
            <div className="flex-1">
              <p className="text-sm font-semibold text-white mb-1">Ready to get started?</p>
              <p className="text-xs text-slate-400">Join the beta and start managing your business finances today.</p>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="cta" size="sm" className="group whitespace-nowrap">
                  Start Free
                  <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Button>
              </Link>
              <button
                onClick={handleDismiss}
                className="p-1 text-slate-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-neon-emerald focus:ring-offset-2 focus:ring-offset-deep-forest rounded"
                aria-label="Dismiss call to action"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
