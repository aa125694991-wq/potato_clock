// @ts-ignore
import { initializeApp } from "firebase/app";
// @ts-ignore
import { getAuth, onAuthStateChanged, signInAnonymously, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
// @ts-ignore
import type { User } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// @ts-ignore
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAUtfXKKsiCuFyCUB8r6cli3yUk8e7YHxk",
  authDomain: "potatoclock-6d2e3.firebaseapp.com",
  projectId: "potatoclock-6d2e3",
  storageBucket: "potatoclock-6d2e3.firebasestorage.app",
  messagingSenderId: "927965699690",
  appId: "1:927965699690:web:9edd485869025b5399f413",
  measurementId: "G-SPQNB4Y2MQ"
};

// Initialize Firebase
let app;
let auth: any;
let db;
let analytics;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  if (typeof window !== 'undefined') {
    analytics = getAnalytics(app);
  }
} catch (error) {
  console.warn("Firebase config is missing or invalid. App will run in demo/offline mode where possible.", error);
}

export { auth, db, analytics };
export { onAuthStateChanged, signInAnonymously, GoogleAuthProvider, signInWithPopup };
export type { User };