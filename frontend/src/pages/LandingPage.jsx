import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../components/landing/Header';
import HeroSection from '../components/landing/HeroSection';
import UserDashboardSection from '../components/landing/UserDashboardSection';
import PricingSection from '../components/landing/PricingSection';
import Footer from '../components/landing/Footer';

const LandingPage = () => {
  const location = useLocation();
  const [showNoResponsesAlert, setShowNoResponsesAlert] = useState(false);
  
  // Check if user was redirected due to having no responses remaining
  useEffect(() => {
    if (location.state?.noResponses) {
      setShowNoResponsesAlert(true);
      // Auto-hide the alert after 5 seconds
      const timer = setTimeout(() => {
        setShowNoResponsesAlert(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [location]);
  
  return (
    <>
      <Header />
      {showNoResponsesAlert && (
        <div 
          style={{
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '12px 20px',
            margin: '0',
            textAlign: 'center',
            position: 'relative',
            zIndex: 100
          }}
        >
          <strong>You've used all your responses.</strong> Please upgrade your plan to continue using the app.
          <button 
            onClick={() => setShowNoResponsesAlert(false)}
            style={{
              background: 'none',
              border: 'none',
              color: '#721c24',
              cursor: 'pointer',
              fontWeight: 'bold',
              marginLeft: '10px',
              fontSize: '16px'
            }}
          >
            ×
          </button>
        </div>
      )}
      <main>
        <HeroSection />
        <UserDashboardSection /> {/* This component will only render if user is logged in */}
        <PricingSection />
      </main>
      <Footer />
    </>
  );
};

export default LandingPage;
