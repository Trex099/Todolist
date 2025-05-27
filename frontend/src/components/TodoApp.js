import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { fetchTodos, createTodo, updateTodo, deleteTodo } from '../services/api';
import { format, isAfter, isBefore, isToday, addDays, parseISO, isValid } from 'date-fns';
import '../App.css';

const TodoApp = () => {
  const { currentUser, logout } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Load tasks from API on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Try to load from API
        try {
          const apiTasks = await fetchTodos();
          setTasks(apiTasks);
        } catch (apiError) {
          console.error("Could not load from API:", apiError);
          setError("Failed to load tasks. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-900">
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
      
      <main className="flex-grow p-4 md:p-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="spinner"></div>
          </div>
        ) : error ? (
          <div className="bg-red-700 text-white p-4 rounded-lg mb-6">
            {error}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h2 className="text-2xl font-bold text-white">Your Tasks</h2>
              <button
                onClick={() => setShowForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
              >
                Add New Task
              </button>
            </div>
            
            {tasks.length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-6 text-center">
                <p className="text-gray-400 text-lg">No tasks found. Create your first task!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {tasks.map(task => (
                  <div 
                    key={task.id} 
                    className="bg-gray-800 rounded-lg p-4 shadow-md"
                  >
                    <h3 className="text-xl font-bold text-white mb-2">{task.title}</h3>
                    <div className="flex gap-2 mb-2">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${task.category === 'Frontend' ? 'bg-purple-700' : 
                        task.category === 'Backend' ? 'bg-orange-700' : 
                        task.category === 'Bugfix' ? 'bg-red-700' : 
                        task.category === 'Research' ? 'bg-teal-700' : 
                        task.category === 'DevOps' ? 'bg-indigo-700' : 'bg-pink-700'}`}>
                        {task.category}
                      </span>
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                        task.status === 'To Do' ? 'bg-gray-600' :
                        task.status === 'In Progress' ? 'bg-blue-600' : 'bg-green-600'}`}>
                        {task.status}
                      </span>
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                        task.priority === 'Low' ? 'bg-green-600' :
                        task.priority === 'Medium' ? 'bg-yellow-600' : 'bg-red-600'}`}>
                        {task.priority}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-gray-300 mb-2 line-clamp-2">{task.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
      
      <footer className="bg-gray-800 py-4">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-center text-gray-400">© {new Date().getFullYear()} Coding Task Manager</p>
        </div>
      </footer>
    </div>
  );
};

export default TodoApp; 