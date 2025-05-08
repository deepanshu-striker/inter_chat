// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB1RTIw-fR37LqoDjl0XvWQIwC1a_WVeiw",
  authDomain: "interchat-27029.firebaseapp.com",
  projectId: "interchat-27029",
  storageBucket: "interchat-27029.appspot.com", // Note: corrected to standard format
  messagingSenderId: "158155880178",
  appId: "1:158155880178:web:4f7373e29483fd9b3a026b",
  measurementId: "G-ENW8SJNVGK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth, app };

