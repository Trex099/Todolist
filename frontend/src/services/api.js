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

// Retry configuration 
const MAX_RETRIES = 2;
const RETRY_DELAY = 800; // ms
let isRefreshingToken = false;
let tokenRefreshPromise = null;

// Sleep function for retry delay
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Add an interceptor to attach the auth token to every request
apiClient.interceptors.request.use(async (config) => {
  try {
    // For requests that don't need auth (like public endpoints)
    if (config.noAuth) {
      return config;
    }
    
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
        url: error.config.url,
        method: error.config.method
      });

      // Special handling for 500 errors
      if (error.response.status === 500) {
        console.error('Server error details:', error.response.data);
      }
      
      // Special handling for auth errors
      if (error.response.status === 401) {
        if (error.config && !error.config.__isRetryRequest) {
          // Check if token refresh is in progress
          const originalRequest = error.config;
          originalRequest.__isRetryRequest = true;
          
          // If token refresh is already in progress, wait for it to complete
          if (isRefreshingToken) {
            return tokenRefreshPromise.then(() => {
              // Try request again with new token
              return apiClient(originalRequest);
            }).catch(() => {
              // If refresh fails, reject the original request
              return Promise.reject(error);
            });
          }
          
          // Try to refresh token
          console.log("Authentication error, attempting to refresh token...");
          isRefreshingToken = true;
          tokenRefreshPromise = new Promise((resolve, reject) => {
            // Implement token refresh logic here if needed
            // For now just wait a moment then try again as the token might be new
            setTimeout(() => {
              isRefreshingToken = false;
              resolve();
            }, 1000);
          });
          
          return tokenRefreshPromise.then(() => {
            // Try request again after token refresh
            return apiClient(originalRequest);
          }).catch(() => {
            // If refresh fails, reject the original request
            return Promise.reject(error);
          });
        }
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

// Error handling wrapper with retry logic
const handleApiRequest = async (apiCall, options = {}) => {
  const { retries = MAX_RETRIES, retryDelay = RETRY_DELAY, noAuth = false } = options;
  let lastError = null;
  
  // Try the API call with retries
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // If not first attempt, add a delay
      if (attempt > 0) {
        await sleep(retryDelay * attempt);
        console.log(`Retry attempt ${attempt} for API call`);
      }
      
      return await apiCall();
    } catch (error) {
      lastError = error;
      
      // Don't retry if it's a 4xx error (except for 401 which is handled by the interceptor)
      if (error.response && error.response.status >= 400 && error.response.status < 500 && error.response.status !== 401) {
        break;
      }
      
      // Don't retry on last attempt
      if (attempt === retries) {
        console.error(`API call failed after ${retries} retries`);
        break;
      }
    }
  }
  
  // If we get here, all attempts failed
  console.error('API Error:', lastError);
  
  // Handle authentication errors
  if (lastError.response && lastError.response.status === 401) {
    // You can redirect to login page or trigger a sign-out here
    console.error('Authentication error: Please log in again');
    // Potential redirect to login page
    // window.location.href = '/login';
  }
  
  // Format the error message more clearly for the UI
  let errorMessage = 'An unknown error occurred';
  
  if (lastError.response) {
    if (lastError.response.status === 500) {
      errorMessage = 'Server error: The application encountered an internal error';
      
      // Try to extract more detailed error information
      if (lastError.response.data && lastError.response.data.detail) {
        errorMessage += ` - ${lastError.response.data.detail}`;
      }
    } else if (lastError.response.data && lastError.response.data.detail) {
      errorMessage = lastError.response.data.detail;
    } else {
      errorMessage = `Error ${lastError.response.status}: ${lastError.response.statusText}`;
    }
  } else if (lastError.message) {
    errorMessage = lastError.message;
    
    if (lastError.message.includes('timeout')) {
      errorMessage = 'Request timed out. Please check your connection and try again.';
    }
  }
  
  // Rethrow with better message
  const enhancedError = new Error(errorMessage);
  enhancedError.originalError = lastError;
  throw enhancedError;
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