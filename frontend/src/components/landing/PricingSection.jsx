import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { selectPlan } from '../../firebase/auth';
import '../../styles/pricing.css';

const PricingSection = () => {
  const navigate = useNavigate();
  const { currentUser, refreshUserData } = useAuth();

  // Helper function to determine if a plan is selectable
  const canSelectPlan = (planId) => {
    if (!currentUser) return true; // If not logged in, all plans are selectable
    
    const currentPlanId = currentUser.current_plan?.toLowerCase() || 'free';
    
    // Plan hierarchy (in ascending order)
    const planHierarchy = ['free', 'pro', 'business'];
    
    // Get indices for current plan and target plan
    const currentPlanIndex = planHierarchy.indexOf(currentPlanId);
    const targetPlanIndex = planHierarchy.indexOf(planId);
    
    // User can only select plans higher than their current plan
    return targetPlanIndex > currentPlanIndex;
  };

  // Helper function to get button text based on plan status
  const getButtonText = (planId) => {
    if (!currentUser) return `Choose ${planId.charAt(0).toUpperCase() + planId.slice(1)}`;
    
    const currentPlanId = currentUser.current_plan?.toLowerCase() || 'free';
    
    if (currentPlanId === planId) {
      return 'Current Plan';
    } else if (canSelectPlan(planId)) {
      return `Upgrade to ${planId.charAt(0).toUpperCase() + planId.slice(1)}`;
    } else {
      return 'Not Available';
    }
  };

  const handleSelectPlan = async (plan) => {
    try {
      if (!currentUser) {
        // If not logged in, prompt to log in first
        alert('Please log in to select a plan');
        return;
      }
      
      // Check if user can select this plan
      if (!canSelectPlan(plan)) {
        // If trying to select current plan
        if (currentUser.current_plan?.toLowerCase() === plan) {
          alert('You are already on this plan.');
        } else {
          alert('You cannot downgrade to a lower plan. You can only upgrade to higher plans.');
        }
        return;
      }
      
      // Call the selectPlan function from auth.js
      await selectPlan(plan);
      
      // Refresh user data to get updated plan info
      await refreshUserData();
      
      alert(`You've successfully upgraded to the ${plan} plan!`);
      
      // Navigate to app if user has responses remaining
      if (currentUser.responses_remaining > 0) {
        navigate('/app');
      }
    } catch (error) {
      console.error(`Error selecting plan ${plan}:`, error);
      alert(`Failed to select plan: ${error.message}`);
    }
  };

  return (
    <section id="pricing">
      <h2>Pricing Plans</h2>
      <div className="pricing-container">
        <div className={`pricing-tier ${currentUser?.current_plan?.toLowerCase() === 'free' ? 'current-plan' : ''}`}>
          <h3>Free</h3>
          <p className="price">₹0</p>
          <ul>
            <li>50 Responses</li>
            <li>Real-time Processing</li>
            <li>Basic Support</li>
          </ul>
          <button 
            className={`select-plan-btn ${!canSelectPlan('free') ? 'disabled' : ''}`} 
            data-plan="free" 
            onClick={() => handleSelectPlan('free')}
            disabled={!canSelectPlan('free')}
            style={{
              backgroundColor: !canSelectPlan('free') ? '#cccccc' : '',
              cursor: !canSelectPlan('free') ? 'not-allowed' : 'pointer',
              color: !canSelectPlan('free') ? '#666666' : ''
            }}
          >
            {getButtonText('free')}
          </button>
          {currentUser?.current_plan?.toLowerCase() === 'free' && 
            <div className="current-plan-badge">Current Plan</div>
          }
        </div>
        <div className={`pricing-tier popular ${currentUser?.current_plan?.toLowerCase() === 'pro' ? 'current-plan' : ''}`}>
          <h3>Pro</h3>
          <p className="price">₹499 <span className="billing-cycle">/ month</span></p>
          <ul>
            <li>300 Responses</li>
            <li>Real-time Processing</li>
            <li>Priority Support</li>
            <li>Early access to new features</li>
          </ul>
          <button 
            className={`select-plan-btn ${!canSelectPlan('pro') ? 'disabled' : ''}`} 
            data-plan="pro" 
            onClick={() => handleSelectPlan('pro')}
            disabled={!canSelectPlan('pro')}
            style={{
              backgroundColor: !canSelectPlan('pro') ? '#cccccc' : '',
              cursor: !canSelectPlan('pro') ? 'not-allowed' : 'pointer',
              color: !canSelectPlan('pro') ? '#666666' : ''
            }}
          >
            {getButtonText('pro')}
          </button>
          {currentUser?.current_plan?.toLowerCase() === 'pro' && 
            <div className="current-plan-badge">Current Plan</div>
          }
        </div>
        <div className={`pricing-tier ${currentUser?.current_plan?.toLowerCase() === 'business' ? 'current-plan' : ''}`}>
          <h3>Business</h3>
          <p className="price">₹1599 <span className="billing-cycle">/ month</span></p>
          <ul>
            <li>2000 Responses</li>
            <li>Real-time Processing</li>
            <li>Dedicated Support</li>
            <li>Advanced Analytics</li>
            <li>API Access</li>
          </ul>
          <button 
            className={`select-plan-btn ${!canSelectPlan('business') ? 'disabled' : ''}`} 
            data-plan="business" 
            onClick={() => handleSelectPlan('business')}
            disabled={!canSelectPlan('business')}
            style={{
              backgroundColor: !canSelectPlan('business') ? '#cccccc' : '',
              cursor: !canSelectPlan('business') ? 'not-allowed' : 'pointer',
              color: !canSelectPlan('business') ? '#666666' : ''
            }}
          >
            {getButtonText('business')}
          </button>
          {currentUser?.current_plan?.toLowerCase() === 'business' && 
            <div className="current-plan-badge">Current Plan</div>
          }
        </div>
      </div>
    </section>
  );
};

export default PricingSection;