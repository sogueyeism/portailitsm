import { create } from 'zustand'
import type { ChatMessage, AITicketData } from '../types/ai'
import type { CatalogueService, FormField } from './catalogueStore'

export type HybridStep = 'idle' | 'intent' | 'subtype' | 'form' | 'generating' | 'done' | 'fallback'

export interface HybridState {
  step: HybridStep
  stepNumber: number
  totalSteps: number
  intentService: CatalogueService | null
  intentSubType: string | null
  intentConfidence: number
  intentKeywords: string[]
  formFields: FormField[]
}

interface ChatState {
  messages: ChatMessage[]
  apiHistory: { role: string; content: string }[]
  conversationStarted: boolean
  isLoading: boolean
  streamingContent: string
  lastTicket: AITicketData | null
  ticketSubmitted: boolean
  hybrid: HybridState

  addMessage: (msg: ChatMessage) => void
  pushApiHistory: (entry: { role: string; content: string }) => void
  updateLastAssistantContent: (content: string) => void
  setConversationStarted: (v: boolean) => void
  setLoading: (v: boolean) => void
  setStreamingContent: (v: string) => void
  appendStreamingContent: (token: string) => void
  setLastTicket: (t: AITicketData | null) => void
  setTicketSubmitted: (v: boolean) => void
  setHybrid: (h: Partial<HybridState>) => void
  reset: () => void
}

let nextId = 1
export const makeMsgId = () => `msg-${nextId++}`

const INITIAL_HYBRID: HybridState = {
  step: 'idle',
  stepNumber: 0,
  totalSteps: 4,
  intentService: null,
  intentSubType: null,
  intentConfidence: 0,
  intentKeywords: [],
  formFields: [],
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  apiHistory: [],
  conversationStarted: false,
  isLoading: false,
  streamingContent: '',
  lastTicket: null,
  ticketSubmitted: false,
  hybrid: INITIAL_HYBRID,

  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  pushApiHistory: (entry) => set((s) => ({ apiHistory: [...s.apiHistory, entry] })),

  updateLastAssistantContent: (content) =>
    set((s) => {
      const msgs = [...s.messages]
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === 'assistant') {
          msgs[i] = { ...msgs[i], content }
          break
        }
      }
      return { messages: msgs }
    }),

  setConversationStarted: (v) => set({ conversationStarted: v }),
  setLoading: (v) => set({ isLoading: v }),
  setStreamingContent: (v) => set({ streamingContent: v }),
  appendStreamingContent: (token) =>
    set((s) => ({ streamingContent: s.streamingContent + token })),
  setLastTicket: (t) => set({ lastTicket: t, ticketSubmitted: false }),
  setTicketSubmitted: (v) => set({ ticketSubmitted: v }),
  setHybrid: (h) => set((s) => ({ hybrid: { ...s.hybrid, ...h } })),

  reset: () =>
    set({
      messages: [],
      apiHistory: [],
      conversationStarted: false,
      isLoading: false,
      streamingContent: '',
      lastTicket: null,
      ticketSubmitted: false,
      hybrid: INITIAL_HYBRID,
    }),
}))
