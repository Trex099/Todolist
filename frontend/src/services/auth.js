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
let authInitialized = false;
let authStateListeners = [];

// Token caching for performance
let cachedToken = null;
let tokenExpiry = 0;
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry

// Initialize Firebase Auth
const initializeAuth = () => {
    if (authInitialized) return;
    
    try {
        // First try to use Firebase from global window object (CDN)
        if (window.firebase && window.firebase.auth) {
            console.log('Using Firebase from global window object');
            auth = window.firebase.auth();
            googleProvider = new window.firebase.auth.GoogleAuthProvider();
            googleProvider.setCustomParameters({ prompt: 'select_account' });
        } else {
            // Fall back to npm-based Firebase
            console.log('Using npm-based Firebase');
            auth = npmAuth;
            googleProvider = npmGoogleProvider;
        }
        
        // Test if auth is working
        if (auth) {
            console.log('Firebase Auth initialized successfully');
            authInitialized = true;
            
            // Set up token refresh listener
            auth.onIdTokenChanged(async (user) => {
                if (user) {
                    try {
                        cachedToken = await user.getIdToken();
                        // Get token expiry time from decoded JWT
                        const payload = JSON.parse(atob(cachedToken.split('.')[1]));
                        tokenExpiry = payload.exp * 1000; // Convert to milliseconds
                        console.log('Token refreshed automatically');
                    } catch (error) {
                        console.error('Error refreshing token automatically:', error);
                        cachedToken = null;
                    }
                } else {
                    cachedToken = null;
                    tokenExpiry = 0;
                }
                
                // Notify auth state listeners
                authStateListeners.forEach(listener => {
                    try {
                        listener(user);
                    } catch (error) {
                        console.error('Error in auth state listener:', error);
                    }
                });
            });
        }
    } catch (error) {
        console.error("Error initializing Firebase Auth:", error);
        // Fall back to npm-based Firebase
        console.log('Error occurred, falling back to npm-based Firebase');
        auth = npmAuth;
        googleProvider = npmGoogleProvider;
        
        // Try again with fallbacks
        try {
            authInitialized = true;
        } catch (fallbackError) {
            console.error("Failed to initialize Firebase Auth even with fallback:", fallbackError);
        }
    }
};

// Initialize auth on module load
initializeAuth();

// Helper to ensure auth is initialized
const ensureAuth = () => {
    if (!authInitialized) {
        initializeAuth();
    }
    
    if (!auth) {
        throw new Error("Firebase Auth could not be initialized");
    }
};

// Sign in with email and password
export const loginWithEmailAndPassword = async (email, password) => {
    ensureAuth();
    
    try {
        // Clear any cached token
        cachedToken = null;
        
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
        // Enhance error messages for better UX
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            throw new Error('Invalid email or password. Please try again.');
        } else if (error.code === 'auth/too-many-requests') {
            throw new Error('Too many failed login attempts. Please try again later or reset your password.');
        }
        throw error;
    }
};

// Sign up with email and password
export const registerWithEmailAndPassword = async (email, password) => {
    ensureAuth();
    
    try {
        // Clear any cached token
        cachedToken = null;
        
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
        if (error.code === 'auth/email-already-in-use') {
            throw new Error('This email is already in use. Please try signing in instead.');
        } else if (error.code === 'auth/weak-password') {
            throw new Error('Password is too weak. Please choose a stronger password.');
        }
        throw error;
    }
};

// Sign in with Google
export const signInWithGoogle = async () => {
    ensureAuth();
    
    try {
        // Clear any cached token
        cachedToken = null;
        
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
        // Check for user canceling the popup
        if (error.code === 'auth/popup-closed-by-user') {
            throw new Error('Google sign-in was cancelled. Please try again.');
        } else if (error.code === 'auth/popup-blocked') {
            throw new Error('Pop-up was blocked by your browser. Please allow pop-ups for this site.');
        }
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
        // Clear cached token
        cachedToken = null;
        tokenExpiry = 0;
        
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
    if (!auth) {
        console.warn("Firebase Auth not initialized when getting current user");
        return null;
    }
    return auth.currentUser;
};

// Get the auth token for API requests with caching for better performance
export const getAuthToken = async (forceRefresh = false) => {
    if (!auth || !auth.currentUser) {
        cachedToken = null;
        return null;
    }
    
    try {
        const now = Date.now();
        
        // Return cached token if it's still valid and refresh not forced
        if (!forceRefresh && cachedToken && tokenExpiry > (now + TOKEN_REFRESH_THRESHOLD)) {
            return cachedToken;
        }
        
        // Token needs refresh
        cachedToken = await auth.currentUser.getIdToken(true);
        
        // Update expiry time by decoding the token
        try {
            const payload = JSON.parse(atob(cachedToken.split('.')[1]));
            tokenExpiry = payload.exp * 1000; // Convert to milliseconds
        } catch (e) {
            console.error('Error decoding JWT payload:', e);
            // Default to 1 hour if we can't decode
            tokenExpiry = now + 3600 * 1000;
        }
        
        return cachedToken;
    } catch (error) {
        console.error('Error getting auth token:', error);
        cachedToken = null;
        return null;
    }
};

// Subscribe to auth state changes
export const onAuthStateChange = (callback) => {
    ensureAuth();
    
    try {
        // Add to our custom listeners
        if (typeof callback === 'function' && !authStateListeners.includes(callback)) {
            authStateListeners.push(callback);
        }
        
        // Handle both compat and modular SDKs
        if (window.firebase && window.firebase.auth) {
            return auth.onAuthStateChanged(callback);
        } else {
            return onAuthStateChanged(auth, callback);
        }
    } catch (error) {
        console.error('Error setting up auth state listener:', error);
        
        // Fallback: call the callback with null immediately
        setTimeout(() => callback(null), 0);
        return () => {
            // Remove from listeners on unsubscribe
            const index = authStateListeners.indexOf(callback);
            if (index !== -1) {
                authStateListeners.splice(index, 1);
            }
        };
    }
};

// Send password reset email
export const resetPassword = async (email) => {
    ensureAuth();
    
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
        if (error.code === 'auth/user-not-found') {
            throw new Error('No account found with this email address.');
        }
        throw error;
    }
};

// Force token refresh when needed
export const refreshAuthToken = async () => {
    if (!auth || !auth.currentUser) {
        return null;
    }
    
    try {
        cachedToken = await auth.currentUser.getIdToken(true);
        return cachedToken;
    } catch (error) {
        console.error('Error refreshing auth token:', error);
        return null;
    }
};

// Export the auth object for direct access if needed
export default auth; 