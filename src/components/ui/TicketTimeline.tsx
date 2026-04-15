interface TimelineData {
  submittedAt?: string
  approvedAt?: string
  glpiCreatedAt?: string | null
  takenAt?: string | null
  waitingAt?: string | null
  resolvedAt?: string | null
  closedAt?: string | null
}

interface Props {
  timeline?: TimelineData
  status: string  // demand status: pending | approved | rejected
}

const STEPS = [
  { key: 'submittedAt', label: 'Soumise', icon: '📝' },
  { key: 'approvedAt', label: 'Validée DSI', icon: '✅' },
  { key: 'glpiCreatedAt', label: 'Versée GLPI', icon: '📋' },
  { key: 'takenAt', label: 'Prise en charge', icon: '🔧' },
  { key: 'resolvedAt', label: 'Résolue', icon: '✓' },
  { key: 'closedAt', label: 'Clôturée', icon: '🏁' },
] as const

function formatDate(d: string | null | undefined): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function TicketTimeline({ timeline, status }: Props) {
  if (!timeline) {
    // Minimal timeline for pending/rejected
    return (
      <div className="flex flex-col gap-2">
        <StepRow
          label="Soumise"
          icon="📝"
          date={undefined}
          state="done"
        />
        {status === 'rejected' && (
          <StepRow label="Rejetée" icon="✕" date={undefined} state="error" />
        )}
        {status === 'pending' && (
          <StepRow label="En attente de validation" icon="⏳" date={undefined} state="active" />
        )}
      </div>
    )
  }

  // Find current active step (last completed step + 1)
  const stepsWithDates = STEPS.map((step) => ({
    ...step,
    date: timeline[step.key as keyof TimelineData] as string | null | undefined,
  }))

  // Find which step is currently active
  let lastDoneIndex = -1
  for (let i = stepsWithDates.length - 1; i >= 0; i--) {
    if (stepsWithDates[i].date) {
      lastDoneIndex = i
      break
    }
  }

  return (
    <div className="flex flex-col gap-0">
      {stepsWithDates.map((step, i) => {
        let state: 'done' | 'active' | 'pending' | 'error'
        if (step.date) {
          state = 'done'
        } else if (i === lastDoneIndex + 1) {
          state = 'active'
        } else {
          state = 'pending'
        }

        // Special: show waiting as active if it exists
        if (step.key === 'resolvedAt' && timeline.waitingAt && !timeline.resolvedAt) {
          // Skip — will show waiting state
        }

        return (
          <StepRow
            key={step.key}
            label={step.label}
            icon={step.icon}
            date={step.date}
            state={state}
            isLast={i === stepsWithDates.length - 1}
          />
        )
      })}
    </div>
  )
}

function StepRow({
  label,
  icon,
  date,
  state,
  isLast,
}: {
  label: string
  icon: string
  date?: string | null
  state: 'done' | 'active' | 'pending' | 'error'
  isLast?: boolean
}) {
  const colors = {
    done:    { dot: 'var(--success)', line: 'var(--success)', text: 'var(--text-1)', bg: 'var(--success-lt)' },
    active:  { dot: 'var(--accent)', line: 'var(--border)', text: 'var(--accent)', bg: 'var(--accent-lt)' },
    pending: { dot: 'var(--border)', line: 'var(--border)', text: 'var(--text-3)', bg: 'transparent' },
    error:   { dot: 'var(--danger)', line: 'var(--danger)', text: 'var(--danger)', bg: 'var(--danger-lt)' },
  }
  const c = colors[state]

  return (
    <div className="flex items-start gap-3">
      {/* Dot + line */}
      <div className="flex flex-col items-center" style={{ width: 20 }}>
        <div
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px]"
          style={{
            background: state === 'done' || state === 'active' ? c.bg : 'var(--bg)',
            border: `2px solid ${c.dot}`,
          }}
        >
          {state === 'done' && (
            <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke={c.dot} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="2,6 5,9 10,3" />
            </svg>
          )}
          {state === 'active' && (
            <div className="h-2 w-2 animate-pulse rounded-full" style={{ background: c.dot }} />
          )}
          {state === 'error' && (
            <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke={c.dot} strokeWidth={2.5} strokeLinecap="round">
              <line x1="3" y1="3" x2="9" y2="9" /><line x1="9" y1="3" x2="3" y2="9" />
            </svg>
          )}
        </div>
        {!isLast && (
          <div className="w-[2px] flex-1" style={{ background: c.line, minHeight: 20 }} />
        )}
      </div>

      {/* Content */}
      <div className="pb-4">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px]">{icon}</span>
          <span className="text-[12.5px] font-semibold" style={{ color: c.text }}>
            {label}
          </span>
          {state === 'active' && (
            <span
              className="ml-1 rounded-full px-1.5 py-[1px] text-[9px] font-bold"
              style={{ background: c.bg, color: c.dot }}
            >
              EN COURS
            </span>
          )}
        </div>
        {date && (
          <div className="mt-0.5 text-[10.5px]" style={{ color: 'var(--text-3)' }}>
            {formatDate(date)}
          </div>
        )}
      </div>
    </div>
  )
}
