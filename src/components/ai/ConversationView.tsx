import { useRef, useEffect, useState, useCallback } from 'react'
import ChatMessage from './ChatMessage'
import TicketPreview from './TicketPreview'
import { useHybridChat } from '../../hooks/useHybridChat'
import { useChatStore } from '../../store/chatStore'
import { useDemandStore } from '../../store/demandStore'
import { useAuthStore } from '../../store/authStore'
import { getQuickReplies } from '../../utils/intentDetector'
import IntentCard from '../chat/IntentCard'
import QuickReplies from '../chat/QuickReplies'
import ChatInlineForm from '../chat/ChatInlineForm'
import ChatProgressBar from '../chat/ChatProgressBar'
import type { AITicketData } from '../../types/ai'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

export default function ConversationView() {
  const {
    messages, isLoading, lastTicket, ticketSubmitted,
    sendMessage, setLastTicket, setTicketSubmitted, addSystemMessage,
    hybrid, confirmIntent, denyIntent, selectSubType, selectOther, submitForm,
  } = useHybridChat()

  const reset = useChatStore((s) => s.reset)

  const [inputValue, setInputValue] = useState('')
  const [pendingImage, setPendingImage] = useState<{ url: string; file: File } | null>(null)
  const [uploading, setUploading] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, hybrid.step])

  useEffect(() => {
    if (!isLoading) inputRef.current?.focus()
  }, [isLoading])

  const handleSend = useCallback(async () => {
    const text = inputValue.trim()
    if ((!text && !pendingImage) || isLoading) return
    setInputValue('')

    let imageUrl: string | undefined
    if (pendingImage) {
      setUploading(true)
      try {
        const form = new FormData()
        form.append('image', pendingImage.file)
        const res = await fetch(`${API_BASE}/api/upload`, { method: 'POST', body: form })
        const data = await res.json()
        if (data.success) imageUrl = `${API_BASE}${data.url}`
      } catch {}
      setUploading(false)
      setPendingImage(null)
    }

    sendMessage(text, imageUrl)
  }, [inputValue, isLoading, pendingImage, sendMessage])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) { setPendingImage({ url: URL.createObjectURL(file), file }); e.target.value = '' }
  }

  const handleConfirm = (ticket: AITicketData) => {
    const authUser = useAuthStore.getState().user!
    const demandId = `DEM-${String(Date.now()).slice(-4)}`

    useDemandStore.getState().addDemand({
      id: demandId,
      userId: authUser.id,
      userName: authUser.displayName,
      userEmail: authUser.email,
      userFirstName: authUser.firstName,
      userLastName: authUser.lastName,
      createdAt: new Date().toISOString(),
      status: 'pending',
      horsCategorie: false,
      ticket,
      conversation: useChatStore.getState().messages.map((m) => ({
        role: m.role as 'user' | 'assistant', content: m.content,
      })),
    })

    setTicketSubmitted(true)
    addSystemMessage(
      `Votre demande ${demandId} a ete soumise avec succes. L'equipe DSI va la valider et la verser dans GLPI.`,
    )
  }

  const handleUpdate = (updated: AITicketData) => {
    setLastTicket(updated)
    addSystemMessage('Ticket mis a jour. Vous pouvez maintenant le soumettre.')
  }

  // Should we show the input bar? Not during intent/subtype/form steps
  const showInput = hybrid.step === 'idle' || hybrid.step === 'fallback' || hybrid.step === 'done'

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div
        className="flex items-center gap-3 border-b px-5 py-3"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <button
          onClick={reset}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg border-none px-3 py-[7px] text-xs font-bold transition-colors"
          style={{ background: 'var(--bg)', color: 'var(--text-2)' }}
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="12,4 5,10 12,16" />
          </svg>
          Accueil
        </button>
        <div className="h-4 w-px" style={{ background: 'var(--border)' }} />
        <span className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>
          Conversation avec l'assistant IA
        </span>
      </div>

      {/* Messages */}
      <div className="ai-conversation-wrap" style={{ flex: 1 }}>
        <div className="messages-list" ref={listRef}>
          {messages.map((msg) => (
            <div key={msg.id}>
              <ChatMessage message={msg} />
              {msg.ticket && lastTicket && (
                <div style={{ marginLeft: 40 }}>
                  <TicketPreview
                    ticket={lastTicket}
                    submitted={ticketSubmitted}
                    onConfirm={handleConfirm}
                    onUpdate={handleUpdate}
                  />
                </div>
              )}
            </div>
          ))}

          {/* Hybrid UI elements rendered after the last message */}
          {hybrid.step === 'intent' && hybrid.intentService && (
            <div style={{ marginLeft: 42 }}>
              <IntentCard
                intent={{
                  service: hybrid.intentService,
                  subType: hybrid.intentSubType || undefined,
                  confidence: hybrid.intentConfidence,
                  keywords: hybrid.intentKeywords,
                }}
                onConfirm={confirmIntent}
                onDeny={denyIntent}
              />
            </div>
          )}

          {hybrid.step === 'subtype' && hybrid.intentService && (
            <div style={{ marginLeft: 42 }}>
              <QuickReplies
                question="Pouvez-vous preciser le type de probleme ?"
                options={getQuickReplies(hybrid.intentService.id)}
                onSelect={selectSubType}
                onOther={selectOther}
              />
            </div>
          )}

          {hybrid.step === 'form' && hybrid.intentService && (
            <div style={{ marginLeft: 42 }}>
              <ChatInlineForm
                fields={hybrid.formFields}
                step={hybrid.stepNumber}
                totalSteps={hybrid.totalSteps}
                onSubmit={submitForm}
              />
            </div>
          )}

          {hybrid.step === 'generating' && (
            <div className="msg msg-ai">
              <div className="msg-av av-ai">IA</div>
              <div className="msg-content">
                <div className="msg-bubble">
                  <div className="typing-indicator"><span /><span /><span /></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar (hybrid mode only) */}
      {hybrid.step !== 'idle' && hybrid.step !== 'fallback' && hybrid.step !== 'done' && (
        <ChatProgressBar step={hybrid.stepNumber} total={hybrid.totalSteps} />
      )}

      {/* Input bar */}
      {showInput && (
        <div className="sticky-input-bar">
          {pendingImage && (
            <div className="mx-auto mb-2 flex max-w-[672px] items-center gap-3 rounded-lg border px-3 py-2" style={{ borderColor: 'var(--ai-md)', background: 'var(--ai-lt)' }}>
              <img src={pendingImage.url} alt="Preview" className="h-12 w-12 rounded object-cover" />
              <span className="flex-1 text-[12px] font-medium" style={{ color: 'var(--ai)' }}>Capture jointe</span>
              <button onClick={() => { URL.revokeObjectURL(pendingImage.url); setPendingImage(null) }} className="flex h-6 w-6 cursor-pointer items-center justify-center rounded border-none" style={{ background: 'rgba(74,29,150,.1)', color: 'var(--ai)' }}>
                <svg viewBox="0 0 14 14" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="2" y1="2" x2="12" y2="12" /><line x1="12" y1="2" x2="2" y2="12" /></svg>
              </button>
            </div>
          )}
          <div className="sticky-input-inner">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
            <button onClick={() => fileRef.current?.click()} disabled={isLoading || uploading} className="flex h-[42px] w-[42px] shrink-0 cursor-pointer items-center justify-center rounded-lg border transition-colors disabled:opacity-40" style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text-3)' }} title="Joindre une capture">
              <svg viewBox="0 0 20 20" className="h-[17px] w-[17px]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="14" height="14" rx="2" /><circle cx="7.5" cy="7.5" r="1.5" /><path d="M3 14l4-4a1.5 1.5 0 0 1 2 0l4 4" /></svg>
            </button>
            <textarea
              ref={inputRef}
              className="sticky-textarea"
              placeholder="Posez une question ou ajoutez des precisions..."
              rows={1}
              value={inputValue}
              onChange={(e) => { setInputValue(e.target.value); autoResize(e.target) }}
              onKeyDown={handleKey}
            />
            <button className="sticky-send" disabled={isLoading || uploading || (!inputValue.trim() && !pendingImage)} onClick={handleSend}>
              {uploading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <svg viewBox="0 0 20 20" className="h-[17px] w-[17px]" fill="none" stroke="#fff" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="10" x2="17" y2="10" /><polyline points="11,4 17,10 11,16" /></svg>
              )}
            </button>
          </div>
          <div className="sticky-hint">Entree pour envoyer · Maj+Entree pour saut de ligne</div>
        </div>
      )}
    </div>
  )
}
