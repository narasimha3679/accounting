import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { motion, AnimatePresence } from 'framer-motion';

export const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'glass-heavy py-4 border-b border-white/5' : 'bg-transparent py-6'
      }`}
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-neon-emerald to-emerald-600 flex items-center justify-center">
              <span className="text-deep-forest font-bold text-lg">C</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Cashual<span className="text-neon-emerald">.</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              How it Works
            </a>
            <a href="#pricing" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Pricing
            </a>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="cta" size="sm" className="group">
                Get Started
                <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass-heavy border-b border-white/10 overflow-hidden"
          >
            <div className="px-4 py-6 space-y-4">
              <a 
                href="#features" 
                className="block text-slate-300 hover:text-white font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </a>
              <a 
                href="#how-it-works" 
                className="block text-slate-300 hover:text-white font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                How it Works
              </a>
              <a 
                href="#pricing" 
                className="block text-slate-300 hover:text-white font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </a>
              <div className="pt-4 flex flex-col gap-3">
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full">Sign In</Button>
                </Link>
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="cta" className="w-full">Get Started</Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
