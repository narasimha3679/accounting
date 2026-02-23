const SUPARESUME_URL = 'https://suparesume.online';

export const SupaResumePromo = () => {
  return (
    <section className="py-20 bg-charcoal/50 border-t border-b border-white/5">
      <div className="container mx-auto px-4 md:px-6 text-center">
        <p className="text-neon-emerald font-medium text-sm tracking-wide uppercase mb-4">
          From the Makers of Cashual
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Need a Professional Resume? Try{' '}
          <a
            href={SUPARESUME_URL}
            target="_blank"
            rel="noopener"
            className="text-neon-emerald hover:underline"
          >
            SupaResume
          </a>
        </h2>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-8">
          Free AI-powered resume builder that creates ATS-optimized resumes in minutes.
          Create from scratch, improve an existing resume, or tailor it to any job description.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
          <a
            href={SUPARESUME_URL}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center px-8 py-3.5 bg-neon-emerald text-deep-forest font-bold rounded-xl hover:bg-neon-emerald/90 transition-all"
          >
            Build Your Free Resume
          </a>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
          <a
            href={`${SUPARESUME_URL}/create-resume`}
            target="_blank"
            rel="noopener"
            className="text-slate-400 hover:text-neon-emerald transition-colors"
          >
            Create Resume
          </a>
          <span className="text-slate-600">|</span>
          <a
            href={`${SUPARESUME_URL}/improve-resume`}
            target="_blank"
            rel="noopener"
            className="text-slate-400 hover:text-neon-emerald transition-colors"
          >
            Improve Resume
          </a>
          <span className="text-slate-600">|</span>
          <a
            href={`${SUPARESUME_URL}/tailor-resume`}
            target="_blank"
            rel="noopener"
            className="text-slate-400 hover:text-neon-emerald transition-colors"
          >
            Tailor to Job Description
          </a>
        </div>
        <p className="text-slate-600 text-xs mt-6">
          100% free &bull; AI-powered &bull; ATS-optimized &bull; No credit card required
        </p>
      </div>
    </section>
  );
};
