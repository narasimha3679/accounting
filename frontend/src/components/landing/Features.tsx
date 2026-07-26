import { motion } from 'framer-motion';
import Card from '../ui/Card';
import { 
  DollarSign, 
  FileText, 
  PieChart, 
  Calculator, 
  CreditCard,
  Users,
  Clock,
  Building2,
  TrendingUp,
  Briefcase,
  Banknote,
  BarChart,
  FileCheck,
  Receipt,
  UserCircle
} from 'lucide-react';

const features = [
  // Core Accounting
  {
    title: "Invoice Management",
    description: "Create professional invoices with automatic HST calculation. Track payments, send reminders, and never lose track of what you're owed. Get paid faster with organized invoicing.",
    icon: FileText,
    color: "text-neon-emerald",
    category: "Core Accounting"
  },
  {
    title: "Income Tracking",
    description: "Record all your business income in one place. Categorize by source, track payment dates, and generate income reports for tax time. Stay organized without the spreadsheets.",
    icon: DollarSign,
    color: "text-green-400",
    category: "Core Accounting"
  },
  {
    title: "Expense Tracking",
    description: "Snap a photo of your receipt, categorize it automatically, and never lose a deduction. Smart categorization helps you maximize deductions and save hours at tax time.",
    icon: Receipt,
    color: "text-blue-400",
    category: "Core Accounting"
  },
  {
    title: "Capital Assets",
    description: "Track your business assets and depreciation automatically. Know the book value of your equipment, vehicles, and property. CRA-compliant depreciation calculations save you time and ensure accuracy.",
    icon: Building2,
    color: "text-indigo-400",
    category: "Core Accounting"
  },
  {
    title: "Client Management",
    description: "Keep all your client information organized. Track contact details, payment terms, and invoice history. Build better relationships with organized client records.",
    icon: Users,
    color: "text-cyan-400",
    category: "Core Accounting"
  },
  // Payroll & HR
  {
    title: "Time Management & Scheduling",
    description: "Employees submit timesheets, managers approve with one click, and you schedule shifts effortlessly. Calendar views, approval workflows, and automatic hour calculations, all in one place.",
    icon: Clock,
    color: "text-orange-400",
    category: "Payroll & HR"
  },
  {
    title: "Employee Management",
    description: "Add employees, manage their information, and set up secure access. Employees get their own dashboard to view schedules, timesheets, and pay information. No more emailing back and forth.",
    icon: UserCircle,
    color: "text-pink-400",
    category: "Payroll & HR"
  },
  {
    title: "Salary Tracking",
    description: "Track employee salaries and compensation in one organized place. Set up hourly or salary rates, manage benefits, and keep all employee compensation data ready for payroll processing.",
    icon: Briefcase,
    color: "text-yellow-400",
    category: "Payroll & HR"
  },
  {
    title: "Pay Runs",
    description: "Process payroll in minutes, not hours. Create pay runs, preview calculations, approve, and finalize, all with automatic tax deductions. Batch processing saves you time every pay period.",
    icon: DollarSign,
    color: "text-emerald-400",
    category: "Payroll & HR"
  },
  {
    title: "Payroll Reports",
    description: "Generate comprehensive payroll reports for any period. See totals, deductions, and employer costs at a glance. Export data for your accountant or CRA filings.",
    icon: BarChart,
    color: "text-teal-400",
    category: "Payroll & HR"
  },
  {
    title: "CRA Remittances",
    description: "Track what you owe the CRA and when it's due. Automatic calculation of CPP, EI, and tax remittances. Never miss a deadline with clear remittance tracking and summaries.",
    icon: Banknote,
    color: "text-lime-400",
    category: "Payroll & HR"
  },
  {
    title: "ROE Generation",
    description: "Generate Record of Employment documents when employees leave. CRA-compliant ROE data export saves you time and ensures accuracy for Employment Insurance claims.",
    icon: FileCheck,
    color: "text-amber-400",
    category: "Payroll & HR"
  },
  {
    title: "T4 Generation",
    description: "Generate T4 slips for all employees at year-end. Batch processing, CRA-compliant formatting, and PDF export. Save hours of manual work every tax season.",
    icon: FileCheck,
    color: "text-rose-400",
    category: "Payroll & HR"
  },
  // Tax & Compliance
  {
    title: "HST & Tax Reports",
    description: "Generate HST reports and financial statements to support your CRA filings. P&L statements, retained earnings, and HST summaries, all formatted for your accountant or direct filing.",
    icon: FileText,
    color: "text-violet-400",
    category: "Tax & Compliance"
  },
  {
    title: "Free Income Tax Calculator",
    description: "Estimate your 2026 Canadian take-home pay for free. No account needed. Ontario federal and provincial brackets, CPP, EI, and the Ontario Health Premium. Try it from the Tax Calculator link in the nav.",
    icon: Calculator,
    color: "text-fuchsia-400",
    category: "Tax & Compliance"
  },
  {
    title: "Salary vs Dividend Planner",
    description: "Compare salary vs. dividends in real-time inside Cashual. See the tax impact of different compensation strategies and optimize how you pay yourself.",
    icon: DollarSign,
    color: "text-purple-400",
    category: "Tax & Compliance"
  },
  {
    title: "Dividend Management",
    description: "Issue dividends with proper documentation. Auto-generate T5 slips and board resolutions, and stay compliant without the paperwork. Ideal for incorporated contractors optimizing their tax structure.",
    icon: PieChart,
    color: "text-golden-hour",
    category: "Tax & Compliance"
  },
  {
    title: "Owner Reimbursement",
    description: "Track owner payments and reimbursements separately from dividends. Keep clear records of personal expenses paid by the company. Essential for proper corporate accounting.",
    icon: CreditCard,
    color: "text-sky-400",
    category: "Tax & Compliance"
  },
  // Business Management
  {
    title: "Financial Reports",
    description: "Generate comprehensive financial reports on demand. Profit & Loss, Balance Sheet, Cash Flow: all the reports you need to understand your business health and make informed decisions.",
    icon: TrendingUp,
    color: "text-emerald-500",
    category: "Business Management"
  },
  {
    title: "Dashboard Overview",
    description: "See your business health at a glance. Revenue, expenses, outstanding invoices, HST owed, available dividends: all in one beautiful dashboard. Make decisions faster with real-time insights.",
    icon: TrendingUp,
    color: "text-green-500",
    category: "Business Management"
  }
];

export const Features = () => {
  // Group features by category
  const featuresByCategory = features.reduce((acc, feature) => {
    const category = feature.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(feature);
    return acc;
  }, {} as Record<string, typeof features>);

  const categories = Object.keys(featuresByCategory);

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
            Stop juggling spreadsheets and expensive accountant fees. Cashual brings accounting, payroll, time tracking, tax documents, and expense management into one powerful platform. 
            Built for Canadian businesses, especially incorporated contractors.
          </p>
        </div>

        {categories.map((category, categoryIndex) => (
          <div key={category} className="mb-16">
            <motion.h3
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-2xl md:text-3xl font-bold text-white mb-8 text-center"
            >
              {category}
            </motion.h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {featuresByCategory[category].map((feature, index) => (
                <motion.div
                  key={`${category}-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: (categoryIndex * 0.1) + (index * 0.05), duration: 0.5 }}
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
        ))}
      </div>
    </section>
  );
};
