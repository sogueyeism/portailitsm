import { useEffect, useRef } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  icon?: string
  children: React.ReactNode
  width?: number
}

export default function Modal({ open, onClose, title, icon, children, width = 460 }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[500] flex items-center justify-center p-5"
      style={{ background: 'rgba(42,20,0,.52)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div
        className="rounded-2xl"
        style={{
          width,
          maxWidth: '92vw',
          maxHeight: '85vh',
          background: 'var(--surface)',
          boxShadow: 'var(--shadow-lg)',
          animation: 'modal-in .2s cubic-bezier(.34,1.46,.64,1)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 border-b px-6 py-4"
          style={{ borderColor: 'var(--border)' }}
        >
          {icon && <span className="text-[22px]">{icon}</span>}
          <h2 className="flex-1 text-[16px] font-extrabold" style={{ color: 'var(--text-1)' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border-none transition-colors"
            style={{ background: 'var(--bg)', color: 'var(--text-3)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--border)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg)' }}
          >
            <svg viewBox="0 0 14 14" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <line x1="2" y1="2" x2="12" y2="12" />
              <line x1="12" y1="2" x2="2" y2="12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  )
}
