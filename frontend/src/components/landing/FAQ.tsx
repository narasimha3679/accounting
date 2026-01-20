import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import Card from '../ui/Card';

const faqs = [
  {
    question: "Is Cashual CRA compliant?",
    answer: "Yes, absolutely. Cashual's tax calculations and document generation are built to meet all Canada Revenue Agency requirements. Our system automatically handles CPP, EI, income tax, and provincial tax calculations according to current CRA guidelines. All generated documents (T4s, T5s, ROEs) are formatted to CRA specifications."
  },
  {
    question: "How does pricing work after the beta period?",
    answer: "During our public beta, Cashual is completely free. After the beta period ends, we'll introduce transparent, affordable pricing designed for small businesses. Beta users will receive special early-adopter pricing. We'll announce pricing details well in advance, and you can cancel anytime with no long-term commitments."
  },
  {
    question: "Can I import data from other accounting systems?",
    answer: "Yes, we're working on import capabilities for common accounting formats. Currently, you can manually enter your data, and we're developing CSV import features for transactions, employee data, and historical records. If you need to migrate from a specific system, contact our support team for assistance."
  },
  {
    question: "What if I need help or have questions?",
    answer: "We offer comprehensive support through multiple channels. You can access our knowledge base, contact support via email, or schedule a one-on-one onboarding call. During beta, we're especially responsive to feedback and feature requests. Our goal is to make sure you're successful with Cashual."
  },
  {
    question: "Is my data secure?",
    answer: "Security is our top priority. We use bank-level encryption, secure data storage, and follow industry best practices for data protection. Your financial data is encrypted both in transit and at rest. We're compliant with Canadian privacy laws (PIPEDA) and never share your data with third parties."
  },
  {
    question: "Can I use Cashual for multiple companies?",
    answer: "Yes, Cashual supports multiple companies. You can manage payroll, expenses, and tax documents for multiple businesses from a single account. Each company maintains separate records, employees, and financial data. This is especially useful for consultants or contractors who operate multiple incorporated entities."
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
