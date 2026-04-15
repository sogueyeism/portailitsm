interface Props {
  question: string
  options: { label: string; value: string }[]
  onSelect: (value: string) => void
  onOther: () => void
}

export default function QuickReplies({ question, options, onSelect, onOther }: Props) {
  return (
    <div className="mt-1.5 max-w-[420px]">
      <div
        className="mb-2 rounded-2xl border px-4 py-3 text-[13.5px]"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-1)' }}
      >
        {question}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className="cursor-pointer rounded-xl border px-4 py-2 text-[12.5px] font-semibold transition-all"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text-2)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)'
              e.currentTarget.style.background = 'var(--accent-lt)'
              e.currentTarget.style.color = 'var(--accent)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.background = 'var(--surface)'
              e.currentTarget.style.color = 'var(--text-2)'
            }}
          >
            {opt.label}
          </button>
        ))}
        <button
          onClick={onOther}
          className="cursor-pointer rounded-xl border border-dashed px-4 py-2 text-[12.5px] font-semibold transition-all"
          style={{ borderColor: 'var(--border)', background: 'transparent', color: 'var(--text-3)' }}
        >
          Autre (decrire)
        </button>
      </div>
    </div>
  )
}
