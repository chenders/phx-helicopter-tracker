import axios from 'axios'

// Configure axios with backend URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001'

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