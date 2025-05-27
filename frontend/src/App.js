import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { format, isAfter, isBefore, isToday, addDays, parseISO, isValid } from 'date-fns';
import './App.css';

const App = () => {
  const [tasks, setTasks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);

  // Task form state
  const [formData, setFormData] = useState({
    title: '',
    category: 'Frontend',
    status: 'To Do',
    priority: 'Medium',
    description: '',
    dueDate: '',
    githubIssue: '',
    estimatedHours: '',
    tags: []
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

  const categories = ['Frontend', 'Backend', 'Bugfix', 'Research', 'DevOps', 'Testing'];
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
    'Research': 'bg-teal-600',
    'DevOps': 'bg-indigo-600',
    'Testing': 'bg-pink-600'
  };

  const getDueDateStatus = (dueDate) => {
    if (!dueDate) return null;
    const due = parseISO(dueDate);
    if (!isValid(due)) return null;
    
    if (isToday(due)) return 'today';
    if (isBefore(due, new Date())) return 'overdue';
    if (isBefore(due, addDays(new Date(), 3))) return 'upcoming';
    return 'future';
  };

  const getDueDateColor = (status) => {
    switch (status) {
      case 'overdue': return 'text-red-400 bg-red-900';
      case 'today': return 'text-yellow-400 bg-yellow-900';
      case 'upcoming': return 'text-orange-400 bg-orange-900';
      default: return 'text-gray-400 bg-gray-700';
    }
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
      description: '',
      dueDate: '',
      githubIssue: '',
      estimatedHours: '',
      tags: []
    });
    setShowForm(false);
    setShowMarkdownPreview(false);
  };

  const handleEdit = (task) => {
    setFormData({
      title: task.title,
      category: task.category,
      status: task.status,
      priority: task.priority,
      description: task.description || '',
      dueDate: task.dueDate || '',
      githubIssue: task.githubIssue || '',
      estimatedHours: task.estimatedHours || '',
      tags: task.tags || []
    });
    setEditingTask(task);
    setShowForm(true);
  };

  const handleDelete = (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      setTasks(tasks.filter(task => task.id !== taskId));
    }
  };

  const handleStatusChange = (taskId, newStatus) => {
    setTasks(tasks.map(task =>
      task.id === taskId
        ? { ...task, status: newStatus, updatedAt: new Date().toISOString() }
        : task
    ));
  };

  // Enhanced sorting function
  const sortTasks = (tasksToSort) => {
    return [...tasksToSort].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'dueDate':
          aValue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          bValue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          break;
        case 'priority':
          const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
          aValue = priorityOrder[a.priority] || 0;
          bValue = priorityOrder[b.priority] || 0;
          break;
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'category':
          aValue = a.category.toLowerCase();
          bValue = b.category.toLowerCase();
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        default: // updatedAt
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  };

  // Filter and search tasks
  const filteredTasks = tasks.filter(task => {
    const matchesFilter = filter === 'all' || 
      task.status.toLowerCase() === filter.toLowerCase() ||
      task.category.toLowerCase() === filter.toLowerCase() ||
      task.priority.toLowerCase() === filter.toLowerCase() ||
      (filter === 'overdue' && getDueDateStatus(task.dueDate) === 'overdue') ||
      (filter === 'today' && getDueDateStatus(task.dueDate) === 'today') ||
      (filter === 'upcoming' && getDueDateStatus(task.dueDate) === 'upcoming');
    
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.githubIssue && task.githubIssue.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesFilter && matchesSearch;
  });

  const sortedTasks = sortTasks(filteredTasks);

  const getTasksByStatus = (status) => {
    return sortedTasks.filter(task => task.status === status);
  };

  // Markdown renderer components
  const MarkdownComponents = {
    code({node, inline, className, children, ...props}) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter
          style={oneDark}
          language={match[1]}
          PreTag="div"
          className="rounded-md"
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className="bg-gray-800 px-1 py-0.5 rounded text-sm" {...props}>
          {children}
        </code>
      );
    }
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

      {/* Filters, Search, and Sorting */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search tasks, descriptions, or GitHub issues..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Tasks</option>
              <option value="overdue">🔴 Overdue</option>
              <option value="today">🟡 Due Today</option>
              <option value="upcoming">🟠 Due Soon</option>
              <option value="to do">To Do</option>
              <option value="in progress">In Progress</option>
              <option value="done">Done</option>
              <option value="frontend">Frontend</option>
              <option value="backend">Backend</option>
              <option value="bugfix">Bugfix</option>
              <option value="research">Research</option>
              <option value="devops">DevOps</option>
              <option value="testing">Testing</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="updatedAt">Last Updated</option>
              <option value="createdAt">Created Date</option>
              <option value="dueDate">Due Date</option>
              <option value="priority">Priority</option>
              <option value="title">Title</option>
              <option value="category">Category</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white hover:bg-gray-700 focus:outline-none focus:border-blue-500"
              title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>

        {/* Enhanced Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
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
            <div className="text-2xl font-bold text-red-400">
              {tasks.filter(task => getDueDateStatus(task.dueDate) === 'overdue').length}
            </div>
            <div className="text-gray-400">Overdue</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-400">
              {tasks.filter(task => getDueDateStatus(task.dueDate) === 'today').length}
            </div>
            <div className="text-gray-400">Due Today</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-400">{tasks.length}</div>
            <div className="text-gray-400">Total</div>
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
                {getTasksByStatus(status).map(task => {
                  const dueDateStatus = getDueDateStatus(task.dueDate);
                  return (
                    <div key={task.id} className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors duration-200">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-white pr-2">{task.title}</h4>
                        <div className="flex gap-1 ml-2 flex-shrink-0">
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

                      {/* Due Date */}
                      {task.dueDate && (
                        <div className={`text-xs px-2 py-1 rounded mb-2 inline-block ${getDueDateColor(dueDateStatus)}`}>
                          📅 Due: {format(parseISO(task.dueDate), 'MMM dd, yyyy')}
                          {dueDateStatus === 'overdue' && ' (Overdue)'}
                          {dueDateStatus === 'today' && ' (Today)'}
                        </div>
                      )}

                      {/* Estimated Hours */}
                      {task.estimatedHours && (
                        <div className="text-xs text-gray-400 mb-2">
                          ⏱️ Est: {task.estimatedHours}h
                        </div>
                      )}

                      {/* GitHub Issue Link */}
                      {task.githubIssue && (
                        <div className="mb-2">
                          <a
                            href={task.githubIssue.startsWith('http') ? task.githubIssue : `https://github.com/${task.githubIssue}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:text-blue-300 underline"
                          >
                            🔗 GitHub: {task.githubIssue}
                          </a>
                        </div>
                      )}

                      {/* Description with Markdown Support */}
                      {task.description && (
                        <div className="text-gray-300 text-sm mb-3 prose prose-invert prose-sm max-w-none">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={MarkdownComponents}
                          >
                            {task.description}
                          </ReactMarkdown>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex gap-2 flex-wrap">
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
                        Updated: {format(parseISO(task.updatedAt), 'MMM dd, yyyy HH:mm')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Enhanced Task Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                <div>
                  <label className="block text-sm font-medium mb-1">Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Estimated Hours</label>
                  <input
                    type="number"
                    value={formData.estimatedHours}
                    onChange={(e) => setFormData({...formData, estimatedHours: e.target.value})}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    placeholder="0"
                    min="0"
                    step="0.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">GitHub Issue (optional)</label>
                <input
                  type="text"
                  value={formData.githubIssue}
                  onChange={(e) => setFormData({...formData, githubIssue: e.target.value})}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="owner/repo#123 or full URL"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium">Description (Markdown Supported)</label>
                  <button
                    type="button"
                    onClick={() => setShowMarkdownPreview(!showMarkdownPreview)}
                    className="text-xs bg-gray-600 hover:bg-gray-500 px-2 py-1 rounded"
                  >
                    {showMarkdownPreview ? 'Edit' : 'Preview'}
                  </button>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className={showMarkdownPreview ? 'hidden lg:block' : ''}>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-mono text-sm"
                      placeholder="Task description... Supports markdown with code highlighting!"
                      rows="8"
                    />
                  </div>
                  
                  {(showMarkdownPreview || window.innerWidth >= 1024) && (
                    <div className="bg-gray-900 border border-gray-600 rounded-lg p-3 prose prose-invert prose-sm max-w-none overflow-auto max-h-48">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={MarkdownComponents}
                      >
                        {formData.description || '*Preview will appear here...*'}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
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
                    setShowMarkdownPreview(false);
                    setFormData({
                      title: '',
                      category: 'Frontend',
                      status: 'To Do',
                      priority: 'Medium',
                      description: '',
                      dueDate: '',
                      githubIssue: '',
                      estimatedHours: '',
                      tags: []
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