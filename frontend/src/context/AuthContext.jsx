import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { getCurrentUser, signInWithGoogle, signOutUser, getUserStatus } from '../firebase/auth';

// Create the auth context
const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

// Provider component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sign in with Google
  const login = async () => {
    try {
      setError(null);
      const userData = await signInWithGoogle();
      setCurrentUser({ ...userData });
      return userData;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Sign out
  const logout = async () => {
    try {
      await signOutUser();
      setCurrentUser(null);
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Refresh user data from backend
  const refreshUserData = async () => {
    try {
      if (currentUser) {
        const userData = await getUserStatus();
        setCurrentUser(prev => ({ ...prev, ...userData }));
        return userData;
      }
    } catch (error) {
      console.error("Error refreshing user data:", error);
      setError(error.message);
    }
  };

  // Effect to handle auth state changes and initialize from localStorage
  useEffect(() => {
    // First check localStorage for existing user
    const localUser = getCurrentUser();
    if (localUser) {
      setCurrentUser(localUser);
    }

    // Then listen for Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        // If Firebase says no user is logged in, clear our local state too
        setCurrentUser(null);
        localStorage.removeItem('user');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Context value
  const value = {
    currentUser,
    login,
    logout,
    refreshUserData,
    error,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
