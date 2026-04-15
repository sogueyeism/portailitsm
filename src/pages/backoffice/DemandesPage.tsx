import { useState, useEffect } from 'react'
import { useDemandStore, type Demand, type DemandStatus } from '../../store/demandStore'
import { useCatalogueStore } from '../../store/catalogueStore'
import { createGlpiTicket } from '../../services/glpi'
import { useGlpiSync } from '../../hooks/useGlpiSync'

type FilterTab = 'all' | DemandStatus

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  { key: 'pending', label: 'En attente' },
  { key: 'approved', label: 'Versées' },
  { key: 'rejected', label: 'Rejetées' },
]

const STATUS_STYLES: Record<DemandStatus, { bg: string; color: string; label: string }> = {
  pending:  { bg: 'var(--warn-lt)', color: 'var(--warn)', label: 'En attente' },
  approved: { bg: 'var(--success-lt)', color: 'var(--success)', label: 'Versée' },
  rejected: { bg: 'var(--danger-lt)', color: 'var(--danger)', label: 'Rejetée' },
}

export default function DemandesPage() {
  const { demandes, updateDemand } = useDemandStore()
  const [filter, setFilter] = useState<FilterTab>('all')
  const [selected, setSelected] = useState<Demand | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { syncNow } = useGlpiSync()
  const [syncing, setSyncing] = useState(false)

  const loaded = useDemandStore((s) => s.loaded)

  // Auto-sync when demands are loaded
  useEffect(() => { if (loaded) syncNow() }, [loaded])

  const handleSync = async () => {
    setSyncing(true)
    await syncNow()
    setSyncing(false)
  }

  const filtered = filter === 'all' ? demandes : demandes.filter((d) => d.status === filter)

  const handleApprove = async (d: Demand) => {
    if (!d.ticket || isSubmitting) return
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // Find the glpiCategoryId from the catalogue store
      const catalogueServices = useCatalogueStore.getState().services
      const matchedService = catalogueServices.find((s) =>
        d.ticket!.service.toLowerCase().includes(s.name.toLowerCase()) ||
        s.name.toLowerCase().includes(d.ticket!.service.toLowerCase())
      )

      const result = await createGlpiTicket({
        ticket: d.ticket,
        demandId: d.id,
        userName: d.userName,
        userEmail: d.userEmail,
        userFirstName: d.userFirstName,
        userLastName: d.userLastName,
        conversation: d.conversation,
        glpiCategoryId: matchedService?.glpiCategoryId,
      })
      updateDemand(d.id, {
        status: 'approved',
        glpiTicketId: `GLPI-${result.glpiTicketId}`,
        timeline: {
          submittedAt: d.createdAt,
          approvedAt: new Date().toISOString(),
        },
      })
      setSelected(null)
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Erreur inconnue'
      // If GLPI is not configured, fall back to local approval
      if (err.response?.status === 503) {
        const localId = `LOCAL-${Date.now().toString(36).toUpperCase()}`
        updateDemand(d.id, { status: 'approved', glpiTicketId: localId })
        setSubmitError('GLPI non configure — demande approuvee localement. Configurez GLPI dans Paramètres pour le versement automatique.')
        setSelected(null)
      } else {
        setSubmitError(`Echec du versement GLPI : ${msg}`)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = () => {
    if (!selected) return
    updateDemand(selected.id, { status: 'rejected', rejectReason: rejectReason || 'Aucun motif fourni' })
    setShowRejectModal(false)
    setRejectReason('')
    setSelected(null)
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold" style={{ color: 'var(--text-1)' }}>
            Demandes entrantes
          </h1>
          <p className="text-[13px]" style={{ color: 'var(--text-3)' }}>
            Validez, corrigez ou rejetez les demandes avant versement dans GLPI
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-[12px] font-semibold transition-colors disabled:opacity-50"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text-2)' }}
        >
          <svg className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 1v5h-5" /><path d="M3 19v-5h5" />
            <path d="M15.5 6.5A7 7 0 0 0 4 5L3 6" /><path d="M4.5 13.5A7 7 0 0 0 16 15l1-1" />
          </svg>
          {syncing ? 'Synchronisation...' : 'Sync GLPI'}
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-1">
        {TABS.map((tab) => {
          const count = tab.key === 'all' ? demandes.length : demandes.filter((d) => d.status === tab.key).length
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className="cursor-pointer rounded-lg px-3 py-[7px] text-[12.5px] font-semibold transition-colors"
              style={{
                background: filter === tab.key ? 'var(--accent-lt)' : 'transparent',
                border: `1px solid ${filter === tab.key ? 'rgba(212,115,26,.3)' : 'var(--border)'}`,
                color: filter === tab.key ? 'var(--accent)' : 'var(--text-3)',
              }}
            >
              {tab.label}
              <span className="ml-1.5 text-[11px] font-bold">{count}</span>
            </button>
          )
        })}
      </div>

      <div className="flex gap-5">
        {/* List */}
        <div className="flex flex-1 flex-col gap-2">
          {filtered.length === 0 && (
            <p className="py-10 text-center text-[13px]" style={{ color: 'var(--text-3)' }}>
              Aucune demande dans cette categorie
            </p>
          )}
          {filtered.map((d) => (
            <div
              key={d.id}
              onClick={() => setSelected(d)}
              className="cursor-pointer rounded-xl border p-4 transition-all"
              style={{
                background: selected?.id === d.id ? 'var(--surface-2)' : 'var(--surface)',
                borderColor: selected?.id === d.id ? 'var(--accent)' : 'var(--border)',
                boxShadow: selected?.id === d.id ? '0 0 0 2px rgba(212,115,26,.15)' : 'none',
              }}
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-bold" style={{ color: 'var(--text-3)' }}>{d.id}</span>
                  <StatusBadge status={d.status} />
                  {d.horsCategorie && (
                    <span
                      className="rounded px-1.5 py-[2px] text-[10px] font-bold"
                      style={{ background: 'var(--info-lt)', color: 'var(--info)' }}
                    >
                      Hors catalogue
                    </span>
                  )}
                </div>
                <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                  {new Date(d.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="mb-1 text-[13.5px] font-bold" style={{ color: 'var(--text-1)' }}>
                {d.ticket?.titre || 'Demande hors catalogue'}
              </div>
              <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--text-3)' }}>
                <span>{d.userName}</span>
                <span>·</span>
                <span>{d.ticket?.service || 'N/A'}</span>
                {d.glpiTicketId && (
                  <>
                    <span>·</span>
                    <span className="font-bold" style={{ color: 'var(--success)' }}>{d.glpiTicketId}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Detail panel */}
        {selected && (
          <div
            className="w-[400px] shrink-0 rounded-xl border p-5"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[14px] font-bold" style={{ color: 'var(--text-1)' }}>{selected.id}</span>
              <StatusBadge status={selected.status} />
            </div>

            {/* Ticket info */}
            {selected.ticket && (
              <div className="mb-4 flex flex-col gap-2">
                <InfoRow label="Service" value={selected.ticket.service} />
                <InfoRow label="Catégorie" value={selected.ticket.categorie} />
                <InfoRow label="Titre" value={selected.ticket.titre} />
                <InfoRow label="Urgence" value={selected.ticket.urgence} />
                <InfoRow label="SLA" value={selected.ticket.sla} />

                {/* Structured form data */}
                {selected.ticket.formData && selected.ticket.formData.length > 0 ? (
                  <div>
                    <div className="mb-2 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
                      Données du formulaire
                    </div>
                    <div className="flex flex-col gap-1.5 rounded-lg border px-3 py-2.5" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
                      {selected.ticket.formData.map((fd: any, i: number) => (
                        <div key={i}>
                          {fd.type === 'file' && fd.fileUrls?.length > 0 ? (
                            <div>
                              <div className="mb-1 text-[11px] font-bold" style={{ color: 'var(--text-3)' }}>{fd.label}</div>
                              <div className="flex flex-wrap gap-2">
                                {fd.fileUrls.map((url: string, j: number) => {
                                  const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url)
                                  return isImage ? (
                                    <a key={j} href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg border" style={{ borderColor: 'var(--border)' }}>
                                      <img src={url} alt={`Piece jointe ${j + 1}`} style={{ height: 60, objectFit: 'cover' }} />
                                    </a>
                                  ) : (
                                    <a key={j} href={url} target="_blank" rel="noopener noreferrer"
                                      className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold no-underline"
                                      style={{ borderColor: 'var(--border)', color: 'var(--accent)' }}>
                                      <svg viewBox="0 0 14 14" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={1.5}><rect x="2" y="1" width="10" height="12" rx="1.5" /><line x1="5" y1="5" x2="9" y2="5" /><line x1="5" y1="8" x2="8" y2="8" /></svg>
                                      Fichier {j + 1}
                                    </a>
                                  )
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-2">
                              <span className="w-[90px] shrink-0 text-[11px] font-bold" style={{ color: 'var(--text-3)', marginTop: 1 }}>{fd.label}</span>
                              <span className="text-[12px]" style={{ color: 'var(--text-1)' }}>
                                {Array.isArray(fd.value) ? fd.value.join(', ') : typeof fd.value === 'boolean' ? (fd.value ? 'Oui' : 'Non') : fd.value}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="mb-1 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
                      Description
                    </div>
                    <div className="whitespace-pre-line text-[12.5px] leading-relaxed" style={{ color: 'var(--text-2)' }}>
                      {selected.ticket.description}
                    </div>
                  </div>
                )}

                {/* Attachments */}
                {selected.ticket.attachments && selected.ticket.attachments.length > 0 && (
                  <div>
                    <div className="mb-2 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
                      Pieces jointes ({selected.ticket.attachments.length})
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selected.ticket.attachments.map((url: string, i: number) => {
                        const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url)
                        return isImage ? (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg border" style={{ borderColor: 'var(--border)' }}>
                            <img src={url} alt={`PJ ${i + 1}`} style={{ height: 64, objectFit: 'cover' }} />
                          </a>
                        ) : (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[12px] font-semibold no-underline transition-colors"
                            style={{ borderColor: 'var(--border)', color: 'var(--accent)', background: 'var(--surface)' }}>
                            <svg viewBox="0 0 14 14" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.5}><rect x="2" y="1" width="10" height="12" rx="1.5" /><line x1="5" y1="5" x2="9" y2="5" /><line x1="5" y1="8" x2="8" y2="8" /></svg>
                            Télécharger le fichier {i + 1}
                          </a>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Conversation */}
            <div className="mb-4">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
                Conversation
              </div>
              <div className="flex flex-col gap-2">
                {selected.conversation.map((msg, i) => (
                  <div
                    key={i}
                    className="rounded-lg px-3 py-2 text-[12px] leading-relaxed"
                    style={{
                      background: msg.role === 'user' ? 'var(--bg)' : 'var(--ai-lt)',
                      color: 'var(--text-2)',
                    }}
                  >
                    <span className="font-bold" style={{ color: msg.role === 'user' ? 'var(--text-1)' : 'var(--ai)' }}>
                      {msg.role === 'user' ? 'Utilisateur' : 'IA'} :
                    </span>{' '}
                    {msg.content}
                  </div>
                ))}
              </div>
            </div>

            {/* User info */}
            <div className="mb-5">
              <InfoRow label="Demandeur" value={selected.userName} />
              <InfoRow label="Email" value={selected.userEmail} />
            </div>

            {/* Actions */}
            {selected.status === 'pending' && (
              <div className="flex flex-col gap-2">
                {submitError && (
                  <div
                    className="rounded-lg px-3 py-2 text-[12px]"
                    style={{ background: 'var(--warn-lt)', color: 'var(--warn)' }}
                  >
                    {submitError}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(selected)}
                    disabled={isSubmitting}
                    className="flex-1 cursor-pointer rounded-lg border-none py-2.5 text-[13px] font-bold text-white transition-colors disabled:opacity-50"
                    style={{ background: 'var(--success)' }}
                  >
                    {isSubmitting ? 'Versement en cours...' : 'Verser dans GLPI'}
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={isSubmitting}
                    className="flex-1 cursor-pointer rounded-lg border py-2.5 text-[13px] font-bold transition-colors disabled:opacity-50"
                    style={{ background: 'transparent', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                  >
                    Rejeter
                  </button>
                </div>
              </div>
            )}

            {selected.status === 'approved' && selected.glpiTicketId && (
              <div
                className="rounded-lg px-3 py-2.5 text-[13px]"
                style={{ background: 'var(--success-lt)', color: 'var(--success)' }}
              >
                <div className="font-semibold">Versée dans GLPI sous {selected.glpiTicketId}</div>
                {selected.glpiStatusLabel && (
                  <div className="mt-1 text-[12px]">
                    Statut GLPI : <strong>{selected.glpiStatusLabel}</strong>
                  </div>
                )}
              </div>
            )}

            {selected.status === 'rejected' && (
              <div
                className="rounded-lg px-3 py-2.5 text-[13px]"
                style={{ background: 'var(--danger-lt)', color: 'var(--danger)' }}
              >
                <span className="font-bold">Rejetée :</span> {selected.rejectReason}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reject modal */}
      {showRejectModal && (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center"
          style={{ background: 'rgba(42,20,0,.52)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowRejectModal(false) }}
        >
          <div
            className="w-[400px] rounded-xl p-6"
            style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-lg)' }}
          >
            <h3 className="mb-3 text-[15px] font-bold" style={{ color: 'var(--text-1)' }}>
              Motif du rejet
            </h3>
            <textarea
              className="mb-4 w-full resize-none rounded-lg border px-3 py-2 text-[13px]"
              style={{ borderColor: 'var(--border)', fontFamily: 'inherit' }}
              rows={3}
              placeholder="Ex: Doublon, hors périmètre..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={handleReject}
                className="flex-1 cursor-pointer rounded-lg border-none py-2 text-[13px] font-bold text-white"
                style={{ background: 'var(--danger)' }}
              >
                Confirmer le rejet
              </button>
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 cursor-pointer rounded-lg border py-2 text-[13px] font-bold"
                style={{ borderColor: 'var(--border)', background: 'transparent', color: 'var(--text-2)' }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: DemandStatus }) {
  const s = STATUS_STYLES[status]
  return (
    <span
      className="rounded-full px-2 py-[2px] text-[10.5px] font-bold"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-[80px] shrink-0 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
        {label}
      </span>
      <span className="text-[12.5px] font-medium" style={{ color: 'var(--text-1)' }}>{value}</span>
    </div>
  )
}
