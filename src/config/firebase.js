// Firebase configuration and initialization
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDJqTzTwd5CTHt8rLcF1-J4mdv97wivlxk",
  authDomain: "gantt-chart-ai.firebaseapp.com",
  projectId: "gantt-chart-ai",
  storageBucket: "gantt-chart-ai.firebasestorage.app",
  messagingSenderId: "948305297524",
  appId: "1:948305297524:web:c0e24319d5d4661aee9121",
  measurementId: "G-3KKVRFQ91C"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize Analytics (only in browser, not in SSR)
let analytics = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { analytics };
export default app;


