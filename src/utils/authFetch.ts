const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

/**
 * Fetch wrapper that automatically includes the JWT token.
 */
export function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('token')
  const headers = new Headers(options.headers || {})
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  return fetch(`${API}${path}`, { ...options, headers })
}
