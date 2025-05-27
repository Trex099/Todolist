import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const ProtectedRoute = ({ children }) => {
    const { currentUser, loading } = useAuth();
    
    // Show loading spinner while checking authentication
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="text-center">
                    <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-white">Authenticating...</p>
                </div>
            </div>
        );
    }
    
    // Redirect to login if not authenticated
    if (!currentUser) {
        return <Navigate to="/login" replace />;
    }
    
    // Render the protected content
    return children;
};

export default ProtectedRoute; 