import { useCallback } from 'react'
import { useChatStore, makeMsgId } from '../store/chatStore'
import { useDemandStore } from '../store/demandStore'
import { useAuthStore } from '../store/authStore'
import { detectIntent, getQuickReplies, getServiceFormFields } from '../utils/intentDetector'
import { streamChat } from '../services/anthropic'
import type { AITicketData } from '../types/ai'

function now() {
  return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export function useHybridChat() {
  const store = useChatStore()
  const addDemand = useDemandStore((s) => s.addDemand)
  const authUser = useAuthStore((s) => s.user)!
  const hybrid = useChatStore((s) => s.hybrid)
  const setHybrid = useChatStore((s) => s.setHybrid)

  // Step 1: User sends first message -> detect intent
  const sendFirstMessage = useCallback((text: string) => {
    if (!store.conversationStarted) {
      store.setConversationStarted(true)
      store.addMessage({
        id: makeMsgId(), role: 'assistant', timestamp: now(),
        content: `Bonjour ${authUser.firstName} ! Je suis l'assistant IT du Groupe ISM.`,
      })
    }

    store.addMessage({ id: makeMsgId(), role: 'user', content: text, timestamp: now() })

    const intent = detectIntent(text)

    if (intent && intent.confidence >= 0.15) {
      store.addMessage({
        id: makeMsgId(), role: 'assistant', timestamp: now(),
        content: 'J\'ai identifie votre besoin :',
      })

      const hasSubTypes = getQuickReplies(intent.service.id).length > 0

      setHybrid({
        step: 'intent',
        stepNumber: 1,
        totalSteps: hasSubTypes ? 4 : 3,
        intentService: intent.service,
        intentSubType: intent.subType || null,
        intentConfidence: intent.confidence,
        intentKeywords: intent.keywords,
        formFields: getServiceFormFields(intent.service),
      })
    } else {
      setHybrid({ step: 'fallback' })
      fallbackToAI(text)
    }
  }, [store, authUser, setHybrid])

  const confirmIntent = useCallback(() => {
    const replies = getQuickReplies(hybrid.intentService!.id)

    if (replies.length > 0 && !hybrid.intentSubType) {
      setHybrid({ step: 'subtype', stepNumber: 2 })
    } else {
      store.addMessage({
        id: makeMsgId(), role: 'assistant', timestamp: now(),
        content: `${hybrid.intentService!.emoji} ${hybrid.intentService!.name}${hybrid.intentSubType ? ' — ' + hybrid.intentSubType : ''} confirme.`,
      })
      setHybrid({ step: 'form', stepNumber: replies.length > 0 ? 3 : 2 })
    }
  }, [hybrid, store, setHybrid])

  const denyIntent = useCallback(() => {
    store.addMessage({
      id: makeMsgId(), role: 'assistant', timestamp: now(),
      content: 'Pas de souci. Pouvez-vous me decrire votre besoin plus en detail ?',
    })
    setHybrid({ step: 'fallback' })
  }, [store, setHybrid])

  const selectSubType = useCallback((value: string) => {
    store.addMessage({ id: makeMsgId(), role: 'user', content: value, timestamp: now() })
    store.addMessage({
      id: makeMsgId(), role: 'assistant', timestamp: now(),
      content: `${hybrid.intentService!.emoji} ${hybrid.intentService!.name} — ${value} confirme.`,
    })
    setHybrid({ step: 'form', stepNumber: 3, intentSubType: value })
  }, [hybrid, store, setHybrid])

  const selectOther = useCallback(() => {
    store.addMessage({
      id: makeMsgId(), role: 'assistant', timestamp: now(),
      content: 'Decrivez-moi votre probleme en detail.',
    })
    setHybrid({ step: 'fallback' })
  }, [store, setHybrid])

  const submitForm = useCallback(async (values: Record<string, any>, fileUrls: string[]) => {
    setHybrid({ step: 'generating', stepNumber: hybrid.totalSteps })

    const service = hybrid.intentService!
    const subType = hybrid.intentSubType
    const urgency = values.urgency || values.urgence || 'Normal'

    const descParts = Object.entries(values)
      .filter(([, v]) => v && String(v).trim())
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n')

    const ticket: AITicketData = {
      service: service.name,
      categorie: service.categorie,
      emoji: service.emoji,
      titre: `${subType || service.name}${values.location ? ' — ' + values.location : ''}`,
      description: descParts,
      urgence: urgency as AITicketData['urgence'],
      urgence_raison: urgency === 'Urgente' ? 'Bloquant pour le travail' : 'Standard',
      sla: service.sla,
      attachments: fileUrls.length > 0 ? fileUrls : undefined,
    }

    const assistantId = makeMsgId()
    store.addMessage({
      id: assistantId, role: 'assistant', timestamp: now(),
      content: 'Votre demande est prete !',
      ticket,
    })
    store.setLastTicket(ticket)
    setHybrid({ step: 'done' })
  }, [hybrid, store, authUser, addDemand, setHybrid])

  const fallbackToAI = useCallback(async (text: string) => {
    store.pushApiHistory({ role: 'user', content: text })
    store.setLoading(true)
    store.setStreamingContent('')

    const assistantId = makeMsgId()
    store.addMessage({ id: assistantId, role: 'assistant', content: '', timestamp: now() })

    const apiHistory = useChatStore.getState().apiHistory

    try {
      await streamChat(apiHistory, {
        onToken(token) {
          store.appendStreamingContent(token)
          const soFar = useChatStore.getState().streamingContent
          store.updateLastAssistantContent(soFar.split('<<<TICKET>>>')[0].split('<<<FORM>>>')[0])
        },
        onDone(fullText) {
          const parts = fullText.split('<<<TICKET>>>')
          const text = parts[0].trim()
          store.updateLastAssistantContent(text)
          store.pushApiHistory({ role: 'assistant', content: text })

          if (parts[1]) {
            try {
              const ticket = JSON.parse(parts[1].trim().replace(/```json|```/g, '').trim())
              store.setLastTicket(ticket)
              const msgs = useChatStore.getState().messages
              useChatStore.setState({ messages: msgs.map((m) => m.id === assistantId ? { ...m, ticket } : m) })

              const demandId = `DEM-${String(Date.now()).slice(-4)}`
              addDemand({
                id: demandId, userId: authUser.id, userName: authUser.displayName,
                userEmail: authUser.email, userFirstName: authUser.firstName, userLastName: authUser.lastName,
                createdAt: new Date().toISOString(), status: 'pending', horsCategorie: false, ticket,
                conversation: useChatStore.getState().apiHistory.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
              })
            } catch {}
          }

          store.setLoading(false)
          store.setStreamingContent('')
        },
        onError() {
          store.updateLastAssistantContent('Erreur. Veuillez reessayer.')
          store.pushApiHistory({ role: 'assistant', content: 'Erreur.' })
          store.setLoading(false)
          store.setStreamingContent('')
        },
      })
    } catch {
      store.updateLastAssistantContent('Erreur de connexion.')
      store.setLoading(false)
    }
  }, [store, authUser, addDemand])

  const sendMessage = useCallback((text: string, _imageUrl?: string) => {
    const step = useChatStore.getState().hybrid.step
    if (step === 'idle') {
      sendFirstMessage(text)
    } else if (step === 'fallback') {
      store.addMessage({ id: makeMsgId(), role: 'user', content: text, timestamp: now() })
      fallbackToAI(text)
    }
  }, [sendFirstMessage, fallbackToAI, store])

  return {
    messages: store.messages,
    isLoading: store.isLoading,
    conversationStarted: store.conversationStarted,
    lastTicket: store.lastTicket,
    ticketSubmitted: store.ticketSubmitted,
    sendMessage,
    setLastTicket: store.setLastTicket,
    setTicketSubmitted: store.setTicketSubmitted,
    hybrid,
    confirmIntent,
    denyIntent,
    selectSubType,
    selectOther,
    submitForm,
    addSystemMessage: (content: string) => {
      store.addMessage({ id: makeMsgId(), role: 'assistant', content, timestamp: now() })
    },
  }
}
