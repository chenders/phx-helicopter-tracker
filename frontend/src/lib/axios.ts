import axios from 'axios'

// Configure axios with backend URL
// Use window.location.hostname to dynamically use the current hostname
const getApiBaseUrl = () => {
  // If VITE_API_URL is set, use it
//  if (import.meta.env.VITE_API_URL) {
//    return import.meta.env.VITE_API_URL
//  }

  // For production, always use relative URLs so the protocol matches the page
  // This prevents mixed content errors when served over HTTPS
  return ''
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
