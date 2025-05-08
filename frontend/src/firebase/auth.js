import { GoogleAuthProvider, signInWithPopup, signOut, getAuth } from "firebase/auth";
import { auth } from "./config";

// Backend API URL
const API_URL = "http://localhost:8000"; // Adjust if your backend is on a different URL

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

/**
 * Sign in with Google popup
 * After successful Firebase authentication, register/login with our backend
 */
export const signInWithGoogle = async () => {
  try {
    console.log('Starting Google sign-in process...');
    
    // 1. Sign in with Firebase Google Auth
    const result = await signInWithPopup(auth, googleProvider);
    console.log('Firebase auth successful:', result);
    
    const user = result.user;
    console.log('User authenticated:', user.email);
    
    // 2. Register/login with our backend
    console.log('Sending auth data to backend...');
    const response = await fetch(`${API_URL}/register_or_login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        google_id: user.uid,
        email: user.email,
      }),
    });
    
    if (!response.ok) {
      console.error('Backend response not OK:', response.status, response.statusText);
      throw new Error(`Backend registration failed: ${response.statusText}`);
    }
    
    // 3. Parse and return user data from our backend
    const userData = await response.json();
    console.log('Backend auth successful:', userData);
    
    // 4. Store user data in localStorage for persistence
    // Make sure we preserve the user_id from the backend response
    const combinedUserData = {
      uid: user.uid,  // Firebase UID
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      // Include backend user data (plan, responses, etc.)
      ...userData,
      // Ensure user_id is available for API calls
      user_id: userData.user_id || user.uid
    };
    
    localStorage.setItem("user", JSON.stringify(combinedUserData));
    console.log('User data stored in localStorage');
    
    return combinedUserData;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

/**
 * Sign out from Firebase and clear local storage
 */
export const signOutUser = async () => {
  try {
    await signOut(auth);
    localStorage.removeItem("user");
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};

/**
 * Get the current user from localStorage
 */
export const getCurrentUser = () => {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => {
  return getCurrentUser() !== null;
};

/**
 * Select a plan for the current user
 */
export const selectPlan = async (planId) => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }
    
    const response = await fetch(`${API_URL}/user/${user.uid}/select_plan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan_id: planId,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Plan selection failed: ${response.statusText}`);
    }
    
    const updatedUserData = await response.json();
    
    // Update localStorage with new user data
    localStorage.setItem("user", JSON.stringify({
      ...user,
      ...updatedUserData,
    }));
    
    return updatedUserData;
  } catch (error) {
    console.error("Error selecting plan:", error);
    throw error;
  }
};

/**
 * Get user status (responses used/remaining)
 */
export const getUserStatus = async () => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }
    
    const response = await fetch(`${API_URL}/user/${user.uid}/status`);
    
    if (!response.ok) {
      throw new Error(`Failed to get user status: ${response.statusText}`);
    }
    
    const userData = await response.json();
    
    // Update localStorage with latest user data
    localStorage.setItem("user", JSON.stringify({
      ...user,
      ...userData,
    }));
    
    return userData;
  } catch (error) {
    console.error("Error getting user status:", error);
    throw error;
  }
};
