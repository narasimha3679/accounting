import { useEffect } from 'react';
import { Navbar } from '../components/landing/Navbar';
import { Hero } from '../components/landing/Hero';
import { TrustSection } from '../components/landing/TrustSection';
import { Features } from '../components/landing/Features';
import { UseCases } from '../components/landing/UseCases';
import { Comparison } from '../components/landing/Comparison';
import { HowItWorks } from '../components/landing/HowItWorks';
import { Pricing } from '../components/landing/Pricing';
import { Testimonials } from '../components/landing/Testimonials';
import { FAQ } from '../components/landing/FAQ';
import { Footer } from '../components/landing/Footer';
import { BackToTop } from '../components/landing/BackToTop';
import ErrorBoundary from '../components/ErrorBoundary';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // If user is already authenticated, redirect them to dashboard
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.isEmployee) {
        navigate('/employee-dashboard');
      } else if (user.company_id) {
        navigate('/dashboard');
      }
    }
  }, [isAuthenticated, user, navigate]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-deep-forest text-white selection:bg-neon-emerald/30 selection:text-white">
        <Navbar />
        <main id="main-content">
          <Hero />
          <TrustSection />
          <Features />
          <UseCases />
          <Comparison />
          <HowItWorks />
          <Pricing />
          <Testimonials />
          <FAQ />
        </main>
        <Footer />
        <BackToTop />
      </div>
    </ErrorBoundary>
  );
};

export default LandingPage;
