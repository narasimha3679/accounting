import { Navbar } from '../components/landing/Navbar';
import { Footer } from '../components/landing/Footer';
import { BackToTop } from '../components/landing/BackToTop';
import { formatLocalDate } from '../lib/utils';

export const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-deep-forest text-white">
      <Navbar />
      <main className="container mx-auto px-4 md:px-6 py-24 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-bold mb-8">Terms of Service</h1>
        <p className="text-slate-400 mb-8">Last updated: {formatLocalDate(new Date().toISOString().split('T')[0], { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
            <p className="text-slate-300 leading-relaxed">
              By accessing or using Cashual ("the Service"), you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not access the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">2. Description of Service</h2>
            <p className="text-slate-300 leading-relaxed">
              Cashual is an accounting platform designed for Canadian small businesses and incorporated professionals. The Service provides tools for payroll management, dividend tracking, expense management, and tax document generation (T4s, T5s, ROEs).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">3. User Accounts</h2>
            <p className="text-slate-300 leading-relaxed mb-4">To use the Service, you must:</p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>Be responsible for all activities under your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">4. Pricing and Billing</h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              Cashual offers simple, transparent pricing: $5 per month or $50 per year (save 17% with annual billing). All features are included in this price—there are no per-employee fees or hidden costs.
            </p>
            <p className="text-slate-300 leading-relaxed mb-4">
              Billing occurs on a monthly or annual basis, depending on your selected plan. Annual plans are billed upfront for the full year. Monthly plans are billed monthly in advance.
            </p>
            <p className="text-slate-300 leading-relaxed">
              You may cancel your subscription at any time. Cancellations take effect at the end of your current billing period. No refunds are provided for partial billing periods, except as required by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">5. CRA Compliance</h2>
            <p className="text-slate-300 leading-relaxed">
              While Cashual is designed to help ensure CRA compliance, you are ultimately responsible for the accuracy of your tax filings and compliance with Canadian tax laws. We recommend consulting with a professional accountant for complex tax situations.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">6. Data Accuracy</h2>
            <p className="text-slate-300 leading-relaxed">
              You are responsible for ensuring the accuracy of all data entered into the Service. Cashual is not liable for errors resulting from incorrect or incomplete information provided by you.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">7. Prohibited Uses</h2>
            <p className="text-slate-300 leading-relaxed mb-4">You agree not to:</p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li>Use the Service for any illegal purpose</li>
              <li>Attempt to gain unauthorized access to the Service</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Reverse engineer or attempt to extract source code</li>
              <li>Use the Service to violate any applicable laws or regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">8. Intellectual Property</h2>
            <p className="text-slate-300 leading-relaxed">
              The Service and its original content, features, and functionality are owned by Cashual and are protected by international copyright, trademark, and other intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">9. Limitation of Liability</h2>
            <p className="text-slate-300 leading-relaxed">
              Cashual is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, special, or consequential damages arising from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">10. Changes to Terms</h2>
            <p className="text-slate-300 leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify users of material changes via email or through the Service. Continued use of the Service after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">11. Contact Information</h2>
            <p className="text-slate-300 leading-relaxed">
              For questions about these Terms of Service, please contact us at support@cashual.app
            </p>
          </section>
        </div>
      </main>
      <Footer />
      <BackToTop />
    </div>
  );
};

export default TermsOfService;
