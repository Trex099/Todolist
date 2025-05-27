// Import the functions from the Firebase SDKs
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider,
  connectAuthEmulator,
  signInWithPopup,
  signInWithCredential,
  OAuthProvider 
} from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBaoqHtlrMIyAfWmcH1Hh9R948eqicrTEI",
  authDomain: "todo-a124a.firebaseapp.com",
  projectId: "todo-a124a",
  storageBucket: "todo-a124a.appspot.com",
  messagingSenderId: "1077354135346",
  appId: "1:1077354135346:web:c0161f4de22ad39df7612b",
  measurementId: "G-QJCJCCWPXQ"
};

// Add debugging
console.log("Initializing Firebase with config:", JSON.stringify(firebaseConfig));

// Initialize Firebase
let app;
let auth;
let googleProvider;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();

  // Add additional OAuth scopes for Google provider
  googleProvider.addScope('profile');
  googleProvider.addScope('email');
  
  // Set custom parameters
  googleProvider.setCustomParameters({
    prompt: 'select_account'
  });
  
  console.log("Firebase initialized successfully in module");
} catch (error) {
  console.error("Error initializing Firebase:", error);
}

export { auth, googleProvider };
export default app; 