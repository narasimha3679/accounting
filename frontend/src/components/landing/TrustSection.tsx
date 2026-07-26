import { motion } from 'framer-motion';
import { Shield, Lock, CloudOff, BadgeCheck, CreditCard, XCircle } from 'lucide-react';

const trustPoints = [
  {
    icon: Shield,
    title: "CRA Focused",
    description: "Built around Canadian tax rules with HST and corporate workflows in mind"
  },
  {
    icon: CreditCard,
    title: "Free for a Limited Time",
    description: "Full access at no cost for a limited time. All features included, no hidden fees."
  },
  {
    icon: XCircle,
    title: "Cancel Anytime",
    description: "No long-term contracts. Cancel anytime with no penalties or fees."
  },
  {
    icon: Lock,
    title: "Bank-Level Security",
    description: "Your data is encrypted and protected with enterprise-grade security"
  },
  {
    icon: CloudOff,
    title: "Reliable Cloud Infrastructure",
    description: "Powered by Supabase Postgres with managed backups and monitoring"
  },
  {
    icon: BadgeCheck,
    title: "Canadian Built",
    description: "Designed specifically for Canadian tax laws and business requirements"
  }
];

export const TrustSection = () => {
  return (
    <section className="py-16 relative" role="region" aria-labelledby="trust-heading">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-light rounded-2xl border border-white/10 p-8 md:p-12"
        >
          <div className="text-center mb-10">
            <h2 id="trust-heading" className="text-2xl md:text-3xl font-bold text-white mb-3">
              Built for Canadian <span className="text-neon-emerald">Business Owners</span>
            </h2>
            <p className="text-slate-400">
              Whether you're a consultant, contractor, freelancer, or run a small business, Cashual handles your accounting needs. 
              Especially designed for incorporated contractors and small businesses.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {trustPoints.map((point, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex flex-col items-center text-center p-4"
                role="listitem"
              >
                <div className="w-12 h-12 rounded-xl bg-neon-emerald/10 flex items-center justify-center mb-4" aria-hidden="true">
                  <point.icon className="w-6 h-6 text-neon-emerald" />
                </div>
                <h3 className="font-semibold text-white mb-2">{point.title}</h3>
                <p className="text-sm text-slate-400">{point.description}</p>
              </motion.div>
            ))}
          </div>

          {/* Trust Badges */}
          <div className="mt-10 pt-8 border-t border-white/10">
            <div className="flex flex-wrap items-center justify-center gap-6 mb-6">
              <div className="flex items-center gap-2 px-4 py-2 glass-emerald rounded-lg border border-neon-emerald/20">
                <Shield className="w-5 h-5 text-neon-emerald" aria-hidden="true" />
                <span className="text-sm font-semibold text-neon-emerald">CRA Focused Design</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 glass-emerald rounded-lg border border-neon-emerald/20">
                <CreditCard className="w-5 h-5 text-neon-emerald" aria-hidden="true" />
                <span className="text-sm font-semibold text-neon-emerald">Free for a Limited Time</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 glass rounded-lg border border-white/10">
                <XCircle className="w-5 h-5 text-neon-emerald" aria-hidden="true" />
                <span className="text-sm font-semibold text-white">Cancel Anytime</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 glass rounded-lg border border-white/10">
                <Lock className="w-5 h-5 text-neon-emerald" aria-hidden="true" />
                <span className="text-sm font-semibold text-white">Bank-Level Security</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 glass rounded-lg border border-white/10">
                <BadgeCheck className="w-5 h-5 text-neon-emerald" aria-hidden="true" />
                <span className="text-sm font-semibold text-white">Made in Canada</span>
              </div>
            </div>
            <p className="text-center text-slate-400 text-sm">
              <span className="text-white font-medium">Perfect for:</span>{' '}
              Consultants • Contractors • Freelancers • Professional Corporations • Small Business Owners • Incorporated Professionals
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
