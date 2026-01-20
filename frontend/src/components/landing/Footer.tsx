import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="bg-charcoal border-t border-white/5 pt-16 pb-8">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-neon-emerald to-emerald-600 flex items-center justify-center">
                <span className="text-deep-forest font-bold text-lg">C</span>
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                Cashual<span className="text-neon-emerald">.</span>
              </span>
            </Link>
            <p className="text-slate-400 max-w-md">
              The modern financial operating system designed for Canadian incorporated professionals and small businesses.
            </p>
          </div>
          
          <div>
            <h4 className="text-white font-semibold mb-6">Product</h4>
            <ul className="space-y-4">
              <li><a href="#features" className="text-slate-400 hover:text-neon-emerald transition-colors">Features</a></li>
              <li><a href="#pricing" className="text-slate-400 hover:text-neon-emerald transition-colors">Pricing</a></li>
              <li><Link to="/login" className="text-slate-400 hover:text-neon-emerald transition-colors">Login</Link></li>
              <li><Link to="/onboarding/company" className="text-slate-400 hover:text-neon-emerald transition-colors">Sign Up</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-6">Legal</h4>
            <ul className="space-y-4">
              <li><a href="#" className="text-slate-400 hover:text-neon-emerald transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-slate-400 hover:text-neon-emerald transition-colors">Terms of Service</a></li>
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
