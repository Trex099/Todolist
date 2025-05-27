import React from 'react';
import { useAuth } from './AuthContext';
import App from '../App'; 

const TodoApp = () => {
  const { currentUser, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-gray-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">Coding Project Manager</h1>
          <div className="flex items-center space-x-4">
            <div className="text-gray-300">
              {currentUser && currentUser.email}
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      
      <div className="flex-grow">
        <App />
      </div>
    </div>
  );
};

export default TodoApp; 