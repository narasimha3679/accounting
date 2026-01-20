import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../ui/Button';
import { ArrowRight, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';

export const Hero = () => {
  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-neon-emerald/20 blur-[120px] rounded-full -z-10 opacity-30" />
      <div className="absolute top-1/2 right-0 w-[800px] h-[600px] bg-indigo-500/10 blur-[100px] rounded-full -z-10 opacity-30" />

      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          
          {/* Content */}
          <div className="flex-1 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-emerald border-neon-emerald/30 mb-6"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-emerald opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-emerald"></span>
              </span>
              <span className="text-xs font-medium text-neon-emerald uppercase tracking-wider">Public Beta Available</span>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-6 leading-tight"
            >
              Corporate Accounting <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-emerald to-teal-400">
                Reimagined.
              </span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg md:text-xl text-slate-400 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed"
            >
              The all-in-one financial operating system for incorporated professionals, software developers, and small businesses. 
              Payroll, dividends, taxes, and expenses—simplified.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
            >
              <Link to="/login" className="w-full sm:w-auto">
                <Button variant="cta" size="lg" className="w-full h-14 text-base px-8 group">
                  Start for Free
                  <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <a href="#how-it-works" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full h-14 text-base px-8">
                  See How It Works
                </Button>
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="mt-8 flex items-center justify-center lg:justify-start gap-6 text-sm text-slate-500"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-neon-emerald" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-neon-emerald" />
                <span>Setup in minutes</span>
              </div>
            </motion.div>
          </div>

          {/* Visual/Image */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="flex-1 relative w-full max-w-[600px] lg:max-w-none"
          >
            <div className="relative z-10 glass-heavy rounded-2xl border border-white/10 p-2 shadow-2xl shadow-neon-emerald/10 transform rotate-1 lg:rotate-2 hover:rotate-0 transition-transform duration-500">
              <div className="bg-deep-forest rounded-xl overflow-hidden aspect-[16/10] relative">
                {/* Abstract Dashboard UI Representation */}
                <div className="absolute inset-0 bg-gradient-to-br from-charcoal to-deep-forest">
                  {/* Header */}
                  <div className="h-12 border-b border-white/5 flex items-center px-4 gap-4">
                    <div className="w-20 h-2 bg-white/10 rounded-full"></div>
                    <div className="flex-1"></div>
                    <div className="w-8 h-8 rounded-full bg-white/5"></div>
                  </div>
                  {/* Content Grid */}
                  <div className="p-6 grid grid-cols-3 gap-4 h-full">
                    <div className="col-span-2 space-y-4">
                      <div className="h-32 glass-light rounded-lg border border-white/5 p-4 relative overflow-hidden">
                         <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-neon-emerald/20 to-transparent"></div>
                         <div className="w-1/3 h-4 bg-white/10 rounded mb-2"></div>
                         <div className="w-1/2 h-8 bg-white/20 rounded"></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="h-24 glass-light rounded-lg border border-white/5"></div>
                         <div className="h-24 glass-light rounded-lg border border-white/5"></div>
                      </div>
                    </div>
                    <div className="col-span-1 space-y-4">
                       <div className="h-full glass-light rounded-lg border border-white/5"></div>
                    </div>
                  </div>
                </div>
                
                {/* Overlay Badge */}
                <div className="absolute bottom-6 left-6 right-6 glass-emerald rounded-lg p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-neon-emerald/20 flex items-center justify-center text-neon-emerald">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs text-neon-emerald font-semibold uppercase tracking-wider">Secure & Compliant</div>
                    <div className="text-sm text-white">CRA Compliant Tax Calculations</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Decor elements */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-golden-hour/20 blur-2xl rounded-full"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-neon-emerald/20 blur-2xl rounded-full"></div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
