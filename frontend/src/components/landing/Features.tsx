import { motion } from 'framer-motion';
import Card from '../ui/Card';
import { 
  DollarSign, 
  FileText, 
  PieChart, 
  Calculator, 
  CreditCard,
  Users
} from 'lucide-react';

const features = [
  {
    title: "Automated Payroll",
    description: "Run payroll in minutes, not hours. Automatic tax calculations, PD7A remittance summaries, and professional pay stubs generated instantly.",
    icon: DollarSign,
    color: "text-neon-emerald"
  },
  {
    title: "Dividend Management",
    description: "Issue dividends with proper documentation. Auto-generate T5 slips and board resolutions—stay compliant without the paperwork.",
    icon: PieChart,
    color: "text-golden-hour"
  },
  {
    title: "Expense Tracking",
    description: "Track business expenses and maximize deductions. Smart categorization helps you identify tax savings opportunities.",
    icon: CreditCard,
    color: "text-blue-400"
  },
  {
    title: "CRA-Ready Tax Documents",
    description: "Generate T4s, T5s, and ROEs with one click. Built-in compliance checks ensure your documents meet CRA requirements.",
    icon: FileText,
    color: "text-purple-400"
  },
  {
    title: "Tax Planning Calculator",
    description: "See your corporate and personal tax obligations in real-time. Plan salary vs. dividend mix to optimize your tax position.",
    icon: Calculator,
    color: "text-pink-400"
  },
  {
    title: "Employee Self-Service",
    description: "Give employees secure access to their pay stubs, T4s, and TD1 forms. Reduce admin work and improve transparency.",
    icon: Users,
    color: "text-orange-400"
  }
];

export const Features = () => {
  return (
    <section 
      id="features" 
      className="py-24 relative" 
      role="region" 
      aria-labelledby="features-heading"
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 id="features-heading" className="text-3xl md:text-5xl font-bold text-white mb-6">
            Everything You Need to Run Your <span className="text-neon-emerald">Business</span>
          </h2>
          <p className="text-slate-400 text-lg">
            Stop juggling spreadsheets and expensive accountant fees. Cashual brings payroll, dividends, tax documents, and expense tracking into one powerful platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <Card className="h-full group hover:border-white/20 hover:shadow-lg hover:shadow-neon-emerald/10 transition-all duration-300 flex flex-col" glass="light">
                <div className="mb-6 inline-flex p-3 rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors" aria-hidden="true">
                  <feature.icon className={`w-8 h-8 ${feature.color}`} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed flex-1 mb-4">
                  {feature.description}
                </p>
                <a 
                  href="#pricing" 
                  className="text-sm text-neon-emerald hover:text-teal-400 font-medium inline-flex items-center gap-1 group/link transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    const element = document.querySelector('#pricing');
                    if (element) {
                      const offset = 80;
                      const elementPosition = element.getBoundingClientRect().top;
                      const offsetPosition = elementPosition + window.pageYOffset - offset;
                      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                    }
                  }}
                >
                  Try this feature <span className="group-hover/link:translate-x-1 transition-transform inline-block">→</span>
                </a>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
