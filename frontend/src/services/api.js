import axios from 'axios';

// Determine the API base URL based on the environment
const getApiBaseUrl = () => {
  // In production on Vercel, the API is available at the same domain
  if (process.env.NODE_ENV === 'production') {
    return '/api';
  }
  // In development, use the local backend server
  return 'http://localhost:8000/api';
};

// Create axios instance with the correct base URL
const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// API functions for todos
export const fetchTodos = async () => {
  const response = await apiClient.get('/todos');
  return response.data;
};

export const createTodo = async (todo) => {
  const response = await apiClient.post('/todos', todo);
  return response.data;
};

export const updateTodo = async (id, todo) => {
  const response = await apiClient.put(`/todos/${id}`, todo);
  return response.data;
};

export const deleteTodo = async (id) => {
  await apiClient.delete(`/todos/${id}`);
  return { id };
};

// API functions for status checks
export const fetchStatusChecks = async () => {
  const response = await apiClient.get('/status');
  return response.data;
};

export const createStatusCheck = async (clientName) => {
  const response = await apiClient.post('/status', { client_name: clientName });
  return response.data;
}; 