import { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

interface LogEntry {
  id: number
  user_email: string
  action: string
  target_type: string
  target_id: string
  details: string
  ip: string
  created_at: string
}

const ACTION_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  login: { label: 'Connexion', color: 'var(--info)', bg: 'var(--info-lt)' },
  chat_message: { label: 'Message IA', color: 'var(--ai)', bg: 'var(--ai-lt)' },
  demand_created: { label: 'Demande créée', color: 'var(--accent)', bg: 'var(--accent-lt)' },
  demand_approved: { label: 'Demande approuvée', color: 'var(--success)', bg: 'var(--success-lt)' },
  demand_rejected: { label: 'Demande rejetée', color: 'var(--danger)', bg: 'var(--danger-lt)' },
  service_created: { label: 'Service créé', color: 'var(--success)', bg: 'var(--success-lt)' },
  service_updated: { label: 'Service modifié', color: 'var(--warn)', bg: 'var(--warn-lt)' },
  user_created: { label: 'Utilisateur créé', color: 'var(--success)', bg: 'var(--success-lt)' },
  settings_updated: { label: 'Paramètres modifiés', color: 'var(--warn)', bg: 'var(--warn-lt)' },
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    fetch(`${API}/api/logs?limit=500`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then((r) => r.json())
      .then(setLogs)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter
    ? logs.filter((l) => l.action === filter)
    : logs

  const actions = [...new Set(logs.map((l) => l.action))]

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold" style={{ color: 'var(--text-1)' }}>Logs d'activité</h1>
          <p className="text-[13px]" style={{ color: 'var(--text-3)' }}>{logs.length} événements enregistrés</p>
        </div>
        <div className="flex gap-2">
          <select
            className="rounded-lg border px-3 py-2 text-[12px]"
            style={{ borderColor: 'var(--border)', fontFamily: 'inherit' }}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">Tous les types</option>
            {actions.map((a) => (
              <option key={a} value={a}>{ACTION_LABELS[a]?.label || a}</option>
            ))}
          </select>
          <a
            href={`${API}/api/export/logs`}
            className="flex items-center gap-2 rounded-lg border px-3 py-2 text-[12px] font-semibold no-underline"
            style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}
          >
            Exporter CSV
          </a>
        </div>
      </div>

      {loading ? (
        <div className="py-10 text-center text-[13px]" style={{ color: 'var(--text-3)' }}>Chargement...</div>
      ) : (
        <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)' }}>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Date</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Action</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Utilisateur</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Details</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>IP</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => {
                const a = ACTION_LABELS[log.action] || { label: log.action, color: 'var(--text-3)', bg: 'var(--bg)' }
                return (
                  <tr key={log.id} className="border-t" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    <td className="px-4 py-2.5 text-[11px]" style={{ color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                      {new Date(log.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-full px-2 py-[2px] text-[10px] font-bold" style={{ background: a.bg, color: a.color }}>{a.label}</span>
                    </td>
                    <td className="px-4 py-2.5 text-[12px]" style={{ color: 'var(--text-2)' }}>{log.user_email || '-'}</td>
                    <td className="px-4 py-2.5 text-[12px]" style={{ color: 'var(--text-2)' }}>
                      {log.target_type && <span className="mr-1 font-semibold">{log.target_type}</span>}
                      {log.target_id && <span className="mr-1">#{log.target_id}</span>}
                      {log.details}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[10px]" style={{ color: 'var(--text-3)' }}>{log.ip || '-'}</td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[13px]" style={{ color: 'var(--text-3)' }}>Aucun log</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
