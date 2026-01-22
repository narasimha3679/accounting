import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import Card from '../ui/Card';

const comparisonData = [
  // Core Platform
  {
    feature: "Accounting + Payroll",
    cashual: { value: true, note: "Integrated platform available now" },
    quickbooks: { value: false, note: "Separate products" },
    wave: { value: false, note: "No payroll" },
    xero: { value: false, note: "Add-on required" }
  },
  {
    feature: "Free Tier",
    cashual: { value: true, note: "Full accounting forever" },
    quickbooks: { value: false, note: "Starts at $50/month" },
    wave: { value: true, note: "With ads, limited features" },
    xero: { value: false, note: "Starts at $15/month" }
  },
  // Core Accounting Features
  {
    feature: "Invoice Management",
    cashual: { value: true, note: "Create and track invoices" },
    quickbooks: { value: true, note: "Available" },
    wave: { value: true, note: "Available" },
    xero: { value: true, note: "Available" }
  },
  {
    feature: "Income Tracking",
    cashual: { value: true, note: "Categorize and track all income" },
    quickbooks: { value: true, note: "Available" },
    wave: { value: true, note: "Available" },
    xero: { value: true, note: "Available" }
  },
  {
    feature: "Expense Tracking",
    cashual: { value: true, note: "Receipt capture and categorization" },
    quickbooks: { value: true, note: "Available" },
    wave: { value: true, note: "Available" },
    xero: { value: true, note: "Available" }
  },
  {
    feature: "Capital Assets",
    cashual: { value: true, note: "Asset tracking with depreciation" },
    quickbooks: { value: true, note: "Available" },
    wave: { value: "partial", note: "Limited features" },
    xero: { value: true, note: "Available" }
  },
  {
    feature: "Client Management",
    cashual: { value: true, note: "Organize client information" },
    quickbooks: { value: true, note: "Available" },
    wave: { value: true, note: "Available" },
    xero: { value: true, note: "Available" }
  },
  {
    feature: "Investment Tracking",
    cashual: { value: true, note: "Corporate investment tracking" },
    quickbooks: { value: false, note: "Not available" },
    wave: { value: false, note: "Not available" },
    xero: { value: false, note: "Not available" }
  },
  // Payroll & HR Features
  {
    feature: "Employee Management",
    cashual: { value: true, note: "Full employee management system" },
    quickbooks: { value: "partial", note: "Payroll add-on required" },
    wave: { value: false, note: "Not available" },
    xero: { value: "partial", note: "Payroll add-on required" }
  },
  {
    feature: "Employee Self-Service Portal",
    cashual: { value: true, note: "Employee dashboard with time tracking" },
    quickbooks: { value: "partial", note: "Limited features" },
    wave: { value: false, note: "Not available" },
    xero: { value: "partial", note: "Add-on required" }
  },
  {
    feature: "Salary Tracking",
    cashual: { value: true, note: "Track employee compensation" },
    quickbooks: { value: "partial", note: "Payroll add-on required" },
    wave: { value: false, note: "Not available" },
    xero: { value: "partial", note: "Payroll add-on required" }
  },
  {
    feature: "Time & Attendance",
    cashual: { value: true, note: "Full time tracking and scheduling" },
    quickbooks: { value: "partial", note: "Add-on required" },
    wave: { value: false, note: "Not available" },
    xero: { value: "partial", note: "Add-on required" }
  },
  {
    feature: "Pay Runs",
    cashual: { value: true, note: "Process payroll with tax calculations" },
    quickbooks: { value: "partial", note: "Payroll add-on required" },
    wave: { value: false, note: "Not available" },
    xero: { value: "partial", note: "Payroll add-on required" }
  },
  {
    feature: "Payroll Reports",
    cashual: { value: true, note: "Comprehensive payroll reporting" },
    quickbooks: { value: "partial", note: "Payroll add-on required" },
    wave: { value: false, note: "Not available" },
    xero: { value: "partial", note: "Payroll add-on required" }
  },
  {
    feature: "CRA Remittances",
    cashual: { value: true, note: "Automatic remittance tracking" },
    quickbooks: { value: "partial", note: "Payroll add-on required" },
    wave: { value: false, note: "Not available" },
    xero: { value: "partial", note: "Payroll add-on required" }
  },
  {
    feature: "T4/T5/ROE Generation",
    cashual: { value: true, note: "T4, T5, and ROE generation available" },
    quickbooks: { value: "partial", note: "Limited support" },
    wave: { value: false, note: "Not available" },
    xero: { value: "partial", note: "Add-on required" }
  },
  // Tax & Compliance Features
  {
    feature: "Canadian Tax Compliance",
    cashual: { value: true, note: "Built-in from day one" },
    quickbooks: { value: "partial", note: "Add-ons required" },
    wave: { value: "partial", note: "Limited features" },
    xero: { value: "partial", note: "Add-ons required" }
  },
  {
    feature: "Tax Planning Calculator",
    cashual: { value: true, note: "Salary vs. dividend calculator" },
    quickbooks: { value: false, note: "Not available" },
    wave: { value: false, note: "Not available" },
    xero: { value: false, note: "Not available" }
  },
  {
    feature: "Dividend Management",
    cashual: { value: true, note: "Issue dividends with T5 generation" },
    quickbooks: { value: false, note: "Not available" },
    wave: { value: false, note: "Not available" },
    xero: { value: false, note: "Not available" }
  },
  {
    feature: "Owner Reimbursement Tracking",
    cashual: { value: true, note: "Owner payment tracking available" },
    quickbooks: { value: false, note: "Not available" },
    wave: { value: false, note: "Not available" },
    xero: { value: false, note: "Not available" }
  },
  // Business Management Features
  {
    feature: "Financial Reports",
    cashual: { value: true, note: "P&L, Balance Sheet, Cash Flow" },
    quickbooks: { value: true, note: "Available" },
    wave: { value: true, note: "Available" },
    xero: { value: true, note: "Available" }
  },
  {
    feature: "Dashboard Overview",
    cashual: { value: true, note: "Real-time business insights" },
    quickbooks: { value: true, note: "Available" },
    wave: { value: true, note: "Available" },
    xero: { value: true, note: "Available" }
  },
  // Pricing
  {
    feature: "Cost (10 employees with payroll)",
    cashual: { value: "$5/month", note: "Everything included, unlimited employees" },
    quickbooks: { value: "$150/month", note: "$100 accounting + $50 payroll" },
    wave: { value: "Free", note: "But no payroll available" },
    xero: { value: "$50/month", note: "$40 accounting + $10 payroll add-on" }
  }
];

export const Comparison = () => {
  const renderValue = (value: boolean | string | null) => {
    if (value === true) {
      return <Check className="w-5 h-5 text-neon-emerald mx-auto" />;
    }
    if (value === false) {
      return <X className="w-5 h-5 text-red-400 mx-auto" />;
    }
    if (value === "partial") {
      return <span className="text-slate-400 text-xs">Partial</span>;
    }
    if (typeof value === "string") {
      return <span className="text-white font-semibold text-sm">{value}</span>;
    }
    return <span className="text-slate-500">—</span>;
  };

  return (
    <section 
      id="comparison" 
      className="py-24 relative"
      role="region"
      aria-labelledby="comparison-heading"
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2
            id="comparison-heading"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-bold text-white mb-6"
          >
            How We <span className="text-neon-emerald">Compare</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 text-lg mb-2"
          >
            See how Cashual stacks up against popular alternatives. Based on standard pricing for small businesses.
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="text-slate-500 text-sm"
          >
            Most platforms require separate tools for accounting and payroll—we offer everything in one integrated platform.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <Card className="overflow-hidden" glass="light">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-4 px-6 text-white font-semibold">Feature</th>
                    <th className="text-center py-4 px-6 text-neon-emerald font-semibold bg-neon-emerald/5">
                      Cashual
                    </th>
                    <th className="text-center py-4 px-6 text-slate-400 font-semibold">QuickBooks</th>
                    <th className="text-center py-4 px-6 text-slate-400 font-semibold">Wave</th>
                    <th className="text-center py-4 px-6 text-slate-400 font-semibold">Xero</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((row, index) => (
                    <tr 
                      key={index} 
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-4 px-6 text-slate-300">
                        <div className="font-medium">{row.feature}</div>
                      </td>
                      <td className="py-4 px-6 text-center bg-neon-emerald/5">
                        <div className="flex flex-col items-center gap-1">
                          {renderValue(row.cashual.value)}
                          {row.cashual.note && (
                            <div className="text-xs text-slate-500 mt-1 max-w-[120px]">{row.cashual.note}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {renderValue(row.quickbooks.value)}
                          {row.quickbooks.note && (
                            <div className="text-xs text-slate-500 mt-1 max-w-[120px]">{row.quickbooks.note}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {renderValue(row.wave.value)}
                          {row.wave.note && (
                            <div className="text-xs text-slate-500 mt-1 max-w-[120px]">{row.wave.note}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {renderValue(row.xero.value)}
                          {row.xero.note && (
                            <div className="text-xs text-slate-500 mt-1 max-w-[120px]">{row.xero.note}</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Key Differentiator */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-8 text-center"
          >
            <Card glass="light" className="p-6 border border-white/10">
              <div className="max-w-2xl mx-auto">
                <h3 className="text-xl font-bold text-white mb-3">
                  One Platform, Everything You Need
                </h3>
                <p className="text-slate-300 text-sm">
                  Many businesses use multiple tools to manage their finances. Cashual offers everything—accounting, payroll, 
                  compliance, and employee management—in one integrated platform, built specifically for Canadian businesses.
                </p>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
