import Cookies from 'js-cookie'

export function getAuthHeaders(): HeadersInit {
  const token = Cookies.get('auth-token')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

export async function authenticatedFetch(url: string, options: RequestInit = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...options.headers,
  }

  return fetch(url, {
    ...options,
    headers,
  })
}

export function handleApiError(response: Response) {
  if (response.status === 401) {
    // Token expired or invalid, redirect to login
    Cookies.remove('auth-token')
    if (typeof window !== 'undefined') {
      window.location.href = '/?auth=required'
    }
    return
  }
  
  if (response.status === 403) {
    // Forbidden - user doesn't have permission
    if (typeof window !== 'undefined') {
      alert('You do not have permission to perform this action.')
    }
    return
  }
  
  // Handle other errors
  throw new Error(`API Error: ${response.status}`)
}