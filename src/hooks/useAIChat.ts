import { useCallback } from 'react'
import { useChatStore, makeMsgId } from '../store/chatStore'
import { useDemandStore } from '../store/demandStore'
import { useAuthStore } from '../store/authStore'
import { streamChat } from '../services/anthropic'
import type { AITicketData } from '../types/ai'

function now() {
  return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

interface FormRedirect {
  serviceId: string
  serviceName: string
}

/** Parse the <<<TICKET>>> or <<<FORM>>> delimiter from a full response. */
function parseResponse(full: string): { text: string; ticket: AITicketData | null; formRedirect: FormRedirect | null } {
  let formRedirect: FormRedirect | null = null

  // Check for <<<FORM>>> first
  const formParts = full.split('<<<FORM>>>')
  if (formParts[1]) {
    try {
      const cleaned = formParts[1].trim().replace(/```json|```/g, '').trim()
      formRedirect = JSON.parse(cleaned)
    } catch {}
    return { text: formParts[0].trim(), ticket: null, formRedirect }
  }

  // Check for <<<TICKET>>>
  const parts = full.split('<<<TICKET>>>')
  const text = parts[0].trim()
  let ticket: AITicketData | null = null

  if (parts[1]) {
    try {
      const cleaned = parts[1].trim().replace(/```json|```/g, '').trim()
      ticket = JSON.parse(cleaned)
    } catch {}
  }

  return { text, ticket, formRedirect }
}

export function useAIChat() {
  const store = useChatStore()
  const addDemand = useDemandStore((s) => s.addDemand)
  const authUser = useAuthStore((s) => s.user)!

  const sendMessage = useCallback(
    async (text: string, imageUrl?: string) => {
      const trimmed = text.trim()
      if ((!trimmed && !imageUrl) || store.isLoading) return

      // Switch to conversation mode + add welcome message
      if (!store.conversationStarted) {
        store.setConversationStarted(true)
        store.addMessage({
          id: makeMsgId(),
          role: 'assistant',
          content: `Bonjour ${authUser.firstName} ! Je suis l'assistant IT du Groupe ISM. Décrivez-moi votre problème ou besoin et je m'occupe de créer votre ticket.`,
          timestamp: now(),
        })
      }

      // Clear previous ticket state for new turn
      store.setLastTicket(null)

      // Add user message to UI
      store.addMessage({
        id: makeMsgId(),
        imageUrl,
        role: 'user',
        content: trimmed,
        timestamp: now(),
      })

      // Add to API history (persisted in store, survives re-renders)
      store.pushApiHistory({ role: 'user', content: trimmed })

      // Prepare streaming
      store.setLoading(true)
      store.setStreamingContent('')

      // Add a placeholder assistant message
      const assistantId = makeMsgId()
      store.addMessage({
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: now(),
      })

      // Get the full API history from the store
      const apiHistory = useChatStore.getState().apiHistory

      try {
        await streamChat(apiHistory, {
          onToken(token) {
            store.appendStreamingContent(token)

            // Show only the conversational part (before delimiters) during streaming
            const soFar = useChatStore.getState().streamingContent
            const visible = soFar.split('<<<TICKET>>>')[0].split('<<<FORM>>>')[0]
            store.updateLastAssistantContent(visible)
          },

          onDone(fullText) {
            const { text, ticket, formRedirect } = parseResponse(fullText)

            // Finalise assistant message with clean text
            store.updateLastAssistantContent(text)

            // If form redirect, attach to the message
            if (formRedirect) {
              const msgs = useChatStore.getState().messages
              const updated = msgs.map((m) =>
                m.id === assistantId ? { ...m, formRedirect } : m,
              )
              useChatStore.setState({ messages: updated })
            }

            // Push clean assistant response to API history
            store.pushApiHistory({ role: 'assistant', content: text })

            if (ticket) {
              store.setLastTicket(ticket)
              // Attach ticket to the assistant message
              const msgs = useChatStore.getState().messages
              const updated = msgs.map((m) =>
                m.id === assistantId ? { ...m, ticket } : m,
              )
              useChatStore.setState({ messages: updated })

              // Push demand to the back office store
              const currentHistory = useChatStore.getState().apiHistory
              const demandId = `DEM-${String(Date.now()).slice(-4)}`
              addDemand({
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
                conversation: currentHistory.map((m) => ({
                  role: m.role as 'user' | 'assistant',
                  content: m.content,
                })),
              })
            }

            // "Hors catalogue" responses are just informational — no demand created

            store.setLoading(false)
            store.setStreamingContent('')
          },

          onError(err) {
            const errMsg =
              "Je n'ai pas pu analyser votre demande. Vous pouvez utiliser les formulaires ou réessayer."
            store.updateLastAssistantContent(errMsg)
            store.pushApiHistory({ role: 'assistant', content: errMsg })
            store.setLoading(false)
            store.setStreamingContent('')
            console.error('AI error:', err)
          },
        })
      } catch (err) {
        const errMsg =
          "Erreur de connexion. Vérifiez votre connexion ou utilisez directement les formulaires disponibles."
        store.updateLastAssistantContent(errMsg)
        store.pushApiHistory({ role: 'assistant', content: errMsg })
        store.setLoading(false)
        store.setStreamingContent('')
        console.error(err)
      }
    },
    [store],
  )

  return {
    messages: store.messages,
    isLoading: store.isLoading,
    conversationStarted: store.conversationStarted,
    lastTicket: store.lastTicket,
    ticketSubmitted: store.ticketSubmitted,
    sendMessage,
    setLastTicket: store.setLastTicket,
    setTicketSubmitted: store.setTicketSubmitted,
    addSystemMessage: (content: string) => {
      store.addMessage({
        id: makeMsgId(),
        role: 'assistant',
        content,
        timestamp: now(),
      })
    },
  }
}
