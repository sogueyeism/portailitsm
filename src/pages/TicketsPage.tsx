import { useState, useEffect } from 'react'
import { useDemandStore, type Demand, type DemandStatus } from '../store/demandStore'
import { useAuthStore } from '../store/authStore'
import { useGlpiSync } from '../hooks/useGlpiSync'
import TicketTimeline from '../components/ui/TicketTimeline'

const STATUS_LABEL: Record<DemandStatus, string> = {
  pending: 'En cours de traitement',
  approved: 'Versée dans GLPI',
  rejected: 'Rejetée',
}

const STATUS_STYLE: Record<DemandStatus, { bg: string; color: string; dot: string }> = {
  pending:  { bg: 'var(--warn-lt)', color: 'var(--warn)', dot: 'var(--warn)' },
  approved: { bg: 'var(--success-lt)', color: 'var(--success)', dot: 'var(--success)' },
  rejected: { bg: 'var(--danger-lt)', color: 'var(--danger)', dot: 'var(--danger)' },
}

// GLPI status styles — more granular than portal status
const GLPI_STATUS_STYLE: Record<string, { bg: string; color: string; dot: string }> = {
  new:         { bg: 'var(--info-lt)', color: 'var(--info)', dot: 'var(--info)' },
  in_progress: { bg: 'var(--accent-lt)', color: 'var(--accent)', dot: 'var(--accent)' },
  waiting:     { bg: 'var(--warn-lt)', color: 'var(--warn)', dot: 'var(--warn)' },
  resolved:    { bg: 'var(--success-lt)', color: 'var(--success)', dot: 'var(--success)' },
  closed:      { bg: 'var(--success-lt)', color: 'var(--success)', dot: 'var(--success)' },
}

function getDisplayStatus(d: Demand): { label: string; style: { bg: string; color: string; dot: string } } {
  // If we have a GLPI status, use it (more precise)
  if (d.status === 'approved' && d.glpiStatusLabel && d.glpiStatus) {
    return {
      label: d.glpiStatusLabel,
      style: GLPI_STATUS_STYLE[d.glpiStatus] || STATUS_STYLE.approved,
    }
  }
  return { label: STATUS_LABEL[d.status], style: STATUS_STYLE[d.status] }
}

export default function TicketsPage() {
  const user = useAuthStore((s) => s.user)!
  const demandes = useDemandStore((s) => s.demandes)
  const [selected, setSelected] = useState<Demand | null>(null)
  const { syncNow } = useGlpiSync()

  const loaded = useDemandStore((s) => s.loaded)

  // Auto-sync when demands are loaded
  useEffect(() => { if (loaded) syncNow() }, [loaded])

  // Filter demands for the current user
  const myDemandes = demandes.filter((d) => d.userId === user.id && !d.horsCategorie)

  return (
    <div
      className="mx-auto w-full px-8 py-8"
      style={{ maxWidth: 880 }}
    >
      {/* Header */}
      <div className="mb-6">
        <h1
          className="mb-1 text-[22px] font-extrabold"
          style={{ color: 'var(--text-1)' }}
        >
          Mes demandes
        </h1>
        <p className="text-[13px]" style={{ color: 'var(--text-3)' }}>
          Suivez l'avancement de vos demandes soumises via le portail
        </p>
      </div>

      {myDemandes.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex gap-5">
          {/* List */}
          <div className="flex flex-1 flex-col gap-2.5">
            {myDemandes.map((d) => {
              const { label: statusLabel, style: st } = getDisplayStatus(d)
              return (
                <div
                  key={d.id}
                  onClick={() => setSelected(d)}
                  className="cursor-pointer rounded-xl border p-4 transition-all"
                  style={{
                    background: selected?.id === d.id ? 'var(--surface-2)' : 'var(--surface)',
                    borderColor: selected?.id === d.id ? 'var(--accent)' : 'var(--border)',
                    boxShadow: selected?.id === d.id ? '0 0 0 2px rgba(212,115,26,.12)' : 'var(--shadow-sm)',
                  }}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[17px]">{d.ticket?.emoji || '📋'}</span>
                      <span className="text-[13.5px] font-bold" style={{ color: 'var(--text-1)' }}>
                        {d.ticket?.titre || 'Demande hors catalogue'}
                      </span>
                    </div>
                    <span
                      className="flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[10.5px] font-bold"
                      style={{ background: st.bg, color: st.color }}
                    >
                      <span
                        className="inline-block h-[5px] w-[5px] rounded-full"
                        style={{ background: st.dot }}
                      />
                      {statusLabel}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11.5px]" style={{ color: 'var(--text-3)' }}>
                    <span>{d.id}</span>
                    <span>·</span>
                    <span>{d.ticket?.service || 'N/A'}</span>
                    <span>·</span>
                    <span>
                      {new Date(d.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Detail panel */}
          {selected && (
            <div
              className="w-[360px] shrink-0 rounded-xl border"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-sm)' }}
            >
              {/* Header */}
              <div className="border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-[20px]">{selected.ticket?.emoji || '📋'}</span>
                  <span className="text-[15px] font-bold" style={{ color: 'var(--text-1)' }}>
                    {selected.ticket?.titre || 'Demande hors catalogue'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold" style={{ color: 'var(--text-3)' }}>
                    {selected.id}
                  </span>
                  <StatusBadge demand={selected} />
                </div>
              </div>

              {/* Body */}
              <div className="flex flex-col gap-3 px-5 py-4">
                {selected.ticket && (
                  <>
                    <DetailRow label="Service" value={selected.ticket.service} />
                    <DetailRow label="Catégorie" value={selected.ticket.categorie} />
                    <DetailRow label="Urgence" value={selected.ticket.urgence} />
                    <DetailRow label="SLA" value={selected.ticket.sla} />

                    {/* Structured form data */}
                    {selected.ticket.formData && selected.ticket.formData.length > 0 ? (
                      <div>
                        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                          Details de la demande
                        </div>
                        <div className="flex flex-col gap-1.5 rounded-lg border px-3 py-2.5" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
                          {selected.ticket.formData.map((fd: any, i: number) => (
                            <div key={i}>
                              {fd.type === 'file' && fd.fileUrls?.length > 0 ? (
                                <div>
                                  <div className="mb-1 text-[10px] font-bold" style={{ color: 'var(--text-3)' }}>{fd.label}</div>
                                  <div className="flex flex-wrap gap-2">
                                    {fd.fileUrls.map((url: string, j: number) => {
                                      const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url)
                                      return isImage ? (
                                        <a key={j} href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg border" style={{ borderColor: 'var(--border)' }}>
                                          <img src={url} alt={`PJ ${j + 1}`} style={{ height: 56, objectFit: 'cover' }} />
                                        </a>
                                      ) : (
                                        <a key={j} href={url} target="_blank" rel="noopener noreferrer"
                                          className="flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold no-underline"
                                          style={{ borderColor: 'var(--border)', color: 'var(--accent)' }}>
                                          Fichier {j + 1}
                                        </a>
                                      )
                                    })}
                                  </div>
                                </div>
                              ) : (
                                <DetailRow
                                  label={fd.label}
                                  value={Array.isArray(fd.value) ? fd.value.join(', ') : typeof fd.value === 'boolean' ? (fd.value ? 'Oui' : 'Non') : String(fd.value)}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="mb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                          Description
                        </div>
                        <p className="whitespace-pre-line text-[12.5px] leading-relaxed" style={{ color: 'var(--text-2)' }}>
                          {selected.ticket.description}
                        </p>
                      </div>
                    )}

                    {/* Attachments */}
                    {selected.ticket.attachments && selected.ticket.attachments.length > 0 && (
                      <div>
                        <div className="mb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                          Pieces jointes
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selected.ticket.attachments.map((url: string, i: number) => {
                            const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url)
                            return isImage ? (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg border" style={{ borderColor: 'var(--border)' }}>
                                <img src={url} alt={`PJ ${i + 1}`} style={{ height: 56, objectFit: 'cover' }} />
                              </a>
                            ) : (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold no-underline"
                                style={{ borderColor: 'var(--border)', color: 'var(--accent)' }}>
                                Fichier {i + 1}
                              </a>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {selected.horsCategorie && (
                  <div
                    className="rounded-lg px-3 py-2.5 text-[12px]"
                    style={{ background: 'var(--info-lt)', color: 'var(--info)' }}
                  >
                    Cette demande ne correspond a aucun service du catalogue. L'equipe DSI a ete notifiee.
                  </div>
                )}

                {/* Status-specific info */}
                {selected.status === 'approved' && selected.glpiTicketId && (
                  <div
                    className="mt-1 rounded-lg px-3 py-2.5 text-[12.5px]"
                    style={{ background: 'var(--success-lt)', color: 'var(--success)' }}
                  >
                    <div className="font-semibold">Ticket versé dans GLPI sous {selected.glpiTicketId}</div>
                    {selected.glpiStatusLabel && (
                      <div className="mt-1 text-[12px]">
                        Statut GLPI : <strong>{selected.glpiStatusLabel}</strong>
                      </div>
                    )}
                  </div>
                )}

                {selected.status === 'rejected' && selected.rejectReason && (
                  <div
                    className="mt-1 rounded-lg px-3 py-2.5 text-[12.5px]"
                    style={{ background: 'var(--danger-lt)', color: 'var(--danger)' }}
                  >
                    <span className="font-bold">Motif :</span> {selected.rejectReason}
                  </div>
                )}

                {selected.status === 'pending' && (
                  <div
                    className="mt-1 rounded-lg px-3 py-2.5 text-[12.5px]"
                    style={{ background: 'var(--warn-lt)', color: 'var(--warn)' }}
                  >
                    Votre demande est en cours d'examen par l'equipe DSI.
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div className="border-t px-5 py-4" style={{ borderColor: 'var(--border)' }}>
                <div className="mb-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                  Suivi de la demande
                </div>
                <TicketTimeline
                  timeline={selected.timeline || { submittedAt: selected.createdAt }}
                  status={selected.status}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ demand }: { demand: Demand }) {
  const { label, style: st } = getDisplayStatus(demand)
  return (
    <span
      className="rounded-full px-2 py-[2px] text-[10px] font-bold"
      style={{ background: st.bg, color: st.color }}
    >
      {label}
    </span>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-[75px] shrink-0 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)', marginTop: 2 }}>
        {label}
      </span>
      <span className="text-[12.5px] font-medium" style={{ color: 'var(--text-1)' }}>{value}</span>
    </div>
  )
}


function EmptyState() {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <div
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-[28px]"
        style={{ background: 'var(--accent-lt)' }}
      >
        📋
      </div>
      <h2 className="mb-1 text-[16px] font-bold" style={{ color: 'var(--text-1)' }}>
        Aucune demande pour le moment
      </h2>
      <p className="text-[13px]" style={{ color: 'var(--text-3)', maxWidth: 340 }}>
        Utilisez l'assistant IA sur la page d'accueil pour soumettre votre premiere demande.
      </p>
    </div>
  )
}
