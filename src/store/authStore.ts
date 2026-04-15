import { create } from 'zustand'
import type { User } from '../types/user'

type Role = 'user' | 'rh' | 'dsi'

interface AuthState {
  role: Role
  user: User | null
  authenticated: boolean
  checked: boolean   // true once we've checked the token
  login: (user: User & { role?: string }) => void
  logout: () => void
  setRole: (role: Role) => void
  checkAuth: () => Promise<void>
}

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

export const useAuthStore = create<AuthState>((set) => ({
  role: 'user',
  user: null,
  authenticated: false,
  checked: false,

  login: (userData) => {
    const role = (userData.role as Role) || 'user'
    set({
      user: {
        id: userData.id,
        firstName: userData.firstName,
        lastName: userData.lastName,
        initials: userData.initials,
        displayName: userData.displayName,
        email: userData.email,
      },
      role,
      authenticated: true,
      checked: true,
    })
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, role: 'user', authenticated: false, checked: true })
  },

  setRole: (role) => set({ role }),

  checkAuth: async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      set({ checked: true, authenticated: false })
      return
    }

    try {
      const res = await fetch(`${API}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Invalid token')

      const userData = await res.json()
      set({
        user: {
          id: userData.id,
          firstName: userData.firstName,
          lastName: userData.lastName,
          initials: userData.initials,
          displayName: userData.displayName,
          email: userData.email,
        },
        role: (userData.role as Role) || 'user',
        authenticated: true,
        checked: true,
      })
    } catch {
      localStorage.removeItem('token')
      set({ checked: true, authenticated: false })
    }
  },
}))
