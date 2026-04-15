type BadgeVariant = 'orange' | 'green' | 'red' | 'blue' | 'purple' | 'gray'

const VARIANTS: Record<BadgeVariant, { bg: string; color: string }> = {
  orange: { bg: 'var(--accent-lt)', color: 'var(--accent)' },
  green:  { bg: 'var(--success-lt)', color: 'var(--success)' },
  red:    { bg: 'var(--danger-lt)', color: 'var(--danger)' },
  blue:   { bg: 'var(--info-lt)', color: 'var(--info)' },
  purple: { bg: 'var(--ai-lt)', color: 'var(--ai)' },
  gray:   { bg: 'var(--bg)', color: 'var(--text-3)' },
}

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  dot?: boolean
}

export default function Badge({ variant = 'gray', children, dot }: BadgeProps) {
  const s = VARIANTS[variant]
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[10.5px] font-bold"
      style={{ background: s.bg, color: s.color }}
    >
      {dot && (
        <span
          className="inline-block h-[5px] w-[5px] rounded-full"
          style={{ background: s.color }}
        />
      )}
      {children}
    </span>
  )
}
