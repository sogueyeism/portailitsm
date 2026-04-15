export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  ticket?: AITicketData | null
  imageUrl?: string
  formRedirect?: { serviceId: string; serviceName: string } | null
}

export interface FormFieldValue {
  label: string
  value: string | string[] | boolean
  type: string
  fileUrls?: string[]  // URLs of uploaded files
}

export interface AITicketData {
  service: string
  categorie: string
  emoji: string
  titre: string
  description: string
  urgence: 'Faible' | 'Normal' | 'Élevée' | 'Urgente'
  urgence_raison: string
  sla: string
  formData?: FormFieldValue[]  // Structured form data
  attachments?: string[]       // All file URLs
}

export interface AIResponse {
  text: string
  ticket?: AITicketData
}
