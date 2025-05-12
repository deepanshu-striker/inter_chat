// auth.js

import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  getAuth,
} from "firebase/auth";
import { auth } from "./config";

const API_URL = import.meta.env.DEV
  ? "http://localhost:8000"
  : `${window.location.protocol}//${window.location.hostname}:8000`;

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

/**
 * Smart sign-in: popup on desktop, redirect on mobile
 */
export const signInWithGoogle = async () => {
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);

  try {
    console.log("Starting Google sign-in process...");

    // if (isMobile) {
    //   console.log("Using redirect-based sign-in on mobile...");
    //   await signInWithRedirect(auth, googleProvider);
    //   return;
    // } else {
    //   const result = await signInWithPopup(auth, googleProvider);
    //   return await handleAuthResult(result);
    // }
    const result = await signInWithPopup(auth, googleProvider);
    return await handleAuthResult(result);
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

/**
 * Handle redirect result after Google auth (for mobile)
 */
export const handleRedirectAuth = async () => {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      return await handleAuthResult(result);
    }
  } catch (error) {
    console.error("Error handling redirect result:", error);
  }
};

/**
 * Shared logic for handling Firebase result + backend login
 */
const handleAuthResult = async (result) => {
  const user = result.user;

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
    throw new Error(`Backend registration failed: ${response.statusText}`);
  }

  const userData = await response.json();

  const combinedUserData = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    ...userData,
    user_id: userData.user_id || user.uid,
  };

  localStorage.setItem("user", JSON.stringify(combinedUserData));
  console.log("User data stored in localStorage");

  return combinedUserData;
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

    localStorage.setItem(
      "user",
      JSON.stringify({
        ...user,
        ...updatedUserData,
      })
    );

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

    localStorage.setItem(
      "user",
      JSON.stringify({
        ...user,
        ...userData,
      })
    );

    return userData;
  } catch (error) {
    console.error("Error getting user status:", error);
    throw error;
  }
};
