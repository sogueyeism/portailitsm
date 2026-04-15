import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import type { ChatMessage as ChatMsg } from '../../types/ai'

interface ChatMessageProps {
  message: ChatMsg
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const initials = useAuthStore((s) => s.user!.initials)
  const isAI = message.role === 'assistant'
  const [fullscreen, setFullscreen] = useState(false)

  // Remove [Capture jointe] / [Capture ecran jointe] from display text
  const displayContent = message.content
    .replace(/\n?\[Capture[^\]]*\]/g, '')
    .trim()

  return (
    <>
      <div className={`msg ${isAI ? 'msg-ai' : 'msg-user'}`}>
        <div className={`msg-av ${isAI ? 'av-ai' : 'av-user'}`}>
          {isAI ? 'IA' : initials}
        </div>
        <div className="msg-content">
          {/* Image attachment */}
          {message.imageUrl && (
            <div
              className="mb-1.5 cursor-pointer overflow-hidden rounded-xl border"
              style={{ borderColor: 'var(--border)', maxWidth: 260 }}
              onClick={() => setFullscreen(true)}
            >
              <img
                src={message.imageUrl}
                alt="Capture jointe"
                className="block w-full"
                style={{ maxHeight: 200, objectFit: 'cover' }}
              />
              <div
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10.5px] font-semibold"
                style={{ background: 'var(--ai-lt)', color: 'var(--ai)' }}
              >
                <svg viewBox="0 0 14 14" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <rect x="1" y="1" width="12" height="12" rx="2" />
                  <circle cx="5" cy="5" r="1.2" />
                  <path d="M1 10l3.5-3.5a1 1 0 0 1 1.4 0L9 9.5" />
                </svg>
                Capture jointe — cliquer pour agrandir
              </div>
            </div>
          )}

          {/* Text bubble */}
          <div className="msg-bubble">
            {displayContent || (
              <div className="typing-indicator">
                <span /><span /><span />
              </div>
            )}
          </div>

          {/* Form redirect button */}
          {message.formRedirect && (
            <a
              href={`/#/form/${message.formRedirect.serviceId}`}
              onClick={(e) => {
                e.preventDefault()
                // Navigate to the service form via the catalogue
                const event = new CustomEvent('open-service-form', {
                  detail: { serviceId: message.formRedirect!.serviceId },
                })
                window.dispatchEvent(event)
              }}
              className="mt-2 flex cursor-pointer items-center gap-2 rounded-xl border-none px-4 py-2.5 text-[13px] font-bold text-white no-underline transition-colors"
              style={{ background: 'var(--accent)', display: 'inline-flex' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-dk)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)' }}
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="14" height="14" rx="2" />
                <line x1="7" y1="8" x2="13" y2="8" />
                <line x1="7" y1="11" x2="11" y2="11" />
              </svg>
              Acceder au formulaire : {message.formRedirect.serviceName}
            </a>
          )}

          <div className="msg-time">{message.timestamp}</div>
        </div>
      </div>

      {/* Fullscreen image overlay */}
      {fullscreen && message.imageUrl && (
        <div
          className="fixed inset-0 z-[600] flex items-center justify-center p-5"
          style={{ background: 'rgba(0,0,0,.8)', backdropFilter: 'blur(4px)' }}
          onClick={() => setFullscreen(false)}
        >
          <img
            src={message.imageUrl}
            alt="Capture jointe"
            style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 12, boxShadow: '0 8px 40px rgba(0,0,0,.4)' }}
          />
          <button
            onClick={() => setFullscreen(false)}
            className="absolute right-5 top-5 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-none text-white"
            style={{ background: 'rgba(255,255,255,.15)' }}
          >
            <svg viewBox="0 0 14 14" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <line x1="2" y1="2" x2="12" y2="12" /><line x1="12" y1="2" x2="2" y2="12" />
            </svg>
          </button>
        </div>
      )}
    </>
  )
}
