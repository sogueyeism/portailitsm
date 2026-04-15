import { create } from 'zustand'
import {
  fetchServices, createService as apiCreate, updateService as apiUpdate, deleteService as apiDelete,
} from '../services/api'

export type ServiceMode = 'chat' | 'form'

export type FormFieldType =
  | 'text'           // Texte court
  | 'textarea'       // Texte long
  | 'select'         // Liste deroulante (1 choix)
  | 'multiselect'    // Liste a choix multiples
  | 'checkbox'       // Case a cocher (oui/non)
  | 'checkboxgroup'  // Groupe de cases a cocher
  | 'radio'          // Boutons radio (1 choix)
  | 'date'           // Date
  | 'datetime'       // Date + heure
  | 'time'           // Heure
  | 'email'          // Email
  | 'phone'          // Telephone
  | 'number'         // Nombre
  | 'file'           // Fichier a joindre (image, PDF, etc.)
  | 'section'        // Separateur de section (pas un champ, juste un titre)

export interface FormField {
  id: string
  label: string
  type: FormFieldType
  placeholder?: string
  required: boolean
  options?: string[]           // Pour select, multiselect, checkboxgroup, radio
  accept?: string              // Pour file: "image/*", ".pdf", "image/*,.pdf,.doc,.docx"
  maxFiles?: number            // Pour file: nombre max de fichiers
  helpText?: string            // Texte d'aide sous le champ
  min?: number                 // Pour number: valeur min
  max?: number                 // Pour number: valeur max
}

export interface CatalogueService {
  id: string
  emoji: string
  name: string
  desc: string
  sla: string
  slaSpeed: 'fast' | 'mid' | 'slow'
  iconColor: 'orange' | 'blue' | 'green' | 'red'
  categorie: string
  active: boolean
  restricted: boolean
  restrictedTo?: string
  glpiCategoryId?: number
  mode: ServiceMode  // 'chat' = IA gere, 'form' = redirige vers formulaire
  formFields?: FormField[]  // Dynamic form fields for 'form' mode
}

interface CatalogueState {
  services: CatalogueService[]
  loaded: boolean
  loadServices: () => Promise<void>
  addService: (svc: CatalogueService) => void
  updateService: (id: string, patch: Partial<CatalogueService>) => void
  removeService: (id: string) => void
  toggleActive: (id: string) => void
}

const DEFAULT_SERVICES: CatalogueService[] = [
  {
    id: 'machine', emoji: '🖥️', name: 'Signaler un problème machine',
    desc: 'Panne, lenteur, écran bleu, périphérique défaillant.',
    sla: '4 heures', slaSpeed: 'mid', iconColor: 'orange',
    categorie: 'Support technique', active: true, restricted: false, glpiCategoryId: 2, mode: 'chat' as ServiceMode,
  },
  {
    id: 'mdp', emoji: '🔑', name: 'Réinitialisation mot de passe',
    desc: 'Windows, messagerie ou application métier.',
    sla: '1 heure', slaSpeed: 'fast', iconColor: 'blue',
    categorie: 'Accès & Sécurité', active: true, restricted: false, glpiCategoryId: 8, mode: 'chat' as ServiceMode,
  },
  {
    id: 'mail', emoji: '✉️', name: 'Création de compte mail',
    desc: 'Nouvelle adresse @ism.sn pour un collaborateur.',
    sla: '4 heures', slaSpeed: 'mid', iconColor: 'green',
    categorie: 'Messagerie', active: true, restricted: false, glpiCategoryId: 12, mode: 'chat' as ServiceMode,
  },
  {
    id: 'delete', emoji: '🗑️', name: 'Suppression de compte',
    desc: "Clôture des accès d'un collaborateur quittant ISM.",
    sla: '1 jour', slaSpeed: 'slow', iconColor: 'red',
    categorie: 'Accès & Sécurité', active: true, restricted: true, restrictedTo: 'RH', glpiCategoryId: 10, mode: 'chat' as ServiceMode,
  },
]

export const useCatalogueStore = create<CatalogueState>((set, get) => ({
  services: DEFAULT_SERVICES,
  loaded: false,

  loadServices: async () => {
    try {
      const data = await fetchServices()
      if (data.length > 0) {
        set({ services: data as CatalogueService[], loaded: true })
      } else {
        // Seed defaults into DB if empty
        for (const svc of DEFAULT_SERVICES) {
          apiCreate(svc as any).catch(() => {})
        }
        set({ loaded: true })
      }
    } catch {
      set({ loaded: true })
    }
  },

  addService: (svc) => {
    set((s) => ({ services: [...s.services, svc] }))
    apiCreate(svc as any).catch((e) => console.error('Failed to save service:', e))
  },

  updateService: (id, patch) => {
    set((s) => ({
      services: s.services.map((svc) => (svc.id === id ? { ...svc, ...patch } : svc)),
    }))
    const updated = get().services.find((s) => s.id === id)
    if (updated) apiUpdate(id, updated as any).catch((e) => console.error('Failed to update service:', e))
  },

  removeService: (id) => {
    set((s) => ({ services: s.services.filter((svc) => svc.id !== id) }))
    apiDelete(id).catch((e) => console.error('Failed to delete service:', e))
  },

  toggleActive: (id) => {
    const svc = get().services.find((s) => s.id === id)
    if (svc) {
      const toggled = { ...svc, active: !svc.active }
      set((s) => ({
        services: s.services.map((sv) => (sv.id === id ? toggled : sv)),
      }))
      apiUpdate(id, toggled as any).catch((e) => console.error('Failed to toggle service:', e))
    }
  },
}))
