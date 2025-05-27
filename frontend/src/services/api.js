import axios from 'axios';
import { getAuthToken } from './auth';

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

// Add an interceptor to attach the auth token to every request
apiClient.interceptors.request.use(async (config) => {
  try {
    const token = await getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return config;
  }
});

// Error handling wrapper
const handleApiRequest = async (apiCall) => {
  try {
    return await apiCall();
  } catch (error) {
    console.error('API Error:', error);
    
    // Handle authentication errors
    if (error.response && error.response.status === 401) {
      // You can redirect to login page or trigger a sign-out here
      console.error('Authentication error: Please log in again');
    }
    
    // If we couldn't reach the API or the API returned an error, throw it
    // so the UI can handle it appropriately
    throw error;
  }
};

// Authentication API functions
export const checkAuthStatus = async () => {
  return handleApiRequest(async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  });
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