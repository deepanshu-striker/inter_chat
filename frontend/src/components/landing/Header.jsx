import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Header = () => {
  const navigate = useNavigate();
  const { currentUser, login, logout } = useAuth();
  
  const handleLogin = async () => {
    try {
      await login(); // This uses Google Authentication via Firebase
      navigate('/app'); // Navigate to app after successful login
    } catch (error) {
      console.error('Login failed:', error);
      alert('Login failed: ' + error.message);
    }
  };

  const handleSignUp = async () => {
    // For Google Auth, signup and login are the same process
    try {
      await login(); // This uses Google Authentication via Firebase
      navigate('/app'); // Navigate to app after successful signup
    } catch (error) {
      console.error('Signup failed:', error);
      alert('Signup failed: ' + error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header>
      <nav>
        <div className="logo">
          <h1>AudioRespond AI</h1>
        </div>
        <div className="auth-buttons">
          {currentUser ? (
            <>
              <span style={{ marginRight: '10px' }}>
                Hello, {currentUser.email || 'User'}
              </span>
              <button id="logoutBtn" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <button id="loginBtn" onClick={handleLogin}>Login</button>
              <button id="signupBtn" onClick={handleSignUp}>Sign Up</button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;