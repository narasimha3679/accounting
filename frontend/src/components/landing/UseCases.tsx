import { motion } from 'framer-motion';
import Card from '../ui/Card';
import { 
  Briefcase, 
  Building2, 
  Calculator,
  Clock,
  DollarSign,
  FileText,
  PieChart,
  TrendingUp
} from 'lucide-react';

const useCases = [
  {
    title: "For Contractors",
    description: "Perfect for incorporated contractors who need to manage their business finances efficiently.",
    icon: Briefcase,
    color: "text-neon-emerald",
    features: [
      {
        title: "Time Tracking",
        description: "Track billable hours and submit timesheets for client projects",
        icon: Clock
      },
      {
        title: "Expense Management",
        description: "Capture receipts on the go and maximize your deductions",
        icon: DollarSign
      },
      {
        title: "Dividend Optimization",
        description: "Use the tax calculator to optimize salary vs. dividend payments",
        icon: Calculator
      },
      {
        title: "CRA Compliance",
        description: "Generate HST reports and stay organized for tax time",
        icon: FileText
      }
    ]
  },
  {
    title: "For Small Businesses",
    description: "Ideal for small businesses with employees who need payroll, scheduling, and comprehensive accounting.",
    icon: Building2,
    color: "text-blue-400",
    features: [
      {
        title: "Employee Scheduling",
        description: "Schedule shifts, approve timesheets, and manage your team",
        icon: Clock
      },
      {
        title: "Payroll Processing",
        description: "Run payroll with automatic tax calculations and remittances",
        icon: DollarSign
      },
      {
        title: "Financial Reports",
        description: "Generate P&L statements and track your business health",
        icon: TrendingUp
      },
      {
        title: "Tax Documents",
        description: "Generate T4s, T5s, and ROEs automatically at year-end",
        icon: FileText
      }
    ]
  },
  {
    title: "For Professional Corporations",
    description: "Built for professional corporations that need advanced tax planning.",
    icon: PieChart,
    color: "text-golden-hour",
    features: [
      {
        title: "Tax Planning",
        description: "Compare salary vs. dividends to optimize your tax strategy",
        icon: Calculator
      },
      {
        title: "Capital Assets",
        description: "Manage assets and depreciation for accurate bookkeeping",
        icon: Building2
      },
      {
        title: "Dividend Management",
        description: "Issue dividends with proper documentation and T5 generation",
        icon: DollarSign
      }
    ]
  }
];

export const UseCases = () => {
  return (
    <section 
      id="use-cases" 
      className="py-24 relative"
      role="region"
      aria-labelledby="use-cases-heading"
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2
            id="use-cases-heading"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-bold text-white mb-6"
          >
            Built for Your <span className="text-neon-emerald">Business Type</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 text-lg"
          >
            Whether you're a solo contractor, small business owner, or professional corporation, Cashual has the features you need.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {useCases.map((useCase, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15, duration: 0.5 }}
            >
              <Card className="h-full flex flex-col group hover:border-white/20 hover:shadow-lg hover:shadow-neon-emerald/10 transition-all duration-300" glass="light">
                <div className="mb-6 inline-flex p-4 rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors" aria-hidden="true">
                  <useCase.icon className={`w-10 h-10 ${useCase.color}`} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">{useCase.title}</h3>
                <p className="text-slate-400 mb-6 leading-relaxed">
                  {useCase.description}
                </p>
                <div className="space-y-4 flex-1">
                  {useCase.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start gap-3">
                      <div className="mt-1 p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors" aria-hidden="true">
                        <feature.icon className={`w-5 h-5 ${useCase.color}`} />
                      </div>
                      <div>
                        <h4 className="text-white font-semibold mb-1">{feature.title}</h4>
                        <p className="text-sm text-slate-400">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
