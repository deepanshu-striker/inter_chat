import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

const UserDashboardSection = () => {
  const { currentUser, refreshUserData } = useAuth();

  // Refresh user data only on initial mount, not on every render
  useEffect(() => {
    // Only fetch if we have a user and this is the initial mount
    if (currentUser) {
      console.log('Refreshing user data once on landing page...');
      refreshUserData()
        .then(data => console.log('User data refreshed:', data))
        .catch(err => console.error('Failed to refresh user data:', err));
    }
    // Empty dependency array means this only runs once on mount
  }, []);

  // For debugging: Always show the component
  // Comment out the authentication check temporarily
  // if (!currentUser) {
  //   return null;
  // }
  
  // Use mock data if user is not logged in
  const userData = currentUser || {
    responses_used: 0,
    responses_remaining: 50,
    current_plan: 'Free Tier (Debug Mode)'
  };

  return (
    <section id="user-dashboard">
      <h3>Your Usage</h3>
      <p>Responses Used: <span id="responsesUsed">{userData.responses_used || 0}</span></p>
      <p>Responses Remaining: <span id="responsesRemaining">
        {userData.responses_remaining || 50}
      </span> ({userData.current_plan || 'Free Tier'})</p>
      
      <div style={{ marginTop: '20px' }}>
        {userData.responses_remaining > 0 ? (
          <Link 
            to="/app" 
            style={{
              display: 'inline-block',
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '5px',
              fontWeight: 'bold',
              transition: 'background-color 0.3s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#218838'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#28a745'}
          >
            Go to App
          </Link>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <button 
              disabled
              style={{
                display: 'inline-block',
                padding: '10px 20px',
                backgroundColor: '#cccccc',
                color: '#666666',
                textDecoration: 'none',
                borderRadius: '5px',
                fontWeight: 'bold',
                border: 'none',
                cursor: 'not-allowed'
              }}
            >
              Go to App
            </button>
            <p style={{ color: '#dc3545', fontSize: '14px' }}>
              You've used all your responses. Please upgrade your plan to continue.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default UserDashboardSection;