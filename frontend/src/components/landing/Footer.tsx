import { Link } from 'react-router-dom';
import { Logo } from '../ui/Logo';

export const Footer = () => {
  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const element = document.querySelector(href);
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <footer className="bg-charcoal border-t border-white/5 pt-16 pb-8" role="contentinfo">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-2">
            <Link to="/" className="mb-6 inline-block" aria-label="Cashual home">
              <Logo variant="icon-text" size="md" />
            </Link>
            <p className="text-slate-400 max-w-md">
              The smart accounting platform built for Canadian small businesses and incorporated professionals. Payroll, dividends, and tax compliance made simple.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-6">Product</h4>
            <ul className="space-y-4" role="list">
              <li>
                <a
                  href="#features"
                  onClick={(e) => handleAnchorClick(e, '#features')}
                  className="text-slate-400 hover:text-neon-emerald transition-colors focus:outline-none focus:ring-2 focus:ring-neon-emerald focus:ring-offset-2 focus:ring-offset-charcoal rounded"
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  href="#pricing"
                  onClick={(e) => handleAnchorClick(e, '#pricing')}
                  className="text-slate-400 hover:text-neon-emerald transition-colors focus:outline-none focus:ring-2 focus:ring-neon-emerald focus:ring-offset-2 focus:ring-offset-charcoal rounded"
                >
                  Pricing
                </a>
              </li>
              <li>
                <a
                  href="#faq"
                  onClick={(e) => handleAnchorClick(e, '#faq')}
                  className="text-slate-400 hover:text-neon-emerald transition-colors focus:outline-none focus:ring-2 focus:ring-neon-emerald focus:ring-offset-2 focus:ring-offset-charcoal rounded"
                >
                  FAQ
                </a>
              </li>
              <li><Link to="/login" className="text-slate-400 hover:text-neon-emerald transition-colors">Login</Link></li>
              <li><Link to="/onboarding/company" className="text-slate-400 hover:text-neon-emerald transition-colors">Sign Up</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-6">Legal</h4>
            <ul className="space-y-4" role="list">
              <li><Link to="/privacy-policy" className="text-slate-400 hover:text-neon-emerald transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms-of-service" className="text-slate-400 hover:text-neon-emerald transition-colors">Terms of Service</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-6">Support</h4>
            <ul className="space-y-4" role="list">
              <li><a href="mailto:support@cashual.app" className="text-slate-400 hover:text-neon-emerald transition-colors">support@cashual.app</a></li>
              <li><a href="#faq" onClick={(e) => handleAnchorClick(e, '#faq')} className="text-slate-400 hover:text-neon-emerald transition-colors">FAQ</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} Cashual. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            {/* Social icons could go here */}
          </div>
        </div>
      </div>
    </footer>
  );
};
