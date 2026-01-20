import { useEffect } from 'react';
import { Navbar } from '../components/landing/Navbar';
import { Hero } from '../components/landing/Hero';
import { TrustSection } from '../components/landing/TrustSection';
import { Features } from '../components/landing/Features';
import { HowItWorks } from '../components/landing/HowItWorks';
import { Pricing } from '../components/landing/Pricing';
import { Footer } from '../components/landing/Footer';
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
    <div className="min-h-screen bg-deep-forest text-white selection:bg-neon-emerald/30 selection:text-white">
      <Navbar />
      <Hero />
      <TrustSection />
      <Features />
      <HowItWorks />
      <Pricing />
      <Footer />
    </div>
  );
};

export default LandingPage;
