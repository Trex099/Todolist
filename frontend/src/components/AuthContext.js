import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
    onAuthStateChange, 
    loginWithEmailAndPassword,
    registerWithEmailAndPassword,
    signInWithGoogle,
    logout as firebaseLogout
} from '../services/auth';
import { checkAuthStatus } from '../services/api';

// Create the context
const AuthContext = createContext();

// Create a provider component
export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Subscribe to authentication state changes
        const unsubscribe = onAuthStateChange(async (user) => {
            setLoading(true);
            
            if (user) {
                try {
                    // Verify with our backend
                    const userData = await checkAuthStatus();
                    setCurrentUser({
                        ...userData,
                        firebaseUser: user
                    });
                } catch (error) {
                    console.error('Error verifying user with backend:', error);
                    setError(error.message);
                    setCurrentUser(null);
                }
            } else {
                setCurrentUser(null);
            }
            
            setLoading(false);
        });

        // Cleanup subscription
        return () => unsubscribe();
    }, []);

    // Login function
    const login = async (email, password) => {
        setLoading(true);
        setError(null);
        try {
            await loginWithEmailAndPassword(email, password);
            // Auth state listener will handle setting the user
            return true;
        } catch (error) {
            setError(error.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    // Register function
    const register = async (email, password) => {
        setLoading(true);
        setError(null);
        try {
            await registerWithEmailAndPassword(email, password);
            // Auth state listener will handle setting the user
            return true;
        } catch (error) {
            setError(error.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    // Google sign-in function
    const loginWithGoogle = async () => {
        setLoading(true);
        setError(null);
        try {
            await signInWithGoogle();
            // Auth state listener will handle setting the user
            return true;
        } catch (error) {
            setError(error.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    // Logout function
    const logout = async () => {
        setLoading(true);
        setError(null);
        try {
            await firebaseLogout();
            setCurrentUser(null);
            return true;
        } catch (error) {
            setError(error.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    // Clear any errors
    const clearError = () => {
        setError(null);
    };

    const value = {
        currentUser,
        loading,
        error,
        login,
        register,
        loginWithGoogle,
        logout,
        clearError
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook to use the auth context
export const useAuth = () => {
    return useContext(AuthContext);
};

export default AuthContext; 