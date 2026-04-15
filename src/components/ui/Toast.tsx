import { useEffect, useState } from 'react'

export interface ToastData {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
}

const TOAST_STYLES: Record<ToastData['type'], { bg: string; color: string; border: string }> = {
  success: { bg: 'var(--success-lt)', color: 'var(--success)', border: 'rgba(26,122,74,.2)' },
  error:   { bg: 'var(--danger-lt)', color: 'var(--danger)', border: 'rgba(156,32,32,.2)' },
  info:    { bg: 'var(--info-lt)', color: 'var(--info)', border: 'rgba(26,94,156,.2)' },
}

const ICONS: Record<ToastData['type'], string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
}

let listeners: ((toasts: ToastData[]) => void)[] = []
let toastList: ToastData[] = []

export function showToast(type: ToastData['type'], message: string) {
  const toast: ToastData = { id: `t-${Date.now()}`, type, message }
  toastList = [...toastList, toast]
  listeners.forEach((l) => l(toastList))
  setTimeout(() => {
    toastList = toastList.filter((t) => t.id !== toast.id)
    listeners.forEach((l) => l(toastList))
  }, 3500)
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([])

  useEffect(() => {
    listeners.push(setToasts)
    return () => {
      listeners = listeners.filter((l) => l !== setToasts)
    }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-[600] flex flex-col gap-2">
      {toasts.map((toast) => {
        const s = TOAST_STYLES[toast.type]
        return (
          <div
            key={toast.id}
            className="flex items-center gap-2.5 rounded-xl border px-4 py-3 text-[13px] font-semibold shadow-lg"
            style={{
              background: s.bg,
              color: s.color,
              borderColor: s.border,
              animation: 'modal-in .2s ease',
              minWidth: 260,
            }}
          >
            <span className="text-[15px] font-extrabold">{ICONS[toast.type]}</span>
            {toast.message}
          </div>
        )
      })}
    </div>
  )
}
