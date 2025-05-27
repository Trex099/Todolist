// Firebase Authentication Service
// This module uses the Firebase Auth already initialized in index.html

// Create variables to hold auth references
let auth = null;
let googleProvider = null;

// Initialize Firebase auth from the global window object
try {
    if (window.firebase && window.firebase.auth) {
        console.log('Using Firebase from global window object');
        auth = window.firebase.auth();
        googleProvider = new window.firebase.auth.GoogleAuthProvider();
    } else {
        console.error("Firebase Auth not available in window object");
    }
} catch (error) {
    console.error("Error initializing Firebase Auth:", error);
}

// Sign in with email and password
export const loginWithEmailAndPassword = async (email, password) => {
    if (!auth) {
        console.error("Firebase Auth not initialized");
        throw new Error("Firebase Auth not initialized");
    }
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        return userCredential.user;
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
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        return userCredential.user;
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
        const result = await auth.signInWithPopup(googleProvider);
        return result.user;
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
        await auth.signOut();
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
    
    return auth.onAuthStateChanged(callback);
};

// Send password reset email
export const resetPassword = async (email) => {
    if (!auth) {
        console.error("Firebase Auth not initialized");
        throw new Error("Firebase Auth not initialized");
    }
    
    try {
        await auth.sendPasswordResetEmail(email);
        return true;
    } catch (error) {
        console.error('Error sending password reset email:', error);
        throw error;
    }
};

// Export the auth object for direct access if needed
export default auth; 