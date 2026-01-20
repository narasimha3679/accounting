import { motion } from 'framer-motion';
import { Building2, Settings, Rocket } from 'lucide-react';

const steps = [
  {
    number: "01",
    title: "Set Up Your Company",
    description: "Create your account and enter your company details. Add your business number, fiscal year end, and CRA account information.",
    icon: Building2,
  },
  {
    number: "02",
    title: "Add Your Team",
    description: "Add employees with their tax information. Set up salary or hourly rates, benefits, and deductions. Employees get secure self-service access.",
    icon: Settings,
  },
  {
    number: "03",
    title: "Run Your Business",
    description: "Process payroll, issue dividends, track expenses, and generate tax documents. Everything stays organized and CRA-compliant.",
    icon: Rocket,
  },
];

export const HowItWorks = () => {
  return (
    <section 
      id="how-it-works" 
      className="py-24 relative"
      role="region"
      aria-labelledby="how-it-works-heading"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-charcoal/50 to-transparent -z-10" />
      
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2 
            id="how-it-works-heading"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-bold text-white mb-6"
          >
            Get Started in <span className="text-neon-emerald">Minutes</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 text-lg"
          >
            No complex setup. No lengthy onboarding. Just sign up and start managing your business finances.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15, duration: 0.5 }}
              className="relative"
            >
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-[60%] w-full h-px bg-gradient-to-r from-neon-emerald/50 to-transparent" />
              )}
              
              <div className="text-center">
                {/* Step Number Badge */}
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl glass-emerald border border-neon-emerald/30 mb-6 relative">
                  <step.icon className="w-10 h-10 text-neon-emerald" />
                  <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-neon-emerald text-deep-forest text-sm font-bold flex items-center justify-center">
                    {step.number}
                  </span>
                </div>
                
                <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-slate-400 leading-relaxed max-w-sm mx-auto">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6"
        >
          {[
            { value: "5 min", label: "Average Setup Time" },
            { value: "100%", label: "CRA Compliant" },
            { value: "24/7", label: "Platform Access" },
            { value: "Free", label: "During Beta" },
          ].map((stat, index) => (
            <div key={index} className="text-center p-6 glass-light rounded-xl border border-white/5">
              <div className="text-2xl md:text-3xl font-bold text-neon-emerald mb-1">{stat.value}</div>
              <div className="text-sm text-slate-400">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
