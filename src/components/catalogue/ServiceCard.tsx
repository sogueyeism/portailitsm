import { useAuthStore } from '../../store/authStore'

export interface ServiceDef {
  id: string
  emoji: string
  name: string
  desc: string
  sla: string
  slaSpeed: 'fast' | 'mid' | 'slow'
  iconColor: 'orange' | 'blue' | 'green' | 'red'
  restricted?: boolean
}

interface ServiceCardProps {
  service: ServiceDef
  index: number
  onOpen: (id: string) => void
  onAccessDenied: () => void
}

const iconBg: Record<string, string> = {
  orange: 'var(--accent-lt)',
  blue: 'var(--info-lt)',
  green: 'var(--success-lt)',
  red: 'var(--danger-lt)',
}

const slaBg: Record<string, { bg: string; color: string }> = {
  fast: { bg: 'var(--success-lt)', color: 'var(--success)' },
  mid:  { bg: 'var(--info-lt)',    color: 'var(--info)' },
  slow: { bg: 'var(--warn-lt)',    color: 'var(--warn)' },
}

export default function ServiceCard({ service, index, onOpen, onAccessDenied }: ServiceCardProps) {
  const role = useAuthStore((s) => s.role)
  const isRH = role === 'rh'
  const locked = service.restricted && !isRH

  const handleClick = () => {
    if (locked) {
      onAccessDenied()
      return
    }
    onOpen(service.id)
  }

  const sla = slaBg[service.slaSpeed]

  return (
    <div
      className={`svc-card${service.restricted ? ' restricted-card' : ''}${locked ? ' locked-card' : ''}`}
      style={{ animationDelay: `${(index + 1) * 0.04}s` }}
      onClick={handleClick}
    >
      {/* Flag (restricted service only) */}
      {service.restricted && (
        isRH ? (
          <div className="svc-flag" style={{ background: 'var(--danger-lt)', color: 'var(--danger)', border: '1px solid rgba(156,32,32,.2)' }}>
            <svg viewBox="0 0 12 12" className="h-2 w-2" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <path d="M6 1l1.2 3.2H10L7.6 6.1l1 3L6 7.5 3.4 9.1l1-3L2 4.2h2.8z" />
            </svg>
            RH uniquement
          </div>
        ) : (
          <div className="svc-flag" style={{ background: '#F0F0F0', color: '#888' }}>
            <svg viewBox="0 0 12 12" className="h-2 w-2" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <rect x="2" y="5" width="8" height="6" rx="1" />
              <path d="M4 5V4a2 2 0 0 1 4 0v1" />
            </svg>
            Restreint
          </div>
        )
      )}

      {/* Icon */}
      <div
        className="svc-icon"
        style={{ background: iconBg[service.iconColor] }}
      >
        {service.emoji}
      </div>

      {/* Content */}
      <div className="svc-name">{service.name}</div>
      <div className="svc-desc">{service.desc}</div>

      {/* Footer */}
      <div className="svc-footer">
        <span
          className="sla-tag"
          style={{ background: sla.bg, color: sla.color }}
        >
          <span className="sla-dot" />
          {service.sla}
        </span>
        {locked ? (
          <span className="svc-lock-msg"  style={{ fontSize: '10.5px', color: '#aaa', fontWeight: 600 }}>
            Accès refusé
          </span>
        ) : (
          <span className="svc-cta">Formulaire ›</span>
        )}
      </div>
    </div>
  )
}
