export async function authenticatedFetch(url: string, options: RequestInit = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Send Auth.js session cookie
  })
}

export function handleApiError(response: Response) {
  if (response.status === 401) {
    // Session expired or invalid, redirect to login
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