export interface Ticket {
  id: number
  title: string
  description: string
  status: 'new' | 'in_progress' | 'waiting' | 'resolved' | 'closed'
  urgency: 1 | 2 | 3 | 4 | 5
  category: string
  service: string
  sla: string
  userId: number
  createdAt: string
}

export type UrgencyLabel = 'Faible' | 'Normal' | 'Élevée' | 'Urgente'

export const URGENCY_MAP: Record<UrgencyLabel, number> = {
  Faible: 1,
  Normal: 3,
  'Élevée': 4,
  Urgente: 5,
}
