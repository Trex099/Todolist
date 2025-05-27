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
  // Add timeout to prevent infinite loading
  timeout: 10000,
});

// Error handling wrapper
const handleApiRequest = async (apiCall) => {
  try {
    return await apiCall();
  } catch (error) {
    console.error('API Error:', error);
    // If we couldn't reach the API or the API returned an error, throw it
    // so the UI can handle it appropriately
    throw error;
  }
};

// API functions for todos
export const fetchTodos = async () => {
  return handleApiRequest(async () => {
    const response = await apiClient.get('/todos');
    return response.data;
  });
};

export const createTodo = async (todo) => {
  return handleApiRequest(async () => {
    const response = await apiClient.post('/todos', todo);
    return response.data;
  });
};

export const updateTodo = async (id, todo) => {
  return handleApiRequest(async () => {
    const response = await apiClient.put(`/todos/${id}`, todo);
    return response.data;
  });
};

export const deleteTodo = async (id) => {
  return handleApiRequest(async () => {
    await apiClient.delete(`/todos/${id}`);
    return { id };
  });
};

// API functions for status checks
export const fetchStatusChecks = async () => {
  return handleApiRequest(async () => {
    const response = await apiClient.get('/status');
    return response.data;
  });
};

export const createStatusCheck = async (clientName) => {
  return handleApiRequest(async () => {
    const response = await apiClient.post('/status', { client_name: clientName });
    return response.data;
  });
}; 