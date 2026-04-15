import { useState } from 'react'
import { useDemandStore, type Demand } from '../../store/demandStore'

export default function ConversationsPage() {
  const demandes = useDemandStore((s) => s.demandes)
  const [selected, setSelected] = useState<Demand | null>(null)

  // Only show demandes with conversation
  const withConversation = demandes.filter((d) => d.conversation.length > 0)

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-extrabold" style={{ color: 'var(--text-1)' }}>
          Conversations IA
        </h1>
        <p className="text-[13px]" style={{ color: 'var(--text-3)' }}>
          Historique des echanges entre utilisateurs et l'assistant IA
        </p>
      </div>

      <div className="flex gap-5">
        {/* List */}
        <div className="flex flex-1 flex-col gap-2">
          {withConversation.map((d) => (
            <div
              key={d.id}
              onClick={() => setSelected(d)}
              className="cursor-pointer rounded-xl border p-4 transition-all"
              style={{
                background: selected?.id === d.id ? 'var(--surface-2)' : 'var(--surface)',
                borderColor: selected?.id === d.id ? 'var(--ai)' : 'var(--border)',
                boxShadow: selected?.id === d.id ? '0 0 0 2px rgba(74,29,150,.12)' : 'none',
              }}
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-bold" style={{ color: 'var(--text-3)' }}>{d.id}</span>
                  {d.horsCategorie && (
                    <span
                      className="rounded px-1.5 py-[2px] text-[10px] font-bold"
                      style={{ background: 'var(--info-lt)', color: 'var(--info)' }}
                    >
                      Hors catalogue
                    </span>
                  )}
                  {d.ticket && (
                    <span
                      className="rounded px-1.5 py-[2px] text-[10px] font-bold"
                      style={{ background: 'var(--success-lt)', color: 'var(--success)' }}
                    >
                      Ticket généré
                    </span>
                  )}
                </div>
                <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                  {new Date(d.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="mb-1 text-[13px] font-semibold" style={{ color: 'var(--text-1)' }}>
                {d.userName}
              </div>
              <div className="truncate text-[12px]" style={{ color: 'var(--text-3)' }}>
                {d.conversation[0]?.content}
              </div>
            </div>
          ))}
        </div>

        {/* Conversation detail */}
        {selected && (
          <div
            className="w-[450px] shrink-0 rounded-xl border"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            {/* Header */}
            <div className="border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
              <div className="mb-1 flex items-center gap-2">
                <span className="text-[14px] font-bold" style={{ color: 'var(--text-1)' }}>
                  {selected.userName}
                </span>
                <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                  {selected.userEmail}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-3)' }}>
                <span>{selected.id}</span>
                <span>·</span>
                <span>{new Date(selected.createdAt).toLocaleString('fr-FR')}</span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex flex-col gap-3 p-5" style={{ maxHeight: 400, overflowY: 'auto' }}>
              {selected.conversation.map((msg, i) => (
                <div
                  key={i}
                  className="rounded-xl px-4 py-3"
                  style={{
                    background: msg.role === 'user' ? 'var(--bg)' : 'var(--ai-lt)',
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                  }}
                >
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wide"
                    style={{ color: msg.role === 'user' ? 'var(--text-3)' : 'var(--ai)' }}
                  >
                    {msg.role === 'user' ? 'Utilisateur' : 'Assistant IA'}
                  </div>
                  <div className="text-[13px] leading-relaxed" style={{ color: 'var(--text-2)' }}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>

            {/* Ticket summary if any */}
            {selected.ticket && (
              <div className="border-t px-5 py-4" style={{ borderColor: 'var(--border)' }}>
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
                  Ticket généré
                </div>
                <div
                  className="rounded-lg border p-3"
                  style={{ borderColor: 'var(--ai-md)', background: 'var(--ai-lt)' }}
                >
                  <div className="mb-1 text-[13px] font-bold" style={{ color: 'var(--ai-dk)' }}>
                    {selected.ticket.emoji} {selected.ticket.titre}
                  </div>
                  <div className="text-[11.5px]" style={{ color: 'var(--ai)' }}>
                    {selected.ticket.service} · {selected.ticket.urgence} · {selected.ticket.sla}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
