import { motion } from 'framer-motion';
import { Check, Users, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { Link } from 'react-router-dom';

const benefits = [
  "Invoice management with automatic HST calculation",
  "Income tracking and categorization",
  "Expense tracking & receipt management",
  "Time management & employee scheduling",
  "Timesheet submission and approval workflows",
  "Employee management & self-service dashboard",
  "Salary tracking and compensation management",
  "Pay runs with automatic tax calculations",
  "Payroll reports and remittance tracking",
  "T4, T5, and ROE generation",
  "Dividend tracking and company equity updates",
  "Owner reimbursement tracking",
  "Capital asset management & depreciation",
  "Client management and contact organization",
  "Tax calculator (salary vs. dividends)",
  "Financial reports (P&L, HST, retained earnings)",
  "Dashboard with real-time business insights",
  "Secure Supabase backend with row-level security",
  "Designed for Canadian small businesses and contractors",
  "CRA-compliant calculations and document generation"
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
              Free for a Limited Time
            </h2>
            <p className="text-slate-400 text-lg">
              Full access to every feature, free for a limited time. No credit card required.
            </p>
          </div>

          {/* Pricing Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative mb-16"
          >
            {/* Glow Effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-neon-emerald via-teal-500 to-emerald-600 rounded-2xl blur opacity-30" />
            
            <div className="relative glass-heavy rounded-xl p-8 md:p-12 border border-white/10">
              <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="inline-block px-4 py-1.5 rounded-full bg-neon-emerald/10 text-neon-emerald text-sm font-semibold border border-neon-emerald/20">
                      LIMITED TIME
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Sparkles className="w-4 h-4 text-golden-hour" aria-hidden="true" />
                      <span>Unlimited employees</span>
                    </div>
                  </div>
                  <h3 className="text-4xl font-bold text-white mb-2">
                    Free
                    <span className="ml-3 text-2xl font-normal text-slate-500 line-through">$5/month</span>
                  </h3>
                  <p className="text-slate-400 mb-6">
                    Free for a limited time. Everything included: no per-employee fees, no hidden costs.
                  </p>
                  <div className="flex items-center gap-2 mb-6 text-sm text-slate-400">
                    <Users className="w-4 h-4 text-neon-emerald" aria-hidden="true" />
                    <span>Join 500+ Canadian businesses already using Cashual</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link to="/login" className="w-full sm:w-auto">
                      <Button variant="cta" size="lg" className="w-full sm:w-auto px-12 min-h-[56px]">
                        Get Started Free
                        <ArrowRight className="ml-2 w-5 h-5" aria-hidden="true" />
                      </Button>
                    </Link>
                  </div>
                  <p className="mt-4 text-xs text-slate-500">
                    * No credit card required. Offer available for a limited time.
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
