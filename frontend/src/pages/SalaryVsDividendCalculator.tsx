import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { PiggyBank, TrendingUp, Landmark, Wallet, Sparkles } from 'lucide-react';
import { Navbar } from '../components/landing/Navbar';
import { Footer } from '../components/landing/Footer';
import { BackToTop } from '../components/landing/BackToTop';
import {
  compareSalaryVsDividend,
  SMALL_BUSINESS_TAX_RATE_2026,
} from '../lib/salaryVsDividendEngine';

const PRESET_AMOUNTS = [60000, 80000, 100000, 150000, 200000];

const FAQ_ITEMS = [
  {
    question: 'Should I pay myself salary or dividends from my corporation in Ontario?',
    answer:
      'It depends on your goals. Dividends usually leave slightly more cash in your pocket today because they avoid CPP contributions, but salary builds RRSP contribution room, CPP retirement benefits, and counts as income for mortgage applications. Most owner-managers end up with a personalized mix of both rather than 100% of either.',
  },
  {
    question: 'Why is there no CPP or EI on dividends?',
    answer:
      'Dividends are investment income paid to you as a shareholder, not employment income, so no CPP contributions apply. Owner-managers who control more than 40% of voting shares are also exempt from EI on salary, which is why this calculator excludes EI from both sides.',
  },
  {
    question: 'What is a non-eligible dividend?',
    answer:
      'Non-eligible dividends are paid from corporate income taxed at the small business rate (11.7% combined federal and Ontario in 2026 on the first $500,000). They are grossed up by 15% on your personal return and offset by federal (9.0301%) and Ontario (2.9863%) dividend tax credits.',
  },
  {
    question: 'Is the salary vs dividend decision really all-or-nothing?',
    answer:
      'No — and that is the key insight. The optimal strategy is usually a mix: for example, enough salary to maximize CPP or RRSP room, with the remainder as dividends. The best split depends on your corporate profit, other income, RDTOH balance, and retirement goals, which is exactly what the full Cashual optimizer models.',
  },
];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));

const formatPercent = (rate: number) => rate.toFixed(1) + '%';

interface RowProps {
  label: string;
  value: number;
  negative?: boolean;
  muted?: boolean;
}

function BreakdownRow({ label, value, negative = false, muted = false }: RowProps) {
  return (
    <div className="flex justify-between items-center py-2">
      <span className={muted ? 'text-slate-muted/70 text-sm' : 'text-slate-muted'}>{label}</span>
      <span
        className={`tabular-nums ${
          negative ? 'text-destructive' : muted ? 'text-slate-muted' : 'text-white'
        }`}
      >
        {negative ? '- ' : ''}
        {formatCurrency(value)}
      </span>
    </div>
  );
}

export default function SalaryVsDividendCalculator() {
  const [inputValue, setInputValue] = useState('100000');

  const parsedProfit = parseFloat(inputValue.replace(/,/g, '')) || 0;

  const result = useMemo(() => compareSalaryVsDividend(parsedProfit), [parsedProfit]);

  const { salary, dividend, dividendCashAdvantage } = result;
  const dividendWins = dividendCashAdvantage > 0;
  const advantageAbs = Math.abs(dividendCashAdvantage);

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };

  const webAppJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Cashual Salary vs Dividend Calculator',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    url: 'https://cashual.org/salary-vs-dividend-calculator',
    description:
      'Free 2026 salary vs dividend calculator for Ontario incorporated business owners. Compare take-home cash, taxes, CPP, and RRSP room side by side.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'CAD' },
    provider: {
      '@type': 'Organization',
      name: 'Cashual',
      url: 'https://cashual.org',
      email: 'info@cashual.org',
    },
    featureList: [
      'Side-by-side salary vs non-eligible dividend comparison',
      '2026 Ontario and federal tax brackets',
      'Small business corporate tax (11.7% combined)',
      'Dividend gross-up and tax credits',
      'CPP contributions and RRSP room impact',
    ],
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://cashual.org/' },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Salary vs Dividend Calculator',
        item: 'https://cashual.org/salary-vs-dividend-calculator',
      },
    ],
  };

  return (
    <div className="min-h-screen bg-deep-forest text-white selection:bg-neon-emerald/30 selection:text-white flex flex-col">
      <Helmet>
        <title>
          Salary vs Dividend Calculator 2026 (Ontario) | Free Side-by-Side Comparison | Cashual
        </title>
        <meta
          name="description"
          content="Free 2026 salary vs dividend calculator for Ontario incorporated business owners. See take-home cash, corporate tax, personal tax, CPP, and RRSP room side by side. No signup required."
        />
        <meta
          name="keywords"
          content="salary vs dividend calculator, salary or dividends Canada, pay myself from corporation, non-eligible dividends Ontario, owner manager compensation, CCPC salary dividend, dividend tax calculator 2026, incorporated contractor pay"
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://cashual.org/salary-vs-dividend-calculator" />

        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Cashual" />
        <meta
          property="og:title"
          content="Salary vs Dividend Calculator 2026 | Free Ontario Comparison"
        />
        <meta
          property="og:description"
          content="Compare paying yourself salary vs dividends from your Ontario corporation. Side-by-side take-home cash, taxes, CPP, and RRSP room. Free — no account required."
        />
        <meta property="og:url" content="https://cashual.org/salary-vs-dividend-calculator" />
        <meta property="og:image" content="https://cashual.org/og-image.png" />
        <meta property="og:locale" content="en_CA" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Salary vs Dividend Calculator 2026 | Cashual" />
        <meta
          name="twitter:description"
          content="Free side-by-side salary vs dividend comparison for Ontario incorporated business owners."
        />
        <meta name="twitter:image" content="https://cashual.org/og-image.png" />

        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(webAppJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</script>
      </Helmet>

      <Navbar />

      <main id="main-content" className="flex-1 w-full pt-28 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Salary vs{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-emerald to-golden-hour">
                Dividend
              </span>{' '}
              Calculator
            </h1>
            <p className="text-lg text-slate-muted max-w-2xl mx-auto">
              Incorporated in Ontario? See exactly what lands in your pocket in 2026 if you pay
              yourself all salary vs all non-eligible dividends — from the same corporate profit.
            </p>
          </div>

          {/* Input */}
          <div className="max-w-xl mx-auto mb-10 glass-emerald p-6 md:p-8 rounded-2xl border border-neon-emerald/20 shadow-[0_0_40px_rgba(52,211,153,0.1)]">
            <label
              htmlFor="corporate-profit"
              className="block text-sm font-medium text-slate-muted mb-2"
            >
              Corporate pre-tax profit available to pay yourself (annual)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-muted">$</span>
              <input
                id="corporate-profit"
                type="number"
                min="0"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="input w-full pl-8 bg-charcoal/50 tabular-nums text-lg"
                placeholder="100000"
              />
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {PRESET_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setInputValue(String(amount))}
                  className={`py-1.5 px-3 text-sm font-medium rounded-md transition-all tabular-nums ${
                    parsedProfit === amount
                      ? 'bg-neon-emerald/20 text-neon-emerald border border-neon-emerald/40'
                      : 'bg-charcoal/40 text-slate-muted border border-white/5 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {formatCurrency(amount)}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-muted mt-4">
              This is your corporation's profit before paying you — the same pot funds either
              route. Assumes you own more than 40% of voting shares (EI-exempt) and this is your
              only personal income.
            </p>
          </div>

          {/* Winner banner */}
          {parsedProfit > 0 && (
            <motion.div
              key={`${dividendWins}-${Math.round(advantageAbs / 500)}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="max-w-3xl mx-auto mb-10 text-center glass rounded-2xl border border-golden-hour/20 p-5"
            >
              <p className="text-lg">
                <span className="font-bold text-golden-hour">
                  {dividendWins ? 'Dividends' : 'Salary'}
                </span>{' '}
                put{' '}
                <span className="font-bold text-neon-emerald tabular-nums">
                  {formatCurrency(advantageAbs)}
                </span>{' '}
                more cash in your pocket this year — but that's not the whole story.
              </p>
              <p className="text-sm text-slate-muted mt-2">
                Salary builds {formatCurrency(salary.rrspRoomGenerated)} of RRSP room and{' '}
                {formatCurrency(salary.totalCppContributions)} of CPP retirement contributions that
                the dividend route skips entirely.
              </p>
            </motion.div>
          )}

          {/* Side-by-side comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Salary route */}
            <div className="glass p-6 md:p-8 rounded-2xl border border-white/5 relative overflow-hidden">
              <div className="absolute -top-40 -left-40 w-80 h-80 bg-neon-emerald/10 blur-[100px] rounded-full pointer-events-none" />
              <div className="flex items-center gap-3 mb-6">
                <span className="w-10 h-10 rounded-xl bg-neon-emerald/15 text-neon-emerald flex items-center justify-center">
                  <Landmark className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">100% Salary</h2>
                  <p className="text-xs text-slate-muted">Paid as employment income (T4)</p>
                </div>
              </div>

              <div className="space-y-1 font-mono text-[15px]">
                <BreakdownRow label="Corporate pre-tax profit" value={salary.corporateProfit} />
                <BreakdownRow label="Employer CPP (paid by corp)" value={salary.employerCpp} negative />
                <div className="flex justify-between items-center py-2 border-t border-white/10">
                  <span className="text-slate-muted">Gross salary to you</span>
                  <span className="text-white tabular-nums">
                    {formatCurrency(salary.grossSalary)}
                  </span>
                </div>
                <BreakdownRow label="Federal tax" value={salary.personal.federalTax} negative />
                <BreakdownRow label="Ontario tax" value={salary.personal.provincialTax} negative />
                <BreakdownRow
                  label="Ontario Health Premium"
                  value={salary.personal.ontarioHealthPremium}
                  negative
                />
                <BreakdownRow
                  label="Employee CPP + CPP2"
                  value={salary.personal.cppDeduction + salary.personal.cpp2Deduction}
                  negative
                />
                <BreakdownRow label="EI (owner-manager exempt)" value={0} muted />

                <div className="flex justify-between items-center py-4 border-t border-b border-white/10 my-2">
                  <span className="text-white font-bold">Cash in your pocket</span>
                  <span className="text-neon-emerald font-bold text-2xl tabular-nums">
                    {formatCurrency(salary.netCash)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 pt-3">
                  <span className="text-slate-muted">Effective rate on profit</span>
                  <span className="text-white tabular-nums">
                    {formatPercent(salary.effectiveRate)}
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-white/5 space-y-3">
                <div className="flex items-start gap-3 text-sm">
                  <PiggyBank className="w-4 h-4 text-neon-emerald mt-0.5 flex-shrink-0" />
                  <span className="text-slate-muted">
                    Builds{' '}
                    <span className="text-white font-medium tabular-nums">
                      {formatCurrency(salary.rrspRoomGenerated)}
                    </span>{' '}
                    of new RRSP contribution room
                  </span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <TrendingUp className="w-4 h-4 text-neon-emerald mt-0.5 flex-shrink-0" />
                  <span className="text-slate-muted">
                    <span className="text-white font-medium tabular-nums">
                      {formatCurrency(salary.totalCppContributions)}
                    </span>{' '}
                    toward CPP — a real, indexed retirement pension
                  </span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Wallet className="w-4 h-4 text-neon-emerald mt-0.5 flex-shrink-0" />
                  <span className="text-slate-muted">
                    T4 income that mortgage lenders love to see
                  </span>
                </div>
              </div>
            </div>

            {/* Dividend route */}
            <div className="glass p-6 md:p-8 rounded-2xl border border-white/5 relative overflow-hidden">
              <div className="absolute -top-40 -right-40 w-80 h-80 bg-golden-hour/10 blur-[100px] rounded-full pointer-events-none" />
              <div className="flex items-center gap-3 mb-6">
                <span className="w-10 h-10 rounded-xl bg-golden-hour/15 text-golden-hour flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">100% Dividends</h2>
                  <p className="text-xs text-slate-muted">Paid as non-eligible dividends (T5)</p>
                </div>
              </div>

              <div className="space-y-1 font-mono text-[15px]">
                <BreakdownRow label="Corporate pre-tax profit" value={dividend.corporateProfit} />
                <BreakdownRow
                  label={`Corporate tax (${(SMALL_BUSINESS_TAX_RATE_2026 * 100).toFixed(1)}% small business rate)`}
                  value={dividend.corporateTax}
                  negative
                />
                <div className="flex justify-between items-center py-2 border-t border-white/10">
                  <span className="text-slate-muted">Dividend paid to you</span>
                  <span className="text-white tabular-nums">
                    {formatCurrency(dividend.dividendPaid)}
                  </span>
                </div>
                <BreakdownRow
                  label="Federal tax (after credit)"
                  value={dividend.personal.federalTax}
                  negative
                />
                <BreakdownRow
                  label="Ontario tax (after credit)"
                  value={dividend.personal.provincialTax}
                  negative
                />
                <BreakdownRow
                  label="Ontario Health Premium"
                  value={dividend.personal.ontarioHealthPremium}
                  negative
                />
                <BreakdownRow label="CPP (none on dividends)" value={0} muted />
                <BreakdownRow label="EI (none on dividends)" value={0} muted />

                <div className="flex justify-between items-center py-4 border-t border-b border-white/10 my-2">
                  <span className="text-white font-bold">Cash in your pocket</span>
                  <span className="text-golden-hour font-bold text-2xl tabular-nums">
                    {formatCurrency(dividend.netCash)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 pt-3">
                  <span className="text-slate-muted">Effective rate on profit</span>
                  <span className="text-white tabular-nums">
                    {formatPercent(dividend.effectiveRate)}
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-white/5 space-y-3">
                <div className="flex items-start gap-3 text-sm">
                  <Wallet className="w-4 h-4 text-golden-hour mt-0.5 flex-shrink-0" />
                  <span className="text-slate-muted">
                    No CPP contributions — more cash now, but no pension building
                  </span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <PiggyBank className="w-4 h-4 text-golden-hour mt-0.5 flex-shrink-0" />
                  <span className="text-slate-muted">
                    Generates <span className="text-white font-medium">$0</span> of RRSP room —
                    dividends aren't "earned income"
                  </span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <TrendingUp className="w-4 h-4 text-golden-hour mt-0.5 flex-shrink-0" />
                  <span className="text-slate-muted">
                    Simpler payroll — no source deductions or remittances
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-12 max-w-3xl mx-auto glass-emerald rounded-2xl border border-neon-emerald/20 p-8 md:p-10 text-center relative overflow-hidden">
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-64 bg-neon-emerald/10 blur-[100px] rounded-full pointer-events-none" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 text-neon-emerald text-sm font-medium tracking-wide uppercase mb-3">
                <Sparkles className="w-4 h-4" />
                The real answer is a mix
              </div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
                100% of either is almost never optimal
              </h2>
              <p className="text-slate-muted max-w-xl mx-auto mb-6">
                Cashual's optimizer finds your personalized salary + dividend split — factoring in
                your other income, RRSP and CPP goals, RDTOH balance, and target take-home cash.
                Then it handles the payroll, T4s, T5s, and board minutes for you.
              </p>
              <a
                href="/onboarding/company"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-emerald focus-visible:ring-offset-2 focus-visible:ring-offset-deep-forest disabled:pointer-events-none disabled:opacity-50 bg-gradient-to-r from-neon-emerald to-golden-hour text-deep-forest hover:opacity-90 glow-emerald font-bold h-11 px-8 w-full sm:w-auto"
              >
                Find My Optimal Mix — Free
              </a>
              <p className="text-xs text-slate-muted mt-4">
                Also try our{' '}
                <Link to="/tax-calculator" className="text-neon-emerald hover:underline">
                  free income tax calculator
                </Link>
                .
              </p>
            </div>
          </div>

          {/* Assumptions */}
          <p className="text-xs text-slate-muted text-center max-w-2xl mx-auto mt-8">
            * Estimates based on 2026 Ontario and federal tax brackets, the prorated 11.7% combined
            small business corporate tax rate, 15% non-eligible dividend gross-up with federal
            (9.0301%) and Ontario (2.9863%) dividend tax credits, CPP/CPP2, and basic personal
            amounts. Assumes no other personal income and EI-exempt owner-manager. For estimation
            purposes only — not tax advice.
          </p>

          {/* FAQ */}
          <section className="mt-16 max-w-3xl mx-auto">
            <h2 className="text-2xl font-semibold tracking-tight text-center mb-8">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {FAQ_ITEMS.map((item) => (
                <details
                  key={item.question}
                  className="glass rounded-xl border border-white/5 p-5 group"
                >
                  <summary className="cursor-pointer font-medium text-white list-none flex justify-between items-center gap-4">
                    {item.question}
                    <span className="text-neon-emerald transition-transform group-open:rotate-45 text-xl leading-none">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm text-slate-muted leading-relaxed">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </main>

      <Footer />
      <BackToTop />
    </div>
  );
}
