import axios from 'axios'
import type { AITicketData } from '../types/ai'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

// ── Services (catalogue) ──

export interface ApiService {
  id: string
  emoji: string
  name: string
  desc: string
  sla: string
  slaSpeed: string
  iconColor: string
  categorie: string
  active: boolean
  restricted: boolean
  restrictedTo?: string
  glpiCategoryId?: number
}

export async function fetchServices(): Promise<ApiService[]> {
  const { data } = await axios.get<ApiService[]>(`${API}/api/services`)
  return data
}

export async function createService(svc: ApiService): Promise<void> {
  await axios.post(`${API}/api/services`, svc)
}

export async function updateService(id: string, svc: Partial<ApiService>): Promise<void> {
  await axios.put(`${API}/api/services/${id}`, svc)
}

export async function deleteService(id: string): Promise<void> {
  await axios.delete(`${API}/api/services/${id}`)
}

// ── Demands ──

export interface ApiDemand {
  id: string
  userId: number
  userName: string
  userEmail: string
  userFirstName?: string
  userLastName?: string
  createdAt: string
  status: string
  rejectReason?: string
  glpiTicketId?: string
  glpiStatus?: string
  glpiStatusLabel?: string
  horsCategorie: boolean
  ticket: AITicketData | null
  conversation: { role: 'user' | 'assistant'; content: string }[]
  timeline?: Record<string, string | null>
}

export async function fetchDemands(userId?: number): Promise<ApiDemand[]> {
  const params = userId ? { userId } : {}
  const { data } = await axios.get<ApiDemand[]>(`${API}/api/demands`, { params })
  return data
}

export async function createDemand(demand: ApiDemand): Promise<void> {
  await axios.post(`${API}/api/demands`, demand)
}

export async function updateDemand(id: string, patch: Partial<ApiDemand>): Promise<void> {
  await axios.patch(`${API}/api/demands/${id}`, patch)
}

// ── Notifications ──

export interface ApiNotification {
  id: number
  type: string
  title: string
  message: string
  user_email: string
  read: number
  created_at: string
}

export async function fetchNotifications(userEmail?: string): Promise<ApiNotification[]> {
  const params = userEmail ? { userEmail } : {}
  const { data } = await axios.get<ApiNotification[]>(`${API}/api/notifications`, { params })
  return data
}

export async function markNotificationRead(id: number): Promise<void> {
  await axios.patch(`${API}/api/notifications/${id}/read`)
}

export async function markAllNotificationsRead(userEmail: string): Promise<void> {
  await axios.post(`${API}/api/notifications/read-all`, { userEmail })
}
