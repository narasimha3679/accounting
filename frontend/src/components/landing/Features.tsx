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
    title: "Smart Payroll",
    description: "Automated payroll processing with instant PD7A calculations. Generate professional pay stubs in seconds.",
    icon: DollarSign,
    color: "text-neon-emerald"
  },
  {
    title: "Dividend Management",
    description: "Issue and track dividends effortlessly. Auto-generation of T5 slips and dividend resolutions.",
    icon: PieChart,
    color: "text-golden-hour"
  },
  {
    title: "Expense Tracking",
    description: "Categorize expenses and manage receipts. Intelligent tracking ensures you maximize your deductions.",
    icon: CreditCard,
    color: "text-blue-400"
  },
  {
    title: "Tax Documents",
    description: "One-click generation for T4s, T5s, and ROEs. Stay compliant with CRA requirements without the headache.",
    icon: FileText,
    color: "text-purple-400"
  },
  {
    title: "Tax Calculator",
    description: "Real-time tax estimations. Know exactly how much corporate and personal tax you owe throughout the year.",
    icon: Calculator,
    color: "text-pink-400"
  },
  {
    title: "Employee Portal",
    description: "Self-service access for your employees to view pay stubs, tax forms, and update their personal details.",
    icon: Users,
    color: "text-orange-400"
  }
];

export const Features = () => {
  return (
    <section id="features" className="py-24 relative">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Everything you need to run your <span className="text-neon-emerald">Inc.</span>
          </h2>
          <p className="text-slate-400 text-lg">
            Stop juggling spreadsheets and clunky software. Cashual brings all your corporate accounting needs into one beautiful dashboard.
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
              <Card className="h-full group hover:border-white/20 transition-all duration-300" glass="light">
                <div className="mb-6 inline-flex p-3 rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors">
                  <feature.icon className={`w-8 h-8 ${feature.color}`} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">
                  {feature.description}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
