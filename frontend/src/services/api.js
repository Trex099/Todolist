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
  timeout: 15000, // Increased timeout for slower connections
});

// Add an interceptor to attach the auth token to every request
apiClient.interceptors.request.use(async (config) => {
  try {
    const token = await getAuthToken();
    if (token) {
      console.log('Adding auth token to request');
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn('No auth token available for request');
    }
    return config;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return config;
  }
});

// Add a response interceptor to log detailed error information
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // outside of the 2xx range
      console.error('API Error Response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers,
        url: error.config.url,
        method: error.config.method
      });

      // Special handling for 500 errors
      if (error.response.status === 500) {
        console.error('Server error details:', error.response.data);
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('API Request Error (No Response):', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('API Request Setup Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

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
    
    // Format the error message more clearly for the UI
    let errorMessage = 'An unknown error occurred';
    
    if (error.response) {
      if (error.response.status === 500) {
        errorMessage = 'Server error: The application encountered an internal error';
        
        // Try to extract more detailed error information
        if (error.response.data && error.response.data.detail) {
          errorMessage += ` - ${error.response.data.detail}`;
        }
      } else if (error.response.data && error.response.data.detail) {
        errorMessage = error.response.data.detail;
      } else {
        errorMessage = `Error ${error.response.status}: ${error.response.statusText}`;
      }
    } else if (error.message) {
      errorMessage = error.message;
      
      if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please check your connection and try again.';
      }
    }
    
    // Rethrow with better message
    const enhancedError = new Error(errorMessage);
    enhancedError.originalError = error;
    throw enhancedError;
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