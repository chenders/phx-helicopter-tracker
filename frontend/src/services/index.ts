// API services
// Dynamically determine API URL based on current hostname
const getApiBaseUrl = () => {
  // If REACT_APP_API_URL is set, use it (for backwards compatibility)
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL
  }
  
  // Otherwise, use the current hostname with the API port
  const protocol = window.location.protocol
  const hostname = window.location.hostname
  
  // If accessed via nginx proxy (port 9080), use relative URLs
  if (window.location.port === '9080') {
    return ''  // Use relative URLs, nginx will proxy to backend
  }
  
  // Otherwise use direct backend port
  return `${protocol}//${hostname}:8001`
}

export const API_BASE_URL = getApiBaseUrl()

// Basic fetch wrapper
export const apiClient = {
  get: async (url: string) => {
    const response = await fetch(`${API_BASE_URL}${url}`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return response.json()
  },
  post: async (url: string, data?: any) => {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return response.json()
  }
}
