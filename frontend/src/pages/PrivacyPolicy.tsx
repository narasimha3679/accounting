import { Navbar } from '../components/landing/Navbar';
import { Footer } from '../components/landing/Footer';
import { BackToTop } from '../components/landing/BackToTop';
import { formatLocalDate } from '../lib/utils';

export const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-deep-forest text-white">
      <Navbar />
      <main className="container mx-auto px-4 md:px-6 py-24 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-slate-400 mb-8">Last updated: {formatLocalDate(new Date().toISOString().split('T')[0], { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">1. Introduction</h2>
            <p className="text-slate-300 leading-relaxed">
              Cashual ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our accounting platform and services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">2. Information We Collect</h2>
            <p className="text-slate-300 leading-relaxed mb-4">We collect information that you provide directly to us, including:</p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li>Account information (name, email address, company details)</li>
              <li>Financial data (payroll information, expenses, tax documents)</li>
              <li>Employee information (for payroll and tax document generation)</li>
              <li>Payment information (processed securely through third-party providers)</li>
              <li>Communication data (support requests, feedback)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">3. How We Use Your Information</h2>
            <p className="text-slate-300 leading-relaxed mb-4">We use the information we collect to:</p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li>Provide, maintain, and improve our services</li>
              <li>Process payroll and generate tax documents (T4s, T5s, ROEs)</li>
              <li>Calculate taxes and ensure CRA compliance</li>
              <li>Send you important updates and notifications</li>
              <li>Respond to your inquiries and provide customer support</li>
              <li>Detect and prevent fraud or abuse</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">4. Data Security</h2>
            <p className="text-slate-300 leading-relaxed">
              We implement industry-standard security measures to protect your data, including encryption in transit and at rest, secure data storage, and regular security audits. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">5. Data Retention</h2>
            <p className="text-slate-300 leading-relaxed">
              We retain your information for as long as necessary to provide our services and comply with legal obligations. Financial records are retained in accordance with Canadian tax law requirements (typically 7 years).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">6. Your Rights</h2>
            <p className="text-slate-300 leading-relaxed mb-4">Under Canadian privacy laws (PIPEDA), you have the right to:</p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li>Access your personal information</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your information (subject to legal requirements)</li>
              <li>Withdraw consent for certain data processing activities</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">7. Third-Party Services</h2>
            <p className="text-slate-300 leading-relaxed">
              We use third-party services such as managed PostgreSQL hosting, object storage providers, and email delivery services that may process data on our behalf. These providers are contractually bound by their own privacy and security obligations.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">8. Contact Us</h2>
            <p className="text-slate-300 leading-relaxed">
              If you have questions about this Privacy Policy or wish to exercise your rights, please contact us at support@cashual.app
            </p>
          </section>
        </div>
      </main>
      <Footer />
      <BackToTop />
    </div>
  );
};

export default PrivacyPolicy;
