import React from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AppPage from './pages/AppPage';
import VoiceChat from './components/VoiceChat';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';

// Protected route component that uses the auth context
const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();
  
  // Redirect to home page if user is not logged in
  if (!currentUser) {
    return <Navigate to="/" replace />;
  }
  
  // Redirect to home page if user has no responses remaining
  if (currentUser.responses_remaining <= 0) {
    return <Navigate to="/" replace state={{ noResponses: true }} />;
  }
  
  return children;
};

// App route with user data
const AppRoute = () => {
  const { currentUser, refreshUserData } = useAuth();
  
  // Refresh user data only on initial mount
  React.useEffect(() => {
    if (currentUser) {
      console.log('App page: Refreshing user data once on mount...');
      refreshUserData()
        .then(data => console.log('App page: User data refreshed:', data))
        .catch(err => console.error('App page: Failed to refresh user data:', err));
    }
    // Empty dependency array means this only runs once on mount
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4 md:p-6">
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link 
            to="/" 
            className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Home
          </Link>
          <div className="text-sm text-gray-500">
            <span id="responsesRemaining">{currentUser?.responses_remaining || 0}</span> responses remaining
          </div>
        </div>
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Voice Chat</h1>
        <p className="text-center text-gray-600 mb-8">Speak naturally and get real-time responses</p>
        <VoiceChat />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route 
          path="/app" 
          element={
            <ProtectedRoute>
              <AppRoute />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}