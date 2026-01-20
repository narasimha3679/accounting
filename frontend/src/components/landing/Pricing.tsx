import { motion } from 'framer-motion';
import { Check, Clock, Users } from 'lucide-react';
import { Button } from '../ui/Button';
import { Link } from 'react-router-dom';

const benefits = [
  "Unlimited payroll runs",
  "Unlimited employees",
  "Dividend management & T5s",
  "T4, T4A, and ROE generation",
  "Expense tracking & categorization",
  "Invoice management",
  "Employee self-service portal",
  "CRA-compliant calculations"
];

export const Pricing = () => {
  return (
    <section 
      id="pricing" 
      className="py-24 relative overflow-hidden"
      role="region"
      aria-labelledby="pricing-heading"
    >
      {/* Background Decor */}
      <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-emerald-900/10 to-transparent -z-10" />

      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 id="pricing-heading" className="text-3xl md:text-5xl font-bold text-white mb-6">
              Simple, Transparent Pricing
            </h2>
            <p className="text-slate-400 text-lg">
              We're in Public Beta—get full access to all features completely free while we perfect the platform together.
            </p>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative"
          >
            {/* Glow Effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-neon-emerald via-teal-500 to-emerald-600 rounded-2xl blur opacity-30" />
            
            <div className="relative glass-heavy rounded-xl p-8 md:p-12 border border-white/10">
              <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="inline-block px-4 py-1.5 rounded-full bg-neon-emerald/10 text-neon-emerald text-sm font-semibold border border-neon-emerald/20">
                      PUBLIC BETA
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Clock className="w-4 h-4 text-golden-hour" aria-hidden="true" />
                      <span>Limited spots available</span>
                    </div>
                  </div>
                  <h3 className="text-4xl font-bold text-white mb-2">Free Access</h3>
                  <p className="text-slate-400 mb-6">
                    Join the beta and help shape the future of small business accounting in Canada. Your feedback drives our roadmap.
                  </p>
                  <div className="flex items-center gap-2 mb-6 text-sm text-slate-400">
                    <Users className="w-4 h-4 text-neon-emerald" aria-hidden="true" />
                    <span>Join 500+ Canadian businesses already using Cashual</span>
                  </div>
                  <Link to="/login">
                    <Button variant="cta" size="lg" className="w-full sm:w-auto px-12 min-h-[56px]">
                      Get Started Now
                    </Button>
                  </Link>
                  <p className="mt-4 text-xs text-slate-500">
                    * No credit card required during beta period.
                  </p>
                </div>

                <div className="w-full md:w-auto min-w-[300px] glass-light rounded-xl p-6 border border-white/5">
                  <h4 className="text-white font-semibold mb-6">What's included:</h4>
                  <ul className="space-y-4" role="list">
                    {benefits.map((benefit, i) => (
                      <li key={i} className="flex items-center gap-3 text-slate-300" role="listitem">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-neon-emerald/20 flex items-center justify-center" aria-hidden="true">
                          <Check className="w-3 h-3 text-neon-emerald" />
                        </div>
                        <span className="text-sm">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
