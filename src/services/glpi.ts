import axios from 'axios'
import type { AITicketData } from '../types/ai'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

export interface GlpiCreateResult {
  success: boolean
  glpiTicketId: number
  message: string
}

export interface GlpiStatus {
  configured: boolean
  connected: boolean
  error?: string
}

/**
 * Send a validated ticket to GLPI via the backend proxy.
 */
export interface GlpiTicketPayload {
  ticket: AITicketData
  demandId: string
  userName: string
  userEmail?: string
  userFirstName?: string
  userLastName?: string
  conversation?: { role: string; content: string }[]
  location?: string
  glpiCategoryId?: number
}

export async function createGlpiTicket(payload: GlpiTicketPayload): Promise<GlpiCreateResult> {
  const { data } = await axios.post<GlpiCreateResult>(
    `${API_BASE}/api/glpi/tickets`,
    payload,
  )
  return data
}

/**
 * Check if GLPI is configured and reachable.
 */
export async function getGlpiStatus(): Promise<GlpiStatus> {
  const { data } = await axios.get<GlpiStatus>(`${API_BASE}/api/glpi/status`)
  return data
}

export interface GlpiSyncUpdate {
  demandId: string
  glpiTicketId: string
  glpiStatus: string
  glpiStatusLabel: string
  glpiDateMod: string
  timeline: {
    glpiCreatedAt: string | null
    takenAt: string | null
    waitingAt: string | null
    resolvedAt: string | null
    closedAt: string | null
  }
}

/**
 * Sync approved demands with GLPI to get updated statuses.
 */
/**
 * Create a category in GLPI. Returns the GLPI category ID.
 */
export async function createGlpiCategory(
  name: string,
  parentId?: number,
): Promise<{ glpiCategoryId: number }> {
  const { data } = await axios.post(`${API_BASE}/api/glpi/categories`, { name, parentId })
  return data
}

/**
 * List all GLPI ITILCategories for import.
 */
export interface GlpiCategory {
  id: number
  name: string
  completename: string
  level: number
  parentId: number
}

export async function listGlpiCategories(): Promise<GlpiCategory[]> {
  const { data } = await axios.get<{ categories: GlpiCategory[] }>(`${API_BASE}/api/glpi/categories`)
  return data.categories
}

export async function syncGlpiStatuses(
  tickets: { demandId: string; glpiTicketId: string; currentGlpiStatus?: string; userEmail?: string; userName?: string; titre?: string }[],
): Promise<GlpiSyncUpdate[]> {
  const { data } = await axios.post<{ updates: GlpiSyncUpdate[] }>(
    `${API_BASE}/api/glpi/sync`,
    { tickets },
  )
  return data.updates
}
