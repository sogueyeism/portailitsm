import { useCallback, useRef } from 'react'
import { useDemandStore } from '../store/demandStore'
import { syncGlpiStatuses } from '../services/glpi'

/**
 * Hook to sync approved demands with GLPI statuses.
 * Call syncNow() to trigger a sync. Auto-debounces.
 */
export function useGlpiSync() {
  const updateDemand = useDemandStore((s) => s.updateDemand)
  const syncingRef = useRef(false)

  const syncNow = useCallback(async () => {
    if (syncingRef.current) return
    syncingRef.current = true

    try {
      // Read demandes fresh from the store at call time (not stale closure)
      const demandes = useDemandStore.getState().demandes

      // Get all approved demands that have a GLPI ticket ID
      const toSync = demandes
        .filter((d) => d.status === 'approved' && d.glpiTicketId)
        .map((d) => ({
          demandId: d.id,
          glpiTicketId: d.glpiTicketId!,
          currentGlpiStatus: d.glpiStatus || '',
          userEmail: d.userEmail,
          userName: d.userName,
          titre: d.ticket?.titre || '',
        }))

      if (toSync.length === 0) return

      const updates = await syncGlpiStatuses(toSync)

      for (const upd of updates) {
        // Merge timeline: keep portal dates, add GLPI dates
        const existing = useDemandStore.getState().demandes.find((d) => d.id === upd.demandId)
        updateDemand(upd.demandId, {
          glpiStatus: upd.glpiStatus,
          glpiStatusLabel: upd.glpiStatusLabel,
          timeline: {
            submittedAt: existing?.timeline?.submittedAt || existing?.createdAt || '',
            approvedAt: existing?.timeline?.approvedAt || '',
            ...upd.timeline,
          },
        })
      }
    } catch (e) {
      console.error('GLPI sync failed:', e)
    } finally {
      syncingRef.current = false
    }
  }, [updateDemand])

  return { syncNow }
}
