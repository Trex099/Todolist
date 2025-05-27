// Firebase Authentication Service
// This module tries to use the Firebase Auth initialized in index.html first
// If that's not available, it falls back to the npm-based Firebase SDK

// Import the Firebase auth module from local config as fallback
import { auth as npmAuth, googleProvider as npmGoogleProvider } from './firebaseConfig';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  signInWithPopup,
  sendPasswordResetEmail
} from "firebase/auth";

// Create variables to hold auth references
let auth = null;
let googleProvider = null;

// Check if Firebase is already initialized from the CDN in index.html
try {
    if (window.firebase && window.firebase.auth) {
        console.log('Using Firebase from global window object');
        auth = window.firebase.auth();
        googleProvider = new window.firebase.auth.GoogleAuthProvider();
    } else {
        // Fall back to npm-based Firebase
        console.log('Falling back to npm-based Firebase');
        auth = npmAuth;
        googleProvider = npmGoogleProvider;
    }
    
    // Test if auth is working
    if (auth) {
        console.log('Firebase Auth initialized successfully');
    }
} catch (error) {
    console.error("Error initializing Firebase Auth:", error);
    // Fall back to npm-based Firebase
    console.log('Error occurred, falling back to npm-based Firebase');
    auth = npmAuth;
    googleProvider = npmGoogleProvider;
}

// Sign in with email and password
export const loginWithEmailAndPassword = async (email, password) => {
    if (!auth) {
        console.error("Firebase Auth not initialized");
        throw new Error("Firebase Auth not initialized");
    }
    
    try {
        // Handle both compat and modular SDKs
        if (window.firebase && window.firebase.auth) {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            return userCredential.user;
        } else {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            return userCredential.user;
        }
    } catch (error) {
        console.error('Error signing in:', error);
        throw error;
    }
};

// Sign up with email and password
export const registerWithEmailAndPassword = async (email, password) => {
    if (!auth) {
        console.error("Firebase Auth not initialized");
        throw new Error("Firebase Auth not initialized");
    }
    
    try {
        // Handle both compat and modular SDKs
        if (window.firebase && window.firebase.auth) {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            return userCredential.user;
        } else {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            return userCredential.user;
        }
    } catch (error) {
        console.error('Error registering:', error);
        throw error;
    }
};

// Sign in with Google
export const signInWithGoogle = async () => {
    if (!auth || !googleProvider) {
        console.error("Firebase Auth not initialized");
        throw new Error("Firebase Auth not initialized");
    }
    
    try {
        // Handle both compat and modular SDKs
        if (window.firebase && window.firebase.auth) {
            const result = await auth.signInWithPopup(googleProvider);
            return result.user;
        } else {
            const result = await signInWithPopup(auth, googleProvider);
            return result.user;
        }
    } catch (error) {
        console.error('Error signing in with Google:', error);
        throw error;
    }
};

// Sign out
export const logout = async () => {
    if (!auth) {
        console.error("Firebase Auth not initialized");
        return false;
    }
    
    try {
        // Handle both compat and modular SDKs
        if (window.firebase && window.firebase.auth) {
            await auth.signOut();
        } else {
            await signOut(auth);
        }
        return true;
    } catch (error) {
        console.error('Error signing out:', error);
        throw error;
    }
};

// Get the current authentication state
export const getCurrentUser = () => {
    return auth ? auth.currentUser : null;
};

// Get the auth token for API requests
export const getAuthToken = async () => {
    if (!auth || !auth.currentUser) {
        return null;
    }
    
    try {
        return await auth.currentUser.getIdToken(true);
    } catch (error) {
        console.error('Error getting auth token:', error);
        return null;
    }
};

// Subscribe to auth state changes
export const onAuthStateChange = (callback) => {
    if (!auth) {
        // If auth is not available, call the callback with null immediately
        setTimeout(() => callback(null), 0);
        return () => {}; // Return a no-op unsubscribe function
    }
    
    // Handle both compat and modular SDKs
    if (window.firebase && window.firebase.auth) {
        return auth.onAuthStateChanged(callback);
    } else {
        return onAuthStateChanged(auth, callback);
    }
};

// Send password reset email
export const resetPassword = async (email) => {
    if (!auth) {
        console.error("Firebase Auth not initialized");
        throw new Error("Firebase Auth not initialized");
    }
    
    try {
        // Handle both compat and modular SDKs
        if (window.firebase && window.firebase.auth) {
            await auth.sendPasswordResetEmail(email);
        } else {
            await sendPasswordResetEmail(auth, email);
        }
        return true;
    } catch (error) {
        console.error('Error sending password reset email:', error);
        throw error;
    }
};

// Export the auth object for direct access if needed
export default auth; 