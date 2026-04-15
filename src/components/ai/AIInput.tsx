import { useRef, useCallback } from 'react'

interface AIInputProps {
  value: string
  onChange: (v: string) => void
  onSend: () => void
  disabled?: boolean
}

export default function AIInput({ value, onChange, onSend, disabled }: AIInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const autoResize = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <div className="relative z-[1] w-full max-w-[640px]">
      <textarea
        ref={ref}
        className="ai-main-input-box"
        placeholder="Ex : Mon écran est noir depuis ce matin et j'ai un message d'erreur au démarrage…"
        rows={2}
        value={value}
        onChange={(e) => { onChange(e.target.value); autoResize() }}
        onKeyDown={handleKeyDown}
      />
      <button
        className="ai-main-send"
        disabled={disabled || !value.trim()}
        onClick={onSend}
      >
        <svg viewBox="0 0 20 20" className="h-[17px] w-[17px]" fill="none" stroke="#fff" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="10" x2="17" y2="10" />
          <polyline points="11,4 17,10 11,16" />
        </svg>
      </button>
    </div>
  )
}
