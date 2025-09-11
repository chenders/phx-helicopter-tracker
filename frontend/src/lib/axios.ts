import axios from 'axios'

// Configure axios with backend URL
// Use window.location.hostname to dynamically use the current hostname
const getApiBaseUrl = () => {
  // If VITE_API_URL is set, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  
  // Otherwise, use the current hostname with the API port
  const protocol = window.location.protocol
  const hostname = window.location.hostname
  const port = 8001 // Direct API port, or 9080 for nginx proxy
  
  // If accessed via nginx proxy (port 9080), use relative URLs
  if (window.location.port === '9080') {
    return ''  // Use relative URLs, nginx will proxy to backend
  }
  
  return `${protocol}//${hostname}:${port}`
}

const API_BASE_URL = getApiBaseUrl()

axios.defaults.baseURL = API_BASE_URL
axios.defaults.headers.common['Content-Type'] = 'application/json'

// Add request interceptor for debugging
axios.interceptors.request.use(
  (config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url)
    return config
  },
  (error) => {
    console.error('Request Error:', error)
    return Promise.reject(error)
  }
)

// Add response interceptor for error handling
axios.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response?.status === 404) {
      console.error('API Endpoint Not Found:', error.config?.url)
    } else if (error.response?.status === 500) {
      console.error('Server Error:', error.response?.data)
    }
    return Promise.reject(error)
  }
)

export default axios