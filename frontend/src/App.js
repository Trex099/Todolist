import React, { useState, useEffect } from 'react';
import './App.css';

const App = () => {
  const [tasks, setTasks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Task form state
  const [formData, setFormData] = useState({
    title: '',
    category: 'Frontend',
    status: 'To Do',
    priority: 'Medium',
    description: ''
  });

  // Load tasks from localStorage on component mount
  useEffect(() => {
    const savedTasks = localStorage.getItem('codingTasks');
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks));
    }
  }, []);

  // Save tasks to localStorage whenever tasks change
  useEffect(() => {
    localStorage.setItem('codingTasks', JSON.stringify(tasks));
  }, [tasks]);

  const categories = ['Frontend', 'Backend', 'Bugfix', 'Research'];
  const statuses = ['To Do', 'In Progress', 'Done'];
  const priorities = ['Low', 'Medium', 'High'];

  const priorityColors = {
    'Low': 'bg-green-500',
    'Medium': 'bg-yellow-500', 
    'High': 'bg-red-500'
  };

  const statusColors = {
    'To Do': 'bg-gray-600',
    'In Progress': 'bg-blue-600',
    'Done': 'bg-green-600'
  };

  const categoryColors = {
    'Frontend': 'bg-purple-600',
    'Backend': 'bg-orange-600',
    'Bugfix': 'bg-red-600',
    'Research': 'bg-teal-600'
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    if (editingTask) {
      // Update existing task
      setTasks(tasks.map(task => 
        task.id === editingTask.id 
          ? { ...task, ...formData, updatedAt: new Date().toISOString() }
          : task
      ));
      setEditingTask(null);
    } else {
      // Create new task
      const newTask = {
        id: Date.now(),
        ...formData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setTasks([...tasks, newTask]);
    }

    // Reset form
    setFormData({
      title: '',
      category: 'Frontend',
      status: 'To Do',
      priority: 'Medium',
      description: ''
    });
    setShowForm(false);
  };

  const handleEdit = (task) => {
    setFormData({
      title: task.title,
      category: task.category,
      status: task.status,
      priority: task.priority,
      description: task.description || ''
    });
    setEditingTask(task);
    setShowForm(true);
  };

  const handleDelete = (taskId) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  const handleStatusChange = (taskId, newStatus) => {
    setTasks(tasks.map(task =>
      task.id === taskId
        ? { ...task, status: newStatus, updatedAt: new Date().toISOString() }
        : task
    ));
  };

  // Filter and search tasks
  const filteredTasks = tasks.filter(task => {
    const matchesFilter = filter === 'all' || 
      filter === 'category' || 
      task.status.toLowerCase() === filter.toLowerCase() ||
      task.category.toLowerCase() === filter.toLowerCase() ||
      task.priority.toLowerCase() === filter.toLowerCase();
    
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const getTasksByStatus = (status) => {
    return filteredTasks.filter(task => task.status === status);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Coding Project Manager</h1>
              <p className="text-gray-300 mt-1">Organize your development tasks efficiently</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
            >
              <span className="text-xl">+</span>
              New Task
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Tasks</option>
              <option value="to do">To Do</option>
              <option value="in progress">In Progress</option>
              <option value="done">Done</option>
              <option value="frontend">Frontend</option>
              <option value="backend">Backend</option>
              <option value="bugfix">Bugfix</option>
              <option value="research">Research</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">{getTasksByStatus('To Do').length}</div>
            <div className="text-gray-400">To Do</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-400">{getTasksByStatus('In Progress').length}</div>
            <div className="text-gray-400">In Progress</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-400">{getTasksByStatus('Done').length}</div>
            <div className="text-gray-400">Completed</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-400">{tasks.length}</div>
            <div className="text-gray-400">Total Tasks</div>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statuses.map(status => (
            <div key={status} className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${statusColors[status]}`}></span>
                {status}
                <span className="ml-auto bg-gray-700 text-sm px-2 py-1 rounded">
                  {getTasksByStatus(status).length}
                </span>
              </h3>
              
              <div className="space-y-4">
                {getTasksByStatus(status).map(task => (
                  <div key={task.id} className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors duration-200">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-white">{task.title}</h4>
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() => handleEdit(task)}
                          className="text-gray-400 hover:text-blue-400 transition-colors"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(task.id)}
                          className="text-gray-400 hover:text-red-400 transition-colors"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {task.description && (
                      <p className="text-gray-300 text-sm mb-3">{task.description}</p>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full text-white ${categoryColors[task.category]}`}>
                          {task.category}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full text-white ${priorityColors[task.priority]}`}>
                          {task.priority}
                        </span>
                      </div>
                      
                      <div className="flex gap-1">
                        {statuses.map(newStatus => (
                          newStatus !== task.status && (
                            <button
                              key={newStatus}
                              onClick={() => handleStatusChange(task.id, newStatus)}
                              className={`text-xs px-2 py-1 rounded text-white hover:opacity-80 transition-opacity ${statusColors[newStatus]}`}
                              title={`Move to ${newStatus}`}
                            >
                              {newStatus === 'To Do' ? '📋' : newStatus === 'In Progress' ? '⚡' : '✅'}
                            </button>
                          )
                        ))}
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 mt-2">
                      Updated: {new Date(task.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Task Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingTask ? 'Edit Task' : 'Create New Task'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Task Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Enter task title..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Task description..."
                  rows="3"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    {priorities.map(priority => (
                      <option key={priority} value={priority}>{priority}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  {statuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors duration-200"
                >
                  {editingTask ? 'Update Task' : 'Create Task'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingTask(null);
                    setFormData({
                      title: '',
                      category: 'Frontend',
                      status: 'To Do',
                      priority: 'Medium',
                      description: ''
                    });
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg font-medium transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;