interface Props {
  step: number
  total: number
}

export default function ChatProgressBar({ step, total }: Props) {
  const pct = (step / total) * 100
  return (
    <div className="flex items-center gap-3 border-t px-5 py-2" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
      <div className="flex-1 overflow-hidden rounded-full" style={{ height: 4, background: 'var(--border)' }}>
        <div
          className="rounded-full transition-all duration-300"
          style={{ height: 4, width: `${pct}%`, background: 'var(--accent)' }}
        />
      </div>
      <span className="whitespace-nowrap text-[10px] font-bold" style={{ color: 'var(--text-3)' }}>
        Etape {step}/{total}
      </span>
    </div>
  )
}
