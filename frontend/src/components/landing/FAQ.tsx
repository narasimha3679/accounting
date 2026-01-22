import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import Card from '../ui/Card';

const faqs = [
  {
    question: "Is Cashual CRA compliant?",
    answer: "Cashual is designed around CRA rules for Canadian small businesses, with a focus on HST, corporate accounting, and reporting. The app helps you stay organized with invoicing, expenses, HST tracking, payroll with automatic tax deductions (CPP/EI/income tax), and automated T4/T5/ROE generation. All calculations follow current CRA guidelines. We still recommend working with a professional accountant for final filings and complex tax situations."
  },
  {
    question: "Can I track employee hours and schedules?",
    answer: "Yes! Cashual includes comprehensive time management. Employees can submit timesheets, managers can approve them with one click, and you can schedule shifts using calendar views. All time data integrates with payroll for accurate pay calculations. The system supports both employee-submitted time entries and manager-assigned schedules."
  },
  {
    question: "What features are included?",
    answer: "Cashual includes everything you need: invoice management, income and expense tracking, capital asset management, client management, investment tracking, employee management with self-service portal, salary tracking, time & attendance, pay runs with automatic tax calculations, payroll reports, CRA remittances, T4/T5/ROE generation, dividend management, owner reimbursement tracking, Canadian tax compliance, tax planning calculator, and comprehensive financial reports (P&L, Balance Sheet, Cash Flow). All features are included in one simple price—no add-ons or per-employee fees."
  },
  {
    question: "How does pricing work?",
    answer: "Cashual offers simple, transparent pricing: $5 per month or $50 per year (save 17% with annual billing). This includes all features—accounting, payroll, tax documents, and employee management. No hidden fees, no per-employee charges. Cancel anytime with no long-term commitments."
  },
  {
    question: "Can I cancel anytime?",
    answer: "Yes, absolutely! You can cancel your subscription at any time with no penalties or fees. Cancellations take effect at the end of your current billing period. Since we offer one simple plan with all features included, there's no need to upgrade or downgrade—everything is available from day one."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards and debit cards. Payment is processed securely through our payment provider. You can choose monthly billing at $5/month or save 17% with annual billing at $50/year.’ll "
  },
  {
    question: "Can I import data from other accounting systems?",
    answer: "Yes, we're working on import capabilities for common accounting formats. Currently, you can manually enter your data, and we're developing CSV import features for transactions, employee data, and historical records. If you need to migrate from a specific system, contact our support team for assistance."
  },
  {
    question: "What if I need help or have questions?",
    answer: "We offer comprehensive support through multiple channels. You can access our knowledge base, contact support via email, or schedule a one-on-one onboarding call. We're responsive to feedback and feature requests. Our goal is to make sure you're successful with Cashual."
  },
  {
    question: "Is my data secure?",
    answer: "Security is our top priority. We use bank-level encryption, secure data storage, and follow industry best practices for data protection. Your financial data is encrypted both in transit and at rest. We're compliant with Canadian privacy laws (PIPEDA) and never share your data with third parties."
  },
  {
    question: "Can I use Cashual for multiple companies?",
    answer: "Right now, Cashual is focused on managing one company per account, which keeps things simple while we refine the core experience. Multi-company support is on our roadmap so that consultants and contractors with multiple corporations can manage them in one place. If multi-company support is critical for you, please reach out—we’re actively shaping this part of the product based on user feedback."
  },
  {
    question: "Do I need accounting knowledge to use Cashual?",
    answer: "No accounting degree required! Cashual is designed to be intuitive for business owners who aren't accountants. We provide clear guidance, helpful tooltips, and automatic calculations. However, for complex tax situations, we always recommend consulting with a professional accountant."
  },
  {
    question: "What happens if I make a mistake?",
    answer: "Cashual makes it easy to correct mistakes. You can edit payroll runs, adjust employee information, and regenerate documents as needed. We also maintain an audit trail so you can see what changed and when. If you've already submitted documents to the CRA, we provide guidance on how to file corrections."
  }
];

export const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-24 relative" aria-labelledby="faq-heading">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2
            id="faq-heading"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-bold text-white mb-6"
          >
            Frequently Asked <span className="text-neon-emerald">Questions</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 text-lg"
          >
            Everything you need to know about Cashual. Can't find what you're looking for? Contact our support team.
          </motion.p>
        </div>

        <div className="max-w-3xl mx-auto space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="overflow-hidden hover:border-white/20 hover:shadow-lg transition-all duration-300 group" glass="light">
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full text-left flex items-center justify-between gap-4 p-6 focus:outline-none focus:ring-2 focus:ring-neon-emerald focus:ring-inset rounded-xl hover:bg-white/5 transition-colors"
                  aria-expanded={openIndex === index}
                  aria-controls={`faq-answer-${index}`}
                >
                  <h3 className="text-lg font-semibold text-white pr-8 group-hover:text-neon-emerald transition-colors">
                    {faq.question}
                  </h3>
                  <ChevronDown
                    className={`w-5 h-5 text-neon-emerald flex-shrink-0 transition-transform duration-300 ${
                      openIndex === index ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>
                <AnimatePresence>
                  {openIndex === index && (
                    <motion.div
                      id={`faq-answer-${index}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 pt-0">
                        <p className="text-slate-300 leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
