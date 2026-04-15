import { useAuthStore } from '../store/authStore'

export function useAuth() {
  const store = useAuthStore()
  return {
    role: store.role,
    user: store.user,
    setRole: store.setRole,
    isRH: store.role === 'rh',
    isDSI: store.role === 'dsi',
    authenticated: store.authenticated,
  }
}
