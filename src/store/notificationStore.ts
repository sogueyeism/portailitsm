import { create } from 'zustand'

export interface Notification {
  id: string
  type: 'demand_submitted' | 'demand_approved' | 'demand_rejected' | 'info'
  title: string
  message: string
  read: boolean
  createdAt: string
}

interface NotificationState {
  notifications: Notification[]
  addNotification: (n: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void
  markRead: (id: string) => void
  markAllRead: () => void
  unreadCount: () => number
}

const INITIAL: Notification[] = [
  {
    id: 'n1',
    type: 'demand_approved',
    title: 'Demande approuvee',
    message: 'Votre demande DEM-003 (Creation de compte mail) a ete versee dans GLPI.',
    read: false,
    createdAt: '2026-04-02T15:05:00',
  },
  {
    id: 'n2',
    type: 'demand_rejected',
    title: 'Demande rejetee',
    message: 'Votre demande DEM-004 a ete rejetee : Doublon avec DEM-001.',
    read: true,
    createdAt: '2026-04-02T12:10:00',
  },
]

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: INITIAL,
  addNotification: (n) =>
    set((s) => ({
      notifications: [
        {
          ...n,
          id: `n-${Date.now()}`,
          read: false,
          createdAt: new Date().toISOString(),
        },
        ...s.notifications,
      ],
    })),
  markRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    })),
  markAllRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    })),
  unreadCount: () => get().notifications.filter((n) => !n.read).length,
}))
