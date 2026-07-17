import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Navbar } from '../components/landing/Navbar';
import { Footer } from '../components/landing/Footer';
import { BackToTop } from '../components/landing/BackToTop';
import {
  calculateTaxes,
  convertTaxResult,
  periodsPerYear,
  type TaxPeriod,
} from '../lib/canadaTaxEngine';

const PERIOD_LABELS: Record<TaxPeriod, string> = {
  annual: 'Annual',
  monthly: 'Monthly',
  'bi-weekly': 'Bi-weekly',
  weekly: 'Weekly',
  daily: 'Daily',
  hourly: 'Hourly',
};

const PROVINCES = [
  { id: 'ON', name: 'Ontario' },
  // Additional provinces can be added here
];

const INCOME_TYPES = [
  { id: 'salary', name: 'Salary' },
  { id: 'dividend_eligible', name: 'Eligible Dividend' },
  { id: 'dividend_non_eligible', name: 'Non-Eligible Dividend' },
];

const FAQ_ITEMS = [
  {
    question: 'How much tax do I pay on a $100,000 salary in Ontario in 2026?',
    answer:
      'On a $100,000 annual salary in Ontario in 2026, you pay federal income tax, Ontario provincial tax, CPP and CPP2 contributions, EI premiums, and the Ontario Health Premium. Your total deductions are roughly $26,000, leaving an estimated take-home pay of about $74,000 per year.',
  },
  {
    question: 'What are the 2026 federal tax brackets in Canada?',
    answer:
      'For 2026, the federal tax rates are 14% on taxable income up to $58,523, 20.5% up to $117,045, 26% up to $181,440, 29% up to $258,482, and 33% above that.',
  },
  {
    question: 'What are the 2026 Ontario provincial tax brackets?',
    answer:
      'For 2026, Ontario taxes 5.05% on taxable income up to $53,891, 9.15% up to $107,785, 11.16% up to $150,000, 12.16% up to $220,000, and 13.16% above that, plus a surtax on higher basic provincial tax amounts and the Ontario Health Premium.',
  },
  {
    question: 'How are CPP and EI calculated in 2026?',
    answer:
      'In 2026, CPP is 5.95% of pensionable earnings between $3,500 and the YMPE of $74,600 (maximum $4,230.45), plus CPP2 at 4% of earnings between $74,600 and $85,000 (maximum $416). EI premiums are 1.63% of insurable earnings up to $68,900 (maximum $1,123.07).',
  },
];

export default function PublicTaxCalculator() {
  const [incomeType, setIncomeType] = useState('salary');
  const [province, setProvince] = useState('ON');
  const [inputValue, setInputValue] = useState('100000');
  const [inputPeriod, setInputPeriod] = useState<TaxPeriod>('annual');
  const [displayPeriod, setDisplayPeriod] = useState<TaxPeriod>('annual');
  const [hoursPerDay, setHoursPerDay] = useState('8');
  const [daysPerWeek, setDaysPerWeek] = useState('5');

  const parsedIncome = parseFloat(inputValue.replace(/,/g, '')) || 0;
  const parsedHoursPerDay = Math.max(0.25, parseFloat(hoursPerDay) || 8);
  const parsedDaysPerWeek = Math.max(0.25, Math.min(7, parseFloat(daysPerWeek) || 5));
  const needsSchedule =
    inputPeriod === 'hourly' ||
    inputPeriod === 'daily' ||
    displayPeriod === 'hourly' ||
    displayPeriod === 'daily';

  const results = useMemo(() => {
    const schedule = { hoursPerDay: parsedHoursPerDay, daysPerWeek: parsedDaysPerWeek };
    if (incomeType !== 'salary') {
      // Dividend calculations are stubbed for now
      return convertTaxResult(calculateTaxes(0), displayPeriod, schedule);
    }
    const annualIncome = parsedIncome * periodsPerYear(inputPeriod, schedule);
    return convertTaxResult(calculateTaxes(annualIncome), displayPeriod, schedule);
  }, [
    incomeType,
    parsedIncome,
    inputPeriod,
    displayPeriod,
    parsedHoursPerDay,
    parsedDaysPerWeek,
  ]);

  const hoursPerYear = periodsPerYear('hourly', {
    hoursPerDay: parsedHoursPerDay,
    daysPerWeek: parsedDaysPerWeek,
  });
  const daysPerYear = periodsPerYear('daily', {
    hoursPerDay: parsedHoursPerDay,
    daysPerWeek: parsedDaysPerWeek,
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

  const formatPercent = (rate: number) => rate.toFixed(1) + '%';

  const deductionRows = [
    { label: 'Federal tax', value: results.federalTax },
    { label: 'Provincial tax', value: results.provincialTax },
    { label: 'Ontario Health Premium', value: results.ontarioHealthPremium },
    { label: 'CPP contribution', value: results.cppDeduction },
    { label: 'CPP2 contribution', value: results.cpp2Deduction },
    { label: 'EI premium', value: results.eiDeduction },
  ];

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
    name: 'Cashual Canadian Income Tax Calculator',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    url: 'https://cashual.org/tax-calculator',
    description:
      'Free 2026 Canadian income tax calculator for Ontario. Estimate federal tax, provincial tax, CPP, EI, Ontario Health Premium, and take-home pay.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'CAD',
    },
    provider: {
      '@type': 'Organization',
      name: 'Cashual',
      url: 'https://cashual.org',
      email: 'info@cashual.org',
    },
    featureList: [
      '2026 federal tax brackets',
      'Ontario provincial tax and surtax',
      'CPP and CPP2 contributions',
      'EI premiums',
      'Ontario Health Premium',
      'Hourly and daily take-home estimates',
    ],
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://cashual.org/',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Tax Calculator',
        item: 'https://cashual.org/tax-calculator',
      },
    ],
  };

  return (
    <div className="min-h-screen bg-deep-forest text-white selection:bg-neon-emerald/30 selection:text-white flex flex-col">
      <Helmet>
        <title>2026 Canadian Income Tax Calculator (Ontario) | Free Take-Home Pay | Cashual</title>
        <meta
          name="description"
          content="Free 2026 Canadian income tax calculator for Ontario. Estimate federal tax, provincial tax, CPP, EI, Ontario Health Premium, and take-home pay by annual, monthly, or hourly period. No signup required."
        />
        <meta
          name="keywords"
          content="Canadian income tax calculator, Ontario tax calculator, 2026 tax brackets, take-home pay calculator, salary tax calculator Canada, CPP EI calculator, Ontario Health Premium, free tax calculator"
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://cashual.org/tax-calculator" />

        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Cashual" />
        <meta
          property="og:title"
          content="2026 Canadian Income Tax Calculator | Free Ontario Take-Home Pay"
        />
        <meta
          property="og:description"
          content="Estimate your 2026 Ontario take-home pay with federal and provincial tax, CPP, EI, and the Ontario Health Premium. Free — no account required."
        />
        <meta property="og:url" content="https://cashual.org/tax-calculator" />
        <meta property="og:image" content="https://cashual.org/og-image.png" />
        <meta property="og:locale" content="en_CA" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="2026 Canadian Income Tax Calculator | Cashual"
        />
        <meta
          name="twitter:description"
          content="Free Ontario take-home pay calculator with 2026 tax brackets, CPP, EI, and Ontario Health Premium."
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
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Canadian Income{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-emerald to-emerald-400">
                Tax Calculator
              </span>
            </h1>
            <p className="text-lg text-slate-muted max-w-2xl mx-auto">
              Estimate your 2026 take-home pay based on your salary or hourly wage. Currently
              supporting Ontario brackets.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Input Panel */}
            <div className="lg:col-span-5 glass-emerald p-6 md:p-8 rounded-2xl border border-neon-emerald/20 shadow-[0_0_40px_rgba(52,211,153,0.1)]">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-neon-emerald/20 text-neon-emerald flex items-center justify-center text-sm font-bold">
                  1
                </span>
                Your Details
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-muted mb-2">
                    Income Type
                  </label>
                  <select
                    value={incomeType}
                    onChange={(e) => setIncomeType(e.target.value)}
                    className="input w-full bg-charcoal/50"
                  >
                    {INCOME_TYPES.map((t) => (
                      <option key={t.id} value={t.id} className="bg-charcoal text-white">
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-muted mb-2">
                    Province / Territory
                  </label>
                  <select
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className="input w-full bg-charcoal/50"
                  >
                    {PROVINCES.map((p) => (
                      <option key={p.id} value={p.id} className="bg-charcoal text-white">
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-muted mb-2">
                      Income Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-muted">
                        $
                      </span>
                      <input
                        type="number"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="input w-full pl-8 bg-charcoal/50 tabular-nums"
                        placeholder="100000"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-muted mb-2">Per</label>
                    <select
                      value={inputPeriod}
                      onChange={(e) => setInputPeriod(e.target.value as TaxPeriod)}
                      className="input w-full bg-charcoal/50"
                    >
                      {Object.entries(PERIOD_LABELS).map(([value, label]) => (
                        <option key={value} value={value} className="bg-charcoal text-white">
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-muted mb-2">
                      Hours / day
                    </label>
                    <input
                      type="number"
                      min="0.25"
                      max="24"
                      step="0.25"
                      value={hoursPerDay}
                      onChange={(e) => setHoursPerDay(e.target.value)}
                      className="input w-full bg-charcoal/50 tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-muted mb-2">
                      Days / week
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="7"
                      step="0.5"
                      value={daysPerWeek}
                      onChange={(e) => setDaysPerWeek(e.target.value)}
                      className="input w-full bg-charcoal/50 tabular-nums"
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-muted -mt-2">
                  Used for daily &amp; hourly views: {parsedHoursPerDay}h × {parsedDaysPerWeek} days
                  × 52 weeks = {hoursPerYear.toLocaleString('en-CA')} hours / year (
                  {daysPerYear.toLocaleString('en-CA')} working days).
                  {needsSchedule ? '' : ' Switch to Daily or Hourly to see per-period amounts.'}
                </p>

                {incomeType !== 'salary' && (
                  <div className="p-4 rounded-xl bg-golden-hour/10 border border-golden-hour/20 text-golden-hour/90 text-sm">
                    Dividend calculations are coming soon. Showing zeroed results.
                  </div>
                )}
              </div>
            </div>

            {/* Results Panel */}
            <div className="lg:col-span-7 glass p-6 md:p-8 rounded-2xl border border-white/5 relative overflow-hidden">
              {/* Background accent */}
              <div className="absolute -top-40 -right-40 w-80 h-80 bg-neon-emerald/10 blur-[100px] rounded-full pointer-events-none" />

              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center text-sm font-bold">
                  2
                </span>
                Your Take-Home Pay
              </h2>

              {/* Period tabs */}
              <div className="flex flex-wrap gap-2 mb-8 p-1 bg-charcoal/40 rounded-lg">
                {(Object.entries(PERIOD_LABELS) as [TaxPeriod, string][]).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setDisplayPeriod(value)}
                    className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all ${
                      displayPeriod === value
                        ? 'bg-charcoal text-neon-emerald shadow-sm'
                        : 'text-slate-muted hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Breakdown */}
              <motion.div
                key={displayPeriod}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="space-y-4 font-mono text-[15px]"
              >
                <div className="flex justify-between items-center py-2 border-b border-white/10">
                  <span className="text-slate-muted">Gross salary ({PERIOD_LABELS[displayPeriod].toLowerCase()})</span>
                  <span className="text-white tabular-nums">
                    {formatCurrency(results.grossIncome)}
                  </span>
                </div>

                {deductionRows.map((row) => (
                  <div key={row.label} className="flex justify-between items-center py-2">
                    <span className="text-slate-muted">{row.label}</span>
                    <span className="text-destructive tabular-nums">
                      - {formatCurrency(row.value)}
                    </span>
                  </div>
                ))}

                <div className="flex justify-between items-center py-3 border-t border-white/10 mt-2">
                  <span className="text-slate-muted font-medium">Total deductions</span>
                  <span className="text-destructive font-medium tabular-nums">
                    - {formatCurrency(results.totalTax)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-4 border-t border-b border-white/10 my-2">
                  <span className="text-white font-bold text-lg">Net pay *</span>
                  <span className="text-neon-emerald font-bold text-2xl tabular-nums">
                    {formatCurrency(results.netPay)}
                  </span>
                </div>
                {(displayPeriod === 'hourly' || displayPeriod === 'daily') && (
                  <p className="text-xs text-slate-muted -mt-1">
                    Take-home {displayPeriod === 'hourly' ? 'per hour' : 'per day'} after tax —
                    not your gross wage. Gross is {formatCurrency(results.grossIncome)}/
                    {displayPeriod === 'hourly' ? 'hr' : 'day'} at your schedule above.
                  </p>
                )}

                <div className="flex justify-between items-center py-2 pt-4">
                  <span className="text-slate-muted">Marginal tax rate</span>
                  <span className="text-white tabular-nums">
                    {formatPercent(results.marginalTaxRate)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-muted">Average tax rate</span>
                  <span className="text-white tabular-nums">
                    {formatPercent(results.averageTaxRate)}
                  </span>
                </div>
              </motion.div>

              <div className="mt-8 pt-6 border-t border-white/5 text-center">
                <a
                  href="/onboarding/company"
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-emerald focus-visible:ring-offset-2 focus-visible:ring-offset-deep-forest disabled:pointer-events-none disabled:opacity-50 bg-gradient-to-r from-neon-emerald to-golden-hour text-deep-forest hover:opacity-90 glow-emerald font-bold h-11 px-8 w-full sm:w-auto"
                >
                  Create a Cashual Account — It's Free
                </a>
                <p className="text-xs text-slate-muted mt-4">
                  * Calculations are based on 2026 Ontario tax brackets, CRA payroll deduction
                  formulas, and standard basic personal amounts. For estimation purposes only.
                </p>
              </div>
            </div>
          </div>

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
