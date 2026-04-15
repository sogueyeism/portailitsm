import { useState } from 'react'
import type { AITicketData } from '../../types/ai'

interface TicketPreviewProps {
  ticket: AITicketData
  onConfirm: (ticket: AITicketData) => void
  onUpdate: (ticket: AITicketData) => void
  submitted: boolean
}

const urgClass: Record<string, string> = {
  Faible:  'urg-low',
  Normal:  'urg-med',
  'Élevée': 'urg-high',
  Urgente: 'urg-crit',
}

const slaClass = (s: string) =>
  s.startsWith('1 heure') ? 'sla-fast' : s.startsWith('4') ? 'sla-mid' : 'sla-slow'

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

const URGENCY_OPTIONS: AITicketData['urgence'][] = ['Faible', 'Normal', 'Élevée', 'Urgente']

export default function TicketPreview({ ticket, onConfirm, onUpdate, submitted }: TicketPreviewProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(ticket)

  if (submitted) return null

  // ── Edit mode ──
  if (editing) {
    return (
      <div className="ticket-card">
        <div className="tc-header">
          <span className="tc-header-icon">{draft.emoji}</span>
          <div>
            <div className="tc-header-title">Modifier le ticket</div>
            <div className="tc-header-sub">{draft.categorie}</div>
          </div>
        </div>

        <div className="tc-body">
          <div className="tc-grid">
            <div className="tc-field">
              <div className="tc-label">Service</div>
              <div className="tc-value">{draft.service}</div>
            </div>
            <div className="tc-field">
              <div className="tc-label">Urgence</div>
              <select
                className="tc-edit-select"
                value={draft.urgence}
                onChange={(e) =>
                  setDraft({ ...draft, urgence: e.target.value as AITicketData['urgence'] })
                }
              >
                {URGENCY_OPTIONS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="tc-field">
            <div className="tc-label">Titre du ticket</div>
            <input
              className="tc-edit-input"
              type="text"
              value={draft.titre}
              onChange={(e) => setDraft({ ...draft, titre: e.target.value })}
            />
          </div>

          <div className="tc-field">
            <div className="tc-label">Description</div>
            <textarea
              className="tc-edit-textarea"
              rows={4}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </div>
        </div>

        <div className="tc-footer">
          <span className="tc-footer-note">Modifiez si nécessaire avant de soumettre</span>
          <button
            className="btn-edit"
            onClick={() => { setDraft(ticket); setEditing(false) }}
          >
            Annuler
          </button>
          <button
            className="btn-confirm"
            onClick={() => {
              onUpdate(draft)
              setEditing(false)
            }}
          >
            <svg viewBox="0 0 16 16"><polyline points="2,8 6,12 14,4" /></svg>
            Valider
          </button>
        </div>
      </div>
    )
  }

  // ── View mode ──
  return (
    <div className="ticket-card">
      <div className="tc-header">
        <span className="tc-header-icon">{ticket.emoji}</span>
        <div>
          <div className="tc-header-title">Ticket généré par l'IA — prêt à soumettre</div>
          <div className="tc-header-sub">{ticket.categorie}</div>
        </div>
      </div>

      <div className="tc-body">
        <div className="tc-grid">
          <div className="tc-field">
            <div className="tc-label">Service</div>
            <div className="tc-value">{ticket.service}</div>
          </div>
          <div className="tc-field">
            <div className="tc-label">Délai de traitement</div>
            <div className="tc-value">
              <span className={`sla-badge ${slaClass(ticket.sla)}`}>
                <span className="sla-dot" />
                {ticket.sla}
              </span>
            </div>
          </div>
        </div>

        <div className="tc-divider" />

        <div className="tc-field">
          <div className="tc-label">Titre</div>
          <div className="tc-value mono">{esc(ticket.titre)}</div>
        </div>

        <div className="tc-field">
          <div className="tc-label">Description pour l'équipe IT</div>
          <div
            className="tc-value"
            style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}
          >
            {esc(ticket.description)}
          </div>
        </div>

        <div className="tc-divider" />

        <div className="tc-grid">
          <div className="tc-field">
            <div className="tc-label">Urgence détectée</div>
            <div className="tc-value">
              <span className={`tc-badge ${urgClass[ticket.urgence] ?? 'urg-med'}`}>
                {ticket.urgence}
              </span>
            </div>
          </div>
          <div className="tc-field">
            <div className="tc-label">Justification</div>
            <div className="tc-value" style={{ fontSize: 12, color: 'var(--text-3)' }}>
              {esc(ticket.urgence_raison)}
            </div>
          </div>
        </div>
      </div>

      <div className="tc-footer">
        <span className="tc-footer-note">✨ IA · Vérifiez avant de soumettre</span>
        <button className="btn-edit" onClick={() => { setDraft(ticket); setEditing(true) }}>
          ✏️ Modifier
        </button>
        <button className="btn-confirm" onClick={() => onConfirm(ticket)}>
          <svg viewBox="0 0 16 16"><polyline points="2,8 6,12 14,4" /></svg>
          Soumettre dans GLPI
        </button>
      </div>
    </div>
  )
}
