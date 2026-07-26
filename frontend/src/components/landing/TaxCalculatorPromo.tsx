import { Link } from 'react-router-dom';
import { Calculator } from 'lucide-react';
import { Button } from '../ui/Button';

export const TaxCalculatorPromo = () => {
  return (
    <section
      className="py-20 relative"
      aria-labelledby="tax-calculator-promo-heading"
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="glass-emerald rounded-2xl border border-neon-emerald/20 p-8 md:p-12 flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
          <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-neon-emerald/15 flex items-center justify-center">
            <Calculator className="w-8 h-8 text-neon-emerald" aria-hidden="true" />
          </div>
          <div className="flex-1 text-center lg:text-left">
            <p className="text-neon-emerald font-medium text-sm tracking-wide uppercase mb-2">
              Free tool. No account required
            </p>
            <h2
              id="tax-calculator-promo-heading"
              className="text-2xl md:text-3xl font-bold text-white mb-3"
            >
              2026 Canadian Income Tax Calculator
            </h2>
            <p className="text-slate-400 text-base md:text-lg max-w-2xl">
              Estimate your Ontario take-home pay with 2026 federal and provincial brackets,
              CPP, EI, and the Ontario Health Premium. Built for Canadian employees and
              business owners planning salary.
            </p>
          </div>
          <div className="flex-shrink-0">
            <Link to="/tax-calculator">
              <Button variant="cta" size="lg" className="group">
                Try the Tax Calculator
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
