// API services
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001'

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