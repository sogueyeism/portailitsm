import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useChatStore } from '../store/chatStore'
import { useHybridChat } from '../hooks/useHybridChat'
import AIInput from '../components/ai/AIInput'
import QuickSuggestions from '../components/ai/QuickSuggestions'
import ServiceCatalogue from '../components/catalogue/ServiceCatalogue'
import ConversationView from '../components/ai/ConversationView'
import MachineProblemModal from '../components/modals/MachineProblemModal'
import PasswordResetModal from '../components/modals/PasswordResetModal'
import MailCreationModal from '../components/modals/MailCreationModal'
import AccountDeletionModal from '../components/modals/AccountDeletionModal'
import GenericServiceModal from '../components/modals/GenericServiceModal'

export default function HomePage() {
  const user = useAuthStore((s) => s.user)!
  const conversationStarted = useChatStore((s) => s.conversationStarted)
  const { sendMessage } = useHybridChat()
  const [inputValue, setInputValue] = useState('')
  const [showAccessDenied, setShowAccessDenied] = useState(false)
  const [openModal, setOpenModal] = useState<string | null>(null)

  // Listen for form redirect events from the chat
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.serviceId) {
        setOpenModal(detail.serviceId)
      }
    }
    window.addEventListener('open-service-form', handler)
    return () => window.removeEventListener('open-service-form', handler)
  }, [])

  const handleSend = () => {
    const text = inputValue.trim()
    if (!text) return
    setInputValue('')
    sendMessage(text)
  }

  const handleOpenModal = (id: string) => {
    setOpenModal(id)
  }

  // Known modal IDs (built-in services)
  const BUILT_IN_MODALS = ['machine', 'mdp', 'mail', 'delete']
  const isGenericModal = openModal && !BUILT_IN_MODALS.includes(openModal)

  // ── Conversation mode ──
  if (conversationStarted) {
    return (
      <div className="flex min-h-[calc(100vh-58px)] flex-col">
        <ConversationView />
        {/* Keep modals accèssible even in conversation mode */}
        <MachineProblemModal open={openModal === 'machine'} onClose={() => setOpenModal(null)} />
        <PasswordResetModal open={openModal === 'mdp'} onClose={() => setOpenModal(null)} />
        <MailCreationModal open={openModal === 'mail'} onClose={() => setOpenModal(null)} />
        <AccountDeletionModal open={openModal === 'delete'} onClose={() => setOpenModal(null)} />
        {isGenericModal && (
          <GenericServiceModal open={true} onClose={() => setOpenModal(null)} serviceId={openModal} />
        )}
      </div>
    )
  }

  // ── Default: Hero + Catalogue ──
  return (
    <div className="flex min-h-[calc(100vh-58px)] flex-col">
      {/* ══ Hero section ══ */}
      <section
        className="home-hero flex flex-col items-center px-8 pt-[52px] pb-12 text-center"
        style={{
          background: 'var(--brown-800)',
          backgroundImage: 'linear-gradient(rgba(42,20,0,.8), rgba(42,20,0,.9)), url(/bg-ism.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
        }}
      >
        <div
          className="mb-5 inline-flex items-center gap-2 rounded-[20px] px-3.5 py-[5px] text-[11px] font-bold uppercase tracking-[.6px]"
          style={{
            background: 'rgba(232,131,26,.12)',
            border: '1px solid rgba(232,131,26,.25)',
            color: 'var(--orange-300)',
          }}
        >
          <div
            className="h-1.5 w-1.5 animate-pulse rounded-full"
            style={{ background: 'var(--orange-400)' }}
          />
          Portail de services IT · Groupe ISM
        </div>

        <h1 className="mb-3 max-w-[520px] text-[32px] font-black leading-[1.1] tracking-[-1px] text-white">
          Bonjour{' '}
          <span style={{ color: 'var(--orange-400)' }}>{user.firstName}</span>{' '}
          <br />
          Comment puis-je vous aider ?
        </h1>

        <p
          className="mb-9 max-w-[380px] text-sm leading-[1.6]"
          style={{ color: 'rgba(255,255,255,.5)' }}
        >
          Décrivez votre problème en quelques mots — notre IA analyse, catégorise
          et cree votre ticket automatiquement.
        </p>

        <AIInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSend}
        />

        <QuickSuggestions onSelect={(t) => setInputValue(t)} />
      </section>

      {/* ══ Divider ══ */}
      <div
        className="mx-auto flex w-full max-w-[800px] items-center gap-4"
        style={{ padding: '28px 32px 0' }}
      >
        <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
        <span
          className="whitespace-nowrap text-[11px] font-bold uppercase tracking-[.7px]"
          style={{ color: 'var(--text-3)' }}
        >
          Ou choisissez directement un service
        </span>
        <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
      </div>

      {/* ══ Service catalogue ══ */}
      <ServiceCatalogue
        onOpenModal={handleOpenModal}
        onAccessDenied={() => setShowAccessDenied(true)}
      />

      {/* ══ Service modals ══ */}
      <MachineProblemModal open={openModal === 'machine'} onClose={() => setOpenModal(null)} />
      <PasswordResetModal open={openModal === 'mdp'} onClose={() => setOpenModal(null)} />
      <MailCreationModal open={openModal === 'mail'} onClose={() => setOpenModal(null)} />
      <AccountDeletionModal open={openModal === 'delete'} onClose={() => setOpenModal(null)} />
      {isGenericModal && (
        <GenericServiceModal open={true} onClose={() => setOpenModal(null)} serviceId={openModal} />
      )}

      {/* ══ Access denied overlay ══ */}
      {showAccessDenied && (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center p-5"
          style={{ background: 'rgba(42,20,0,.52)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAccessDenied(false) }}
        >
          <div
            className="w-[380px] max-w-[90vw] rounded-[var(--r-xl)] p-[34px_30px] text-center"
            style={{
              background: 'var(--surface)',
              boxShadow: 'var(--shadow-lg)',
              borderTop: '3px solid var(--danger)',
              animation: 'modal-in .2s cubic-bezier(.34,1.46,.64,1)',
            }}
          >
            <div className="mb-3 text-[34px]">🔒</div>
            <div className="mb-[7px] text-base font-extrabold" style={{ color: 'var(--text-1)' }}>
              Accès non autorisé
            </div>
            <div className="mb-[18px] text-[12.5px] leading-[1.55]" style={{ color: 'var(--text-2)' }}>
              Ce service est <strong>réservé</strong> a un profil spécifique.
              <br />
              Contactez votre administrateur IT si vous pensez avoir droit a cet accès.
            </div>
            <button
              className="inline-flex cursor-pointer items-center gap-[7px] rounded-[var(--r-sm)] border-none px-[22px] py-[9px] text-[12.5px] font-bold text-white"
              style={{ background: 'var(--accent)' }}
              onClick={() => setShowAccessDenied(false)}
            >
              Compris
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
