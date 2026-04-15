import { create } from 'zustand'
import type { AITicketData } from '../types/ai'
import { fetchDemands, createDemand as apiCreateDemand, updateDemand as apiUpdateDemand } from '../services/api'

export type DemandStatus = 'pending' | 'approved' | 'rejected'

export interface Demand {
  id: string
  userId: number
  userName: string
  userEmail: string
  userFirstName?: string
  userLastName?: string
  createdAt: string
  status: DemandStatus
  rejectReason?: string
  glpiTicketId?: string
  glpiStatus?: string
  glpiStatusLabel?: string
  timeline?: {
    submittedAt: string
    approvedAt?: string
    glpiCreatedAt?: string | null
    takenAt?: string | null
    waitingAt?: string | null
    resolvedAt?: string | null
    closedAt?: string | null
  }
  ticket: AITicketData | null
  horsCategorie: boolean
  conversation: { role: 'user' | 'assistant'; content: string }[]
}

interface DemandState {
  demandes: Demand[]
  loaded: boolean
  loadDemands: () => Promise<void>
  addDemand: (d: Demand) => void
  updateDemand: (id: string, patch: Partial<Demand>) => void
}

export const useDemandStore = create<DemandState>((set) => ({
  demandes: [],
  loaded: false,

  loadDemands: async () => {
    try {
      const data = await fetchDemands()
      set({ demandes: data as Demand[], loaded: true })
    } catch (e) {
      console.error('Failed to load demands:', e)
      set({ loaded: true })
    }
  },

  addDemand: (d) => {
    set((s) => ({ demandes: [d, ...s.demandes] }))
    apiCreateDemand(d as any).catch((e) => console.error('Failed to save demand:', e))
  },

  updateDemand: (id, patch) => {
    set((s) => ({
      demandes: s.demandes.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    }))
    apiUpdateDemand(id, patch as any).catch((e) => console.error('Failed to update demand:', e))
  },
}))
