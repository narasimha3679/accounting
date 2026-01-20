import { useEffect } from 'react';
import { Navbar } from '../components/landing/Navbar';
import { Hero } from '../components/landing/Hero';
import { TrustSection } from '../components/landing/TrustSection';
import { Features } from '../components/landing/Features';
import { Testimonials } from '../components/landing/Testimonials';
import { HowItWorks } from '../components/landing/HowItWorks';
import { Pricing } from '../components/landing/Pricing';
import { FAQ } from '../components/landing/FAQ';
import { Footer } from '../components/landing/Footer';
import { FloatingCTA } from '../components/landing/FloatingCTA';
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
          <Testimonials />
          <HowItWorks />
          <Pricing />
          <FAQ />
        </main>
        <Footer />
        <FloatingCTA />
        <BackToTop />
      </div>
    </ErrorBoundary>
  );
};

export default LandingPage;
