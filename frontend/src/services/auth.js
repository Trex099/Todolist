import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail
} from 'firebase/auth';

// Firebase configuration - Using hardcoded values for development
// In production, you should move these to environment variables
const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyBmTNY9El6JcfSw4Fkyf6ujfSzgq2N-JlM",
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "todo-a124a.firebaseapp.com",
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "todo-a124a",
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "todo-a124a.appspot.com",
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "264759958019",
    appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:264759958019:web:3955a5d96a9675c6ed53b4"
};

// Initialize Firebase with error handling
let auth;
let googleProvider;

try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
} catch (error) {
    console.error("Error initializing Firebase:", error);
}

// Sign in with email and password
export const loginWithEmailAndPassword = async (email, password) => {
    if (!auth) {
        console.error("Firebase not initialized");
        throw new Error("Firebase not initialized");
    }
    
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        console.error('Error signing in:', error);
        throw error;
    }
};

// Sign up with email and password
export const registerWithEmailAndPassword = async (email, password) => {
    if (!auth) {
        console.error("Firebase not initialized");
        throw new Error("Firebase not initialized");
    }
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        console.error('Error registering:', error);
        throw error;
    }
};

// Sign in with Google
export const signInWithGoogle = async () => {
    if (!auth || !googleProvider) {
        console.error("Firebase not initialized");
        throw new Error("Firebase not initialized");
    }
    
    try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error) {
        console.error('Error signing in with Google:', error);
        throw error;
    }
};

// Sign out
export const logout = async () => {
    if (!auth) {
        console.error("Firebase not initialized");
        return true;
    }
    
    try {
        await signOut(auth);
        return true;
    } catch (error) {
        console.error('Error signing out:', error);
        throw error;
    }
};

// Get the current authentication state
export const getCurrentUser = () => {
    return auth?.currentUser || null;
};

// Get the auth token for API requests
export const getAuthToken = async () => {
    const user = auth?.currentUser;
    if (!user) {
        return null;
    }
    
    return user.getIdToken(true);
};

// Subscribe to auth state changes
export const onAuthStateChange = (callback) => {
    if (!auth) {
        setTimeout(() => callback(null), 0);
        return () => {};
    }
    
    return onAuthStateChanged(auth, callback);
};

// Send password reset email
export const resetPassword = async (email) => {
    if (!auth) {
        console.error("Firebase not initialized");
        throw new Error("Firebase not initialized");
    }
    
    try {
        await sendPasswordResetEmail(auth, email);
        return true;
    } catch (error) {
        console.error('Error sending password reset email:', error);
        throw error;
    }
};

export default auth || null; 