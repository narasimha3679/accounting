import { Helmet } from 'react-helmet-async';
import { Navbar } from '../components/landing/Navbar';
import { Footer } from '../components/landing/Footer';
import { BackToTop } from '../components/landing/BackToTop';

const SUPARESUME_URL = 'https://suparesume.online';

const faqItems = [
  {
    question: 'What is the best free resume builder in 2025?',
    answer:
      'SupaResume is a top-rated free AI resume builder that lets you create, improve, and tailor professional resumes online. It uses artificial intelligence to generate ATS-optimized content, ensuring your resume passes automated screening systems used by employers worldwide.',
  },
  {
    question: 'How do I build a resume online for free?',
    answer:
      'With SupaResume, you can build a resume online for free in three simple steps: enter your job titles and keywords, let the AI generate polished bullet points and summaries, then preview and download your ATS-friendly resume as a PDF. No credit card or payment required.',
  },
  {
    question: 'What is an ATS-optimized resume template?',
    answer:
      'An ATS-optimized resume template uses a clean, single-column layout with standard headings that automated applicant tracking systems can parse correctly. SupaResume generates ATS-friendly resumes by default, so your application reaches human recruiters instead of getting filtered out.',
  },
  {
    question: 'Can AI write my resume for me?',
    answer:
      'Yes. SupaResume\'s AI resume builder takes your job titles, skills, and a few keywords and turns them into professional bullet points, summaries, and descriptions. You can also upload an existing resume and have the AI rewrite it for clarity and better ATS compatibility.',
  },
  {
    question: 'How do I tailor my resume to a specific job description?',
    answer:
      'SupaResume offers a dedicated resume tailoring feature. Paste the job description and select one of your saved resumes. The AI rewrites your summary and bullet points to match the role\'s keywords and requirements, significantly improving your chances of getting an interview.',
  },
  {
    question: 'Is SupaResume really 100% free?',
    answer:
      'Yes, SupaResume is completely free forever. There are no hidden fees, no premium tiers, and no credit card required. Every feature — including AI resume creation, resume improvement, and job-specific tailoring — is available to all users at no cost.',
  },
];

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqItems.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
};

const softwareJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'SupaResume',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: SUPARESUME_URL,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  description:
    'Free AI-powered resume builder. Create, improve, and tailor ATS-optimized resumes online.',
  featureList: [
    'AI Resume Creation',
    'Resume Improvement',
    'Job Description Tailoring',
    'ATS Optimization',
    'PDF Export',
  ],
};

const ResumeBuilderPromo = () => {
  return (
    <>
      <Helmet>
        <title>Free AI Resume Builder | SupaResume - Create ATS-Optimized Resumes Online</title>
        <meta
          name="description"
          content="Build your resume online for free with SupaResume, the AI-powered resume builder. Create professional ATS-optimized resumes, improve existing ones, or tailor them to any job description. No signup fee, no credit card."
        />
        <meta
          name="keywords"
          content="free resume builder, AI resume builder, resume template, ATS resume builder, resume builder online free, suparesume, build resume online, resume maker, free resume maker, resume templates free, AI resume writer"
        />
        <link rel="canonical" href={SUPARESUME_URL} />

        <meta property="og:type" content="website" />
        <meta property="og:title" content="Free AI Resume Builder | SupaResume" />
        <meta
          property="og:description"
          content="Create professional ATS-optimized resumes for free with AI. Build from scratch, improve existing resumes, or tailor to any job description."
        />
        <meta property="og:url" content={SUPARESUME_URL} />
        <meta property="og:site_name" content="SupaResume" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Free AI Resume Builder | SupaResume" />
        <meta
          name="twitter:description"
          content="Create professional ATS-optimized resumes for free with AI. Build, improve, or tailor your resume in minutes."
        />

        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(softwareJsonLd)}</script>
      </Helmet>

      <div className="min-h-screen bg-deep-forest text-white">
        <Navbar />

        <main className="container mx-auto px-4 md:px-6 py-24 max-w-5xl">
          {/* Hero */}
          <section className="text-center mb-20">
            <p className="text-neon-emerald font-medium mb-4 tracking-wide uppercase text-sm">
              100% Free Forever
            </p>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Free AI Resume Builder —{' '}
              <span className="text-neon-emerald">Create Professional Resumes Online</span>
            </h1>
            <p className="text-slate-300 text-lg md:text-xl max-w-3xl mx-auto mb-10 leading-relaxed">
              <a
                href={SUPARESUME_URL}
                target="_blank"
                rel="noopener"
                className="text-neon-emerald hover:underline font-semibold"
              >
                SupaResume
              </a>{' '}
              is a free, AI-powered resume maker that helps you build a resume online from scratch,
              improve an existing one, or tailor it to any job description. Every resume is
              ATS-optimized so your application gets past automated screening and into the hands of
              recruiters.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href={`${SUPARESUME_URL}/create-resume`}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center px-8 py-4 bg-neon-emerald text-deep-forest font-bold rounded-xl hover:bg-neon-emerald/90 transition-all text-lg"
              >
                Try Free Resume Builder
              </a>
              <a
                href={SUPARESUME_URL}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center px-8 py-4 border border-white/20 text-white font-semibold rounded-xl hover:bg-white/5 transition-all text-lg"
              >
                Learn More About SupaResume
              </a>
            </div>
          </section>

          {/* What is SupaResume */}
          <section className="mb-20">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              What Is SupaResume? The AI Resume Builder That Does the Writing for You
            </h2>
            <div className="text-slate-300 text-lg leading-relaxed space-y-4">
              <p>
                Looking for a <strong className="text-white">free resume builder</strong> that
                actually writes your resume? SupaResume is an{' '}
                <strong className="text-white">AI-powered resume builder</strong> designed for job
                seekers who want a polished, professional resume without spending hours writing it
                themselves.
              </p>
              <p>
                Simply enter your job titles and a few keywords about your experience, and
                SupaResume's AI generates professionally written bullet points, summaries, and
                descriptions. The output follows proven{' '}
                <strong className="text-white">resume templates</strong> that are optimized for
                applicant tracking systems (ATS), ensuring your resume doesn't get filtered out
                before a human ever sees it.
              </p>
              <p>
                Whether you're a recent graduate building your first resume, a professional updating
                your career profile, or someone targeting a specific role —{' '}
                <a
                  href={SUPARESUME_URL}
                  target="_blank"
                  rel="noopener"
                  className="text-neon-emerald hover:underline font-semibold"
                >
                  SupaResume's free online resume maker
                </a>{' '}
                has you covered.
              </p>
            </div>
          </section>

          {/* Three Features */}
          <section className="mb-20">
            <h2 className="text-3xl md:text-4xl font-bold mb-10 text-center">
              Three Ways to Build the Perfect Resume
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-charcoal rounded-2xl p-8 border border-white/5">
                <div className="w-12 h-12 bg-neon-emerald/10 rounded-xl flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-neon-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3">Create a Resume from Scratch</h3>
                <p className="text-slate-400 mb-6">
                  Enter your job titles, skills, and a few keywords — the AI resume writer generates
                  polished content for you. No writing skills needed. Perfect for anyone who wants to
                  build a resume online quickly.
                </p>
                <a
                  href={`${SUPARESUME_URL}/create-resume`}
                  target="_blank"
                  rel="noopener"
                  className="text-neon-emerald hover:underline font-semibold"
                >
                  Create Your Resume Free &rarr;
                </a>
              </div>

              <div className="bg-charcoal rounded-2xl p-8 border border-white/5">
                <div className="w-12 h-12 bg-neon-emerald/10 rounded-xl flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-neon-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3">Upload &amp; Improve Your Resume</h3>
                <p className="text-slate-400 mb-6">
                  Already have a resume? Upload it as PDF or DOCX and let the AI rewrite it for
                  clarity, stronger wording, and ATS compatibility — while keeping your story intact.
                </p>
                <a
                  href={`${SUPARESUME_URL}/improve-resume`}
                  target="_blank"
                  rel="noopener"
                  className="text-neon-emerald hover:underline font-semibold"
                >
                  Improve Your Resume &rarr;
                </a>
              </div>

              <div className="bg-charcoal rounded-2xl p-8 border border-white/5">
                <div className="w-12 h-12 bg-neon-emerald/10 rounded-xl flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-neon-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3">Tailor Resume to Any Job</h3>
                <p className="text-slate-400 mb-6">
                  Paste a job description and the AI rewrites your summary and bullet points to match
                  the role's keywords. The best way to customize your resume template for each
                  application.
                </p>
                <a
                  href={`${SUPARESUME_URL}/tailor-resume`}
                  target="_blank"
                  rel="noopener"
                  className="text-neon-emerald hover:underline font-semibold"
                >
                  Tailor Your Resume &rarr;
                </a>
              </div>
            </div>
          </section>

          {/* Why Use an AI Resume Builder */}
          <section className="mb-20">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Why Use an AI Resume Builder?
            </h2>
            <div className="text-slate-300 text-lg leading-relaxed space-y-4">
              <p>
                The job market is competitive. Over 75% of resumes are rejected by applicant tracking
                systems before a hiring manager ever sees them. A{' '}
                <strong className="text-white">free AI resume builder</strong> like SupaResume solves
                this by generating content that's already optimized for ATS filters while sounding
                natural and professional.
              </p>
              <p>
                Unlike generic <strong className="text-white">resume templates</strong> that leave
                you staring at a blank page, SupaResume's AI does the heavy lifting. You provide the
                raw ingredients — your job titles, skills, and accomplishments — and the{' '}
                <strong className="text-white">resume maker</strong> transforms them into
                compelling, keyword-rich content that hiring managers want to read.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6 mt-10">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-neon-emerald/10 rounded-lg flex-shrink-0 flex items-center justify-center mt-1">
                  <svg className="w-4 h-4 text-neon-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-1">ATS-Optimized Output</h4>
                  <p className="text-slate-400">Clean layout and standard headings that pass automated screening.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-neon-emerald/10 rounded-lg flex-shrink-0 flex items-center justify-center mt-1">
                  <svg className="w-4 h-4 text-neon-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-1">AI-Powered Writing</h4>
                  <p className="text-slate-400">Turn basic keywords into polished professional content instantly.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-neon-emerald/10 rounded-lg flex-shrink-0 flex items-center justify-center mt-1">
                  <svg className="w-4 h-4 text-neon-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-1">100% Free Forever</h4>
                  <p className="text-slate-400">No premium tier, no credit card, no hidden fees.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-neon-emerald/10 rounded-lg flex-shrink-0 flex items-center justify-center mt-1">
                  <svg className="w-4 h-4 text-neon-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-1">PDF Download</h4>
                  <p className="text-slate-400">Preview in real time and export a print-ready PDF.</p>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Banner */}
          <section className="mb-20 bg-gradient-to-r from-neon-emerald/10 to-neon-emerald/5 rounded-2xl p-10 md:p-14 text-center border border-neon-emerald/20">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Build Your Resume?
            </h2>
            <p className="text-slate-300 text-lg mb-8 max-w-2xl mx-auto">
              Join thousands of job seekers who use SupaResume's free AI resume builder to create,
              improve, and tailor ATS-optimized resumes in minutes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href={`${SUPARESUME_URL}/create-resume`}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center px-8 py-4 bg-neon-emerald text-deep-forest font-bold rounded-xl hover:bg-neon-emerald/90 transition-all text-lg"
              >
                Create Your Resume Now
              </a>
              <a
                href={`${SUPARESUME_URL}/improve-resume`}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center px-8 py-4 border border-white/20 text-white font-semibold rounded-xl hover:bg-white/5 transition-all text-lg"
              >
                Improve Existing Resume
              </a>
            </div>
            <p className="text-slate-500 text-sm mt-6">
              No credit card required &bull; Always free for job seekers
            </p>
          </section>

          {/* FAQ */}
          <section className="mb-20">
            <h2 className="text-3xl md:text-4xl font-bold mb-10 text-center">
              Resume Builder FAQ
            </h2>
            <div className="space-y-6 max-w-3xl mx-auto">
              {faqItems.map((item, i) => (
                <details
                  key={i}
                  className="group bg-charcoal rounded-xl border border-white/5 overflow-hidden"
                >
                  <summary className="flex items-center justify-between cursor-pointer p-6 text-white font-semibold text-lg select-none">
                    {item.question}
                    <svg
                      className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform flex-shrink-0 ml-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="px-6 pb-6 text-slate-300 leading-relaxed">{item.answer}</div>
                </details>
              ))}
            </div>
          </section>

          {/* Bottom CTA */}
          <section className="text-center mb-8">
            <a
              href={SUPARESUME_URL}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center px-10 py-4 bg-neon-emerald text-deep-forest font-bold rounded-xl hover:bg-neon-emerald/90 transition-all text-lg"
            >
              Build Your ATS Resume Free
            </a>
            <p className="text-slate-500 text-sm mt-4">
              Powered by{' '}
              <a
                href={SUPARESUME_URL}
                target="_blank"
                rel="noopener"
                className="text-neon-emerald hover:underline"
              >
                SupaResume
              </a>{' '}
              — the free AI resume builder
            </p>
          </section>
        </main>

        <Footer />
        <BackToTop />
      </div>
    </>
  );
};

export default ResumeBuilderPromo;
