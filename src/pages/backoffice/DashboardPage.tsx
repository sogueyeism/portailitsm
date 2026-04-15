import { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

interface Stats {
  totalDemands: number
  pendingDemands: number
  approvedDemands: number
  rejectedDemands: number
  totalUsers: number
  activeUsers: number
  totalServices: number
  activeServices: number
  todayDemands: number
  weekDemands: number
  demandsByService: { service: string; count: number }[]
  demandsByDay: { day: string; count: number }[]
  recentLogins: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    fetch(`${API}/api/stats`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setStats({
        ...data,
        demandsByDay: data.demandsByDay || [],
        demandsByService: data.demandsByService || [],
      }))
      .catch(() => {})
  }, [])

  if (!stats) return <div className="py-10 text-center text-[13px]" style={{ color: 'var(--text-3)' }}>Chargement...</div>

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[22px] font-extrabold" style={{ color: 'var(--text-1)' }}>Dashboard</h1>
        <p className="text-[13px]" style={{ color: 'var(--text-3)' }}>Vue d'ensemble de l'activité du portail</p>
      </div>

      {/* KPI cards */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <KpiCard title="Demandes totales" value={stats.totalDemands} subtitle={`${stats.todayDemands} aujourd'hui`} color="var(--accent)" />
        <KpiCard title="En attente" value={stats.pendingDemands} subtitle="A traiter" color="var(--warn)" />
        <KpiCard title="Versées GLPI" value={stats.approvedDemands} subtitle={`${stats.rejectedDemands} rejetées`} color="var(--success)" />
        <KpiCard title="Utilisateurs" value={stats.activeUsers} subtitle={`${stats.totalUsers} au total`} color="var(--info)" />
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Activity chart */}
        <div className="rounded-xl border p-5" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h3 className="mb-4 text-[14px] font-bold" style={{ color: 'var(--text-1)' }}>Activité (14 derniers jours)</h3>
          {stats.demandsByDay.length > 0 ? (
            <div className="flex flex-col gap-1">
              {stats.demandsByDay.slice(-14).map((d) => {
                const max = Math.max(...stats.demandsByDay.map((x) => x.count))
                const pct = max > 0 ? (d.count / max) * 100 : 0
                return (
                  <div key={d.day} className="flex items-center gap-2">
                    <span className="w-[60px] shrink-0 text-[10px]" style={{ color: 'var(--text-3)' }}>
                      {new Date(d.day).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    </span>
                    <div className="flex-1 rounded-full" style={{ background: 'var(--bg)', height: 14 }}>
                      <div className="rounded-full" style={{ width: `${Math.max(pct, 3)}%`, height: 14, background: 'var(--accent)' }} />
                    </div>
                    <span className="w-[20px] text-right text-[10px] font-bold" style={{ color: 'var(--text-2)' }}>{d.count}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="py-4 text-center text-[12px]" style={{ color: 'var(--text-3)' }}>Aucune donnee</p>
          )}
        </div>

        {/* By service */}
        <div className="rounded-xl border p-5" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h3 className="mb-4 text-[14px] font-bold" style={{ color: 'var(--text-1)' }}>Demandes par service</h3>
          {stats.demandsByService.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              {stats.demandsByService.map((s) => {
                const max = Math.max(...stats.demandsByService.map((x) => x.count))
                const pct = max > 0 ? (s.count / max) * 100 : 0
                return (
                  <div key={s.service}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[12px] font-medium" style={{ color: 'var(--text-2)' }}>{s.service || 'Hors catalogue'}</span>
                      <span className="text-[12px] font-bold" style={{ color: 'var(--text-1)' }}>{s.count}</span>
                    </div>
                    <div className="rounded-full" style={{ background: 'var(--bg)', height: 8 }}>
                      <div className="rounded-full" style={{ width: `${Math.max(pct, 3)}%`, height: 8, background: 'var(--info)' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="py-4 text-center text-[12px]" style={{ color: 'var(--text-3)' }}>Aucune donnee</p>
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div className="mt-5 grid grid-cols-3 gap-4">
        <MiniCard title="Services actifs" value={`${stats.activeServices} / ${stats.totalServices}`} />
        <MiniCard title="Demandes cette semaine" value={String(stats.weekDemands)} />
        <MiniCard title="Connexions (24h)" value={String(stats.recentLogins)} />
      </div>

      {/* Export */}
      <div className="mt-6 flex gap-3">
        <ExportBtn href={`${API}/api/export/demands`} label="Exporter les demandes" />
        <ExportBtn href={`${API}/api/export/users`} label="Exporter les utilisateurs" />
        <ExportBtn href={`${API}/api/export/logs`} label="Exporter les logs" />
      </div>
    </div>
  )
}

function KpiCard({ title, value, subtitle, color }: { title: string; value: number; subtitle: string; color: string }) {
  return (
    <div className="rounded-xl border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>{title}</div>
      <div className="text-[28px] font-extrabold leading-tight" style={{ color }}>{value}</div>
      <div className="mt-1 text-[11px]" style={{ color: 'var(--text-3)' }}>{subtitle}</div>
    </div>
  )
}

function MiniCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border px-4 py-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>{title}</div>
      <div className="mt-1 text-[18px] font-extrabold" style={{ color: 'var(--text-1)' }}>{value}</div>
    </div>
  )
}

function ExportBtn({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} className="flex items-center gap-2 rounded-lg border px-4 py-2.5 text-[12px] font-semibold no-underline transition-colors" style={{ borderColor: 'var(--border)', color: 'var(--text-2)', background: 'var(--surface)' }}>
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"><path d="M4 12h8" /><path d="M8 2v8" /><polyline points="5,7 8,10 11,7" /></svg>
      {label}
    </a>
  )
}
