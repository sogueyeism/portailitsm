import { useCatalogueStore, type CatalogueService } from '../store/catalogueStore'

export interface DetectedIntent {
  service: CatalogueService
  subType?: string
  confidence: number // 0-1
  keywords: string[]
}

// Keyword rules per service ID — extensible
const SERVICE_KEYWORDS: Record<string, { keywords: string[][]; subTypes?: Record<string, string[]> }> = {
  machine: {
    keywords: [
      ['ecran', 'affichage', 'moniteur', 'display'],
      ['pc', 'ordinateur', 'poste', 'machine', 'laptop', 'portable'],
      ['lent', 'lenteur', 'rame', 'freeze', 'bloque'],
      ['demarre', 'allume', 'boot', 'demarrage'],
      ['bleu', 'bsod', 'blue screen'],
      ['clavier', 'souris', 'peripherique', 'usb', 'casque', 'webcam'],
      ['panne', 'casse', 'marche pas', 'fonctionne pas', 'defaillant', 'hs'],
      ['clignote', 'scintille', 'noir', 'eteint'],
      ['imprimante', 'impression', 'imprimer'],
      ['batterie', 'charge', 'chargeur'],
    ],
    subTypes: {
      'Ecran noir': ['noir', 'eteint', 'demarre pas', 'allume pas'],
      'Ecran bleu (BSOD)': ['bleu', 'bsod', 'blue screen'],
      'Clignotement': ['clignote', 'scintille', 'clignotement'],
      'Affichage flou': ['flou', 'resolution', 'pixelise'],
      'Lenteur excessive': ['lent', 'lenteur', 'rame', 'freeze', 'long'],
      'Peripherique defaillant': ['clavier', 'souris', 'peripherique', 'usb', 'casque', 'webcam', 'imprimante'],
      'Probleme batterie': ['batterie', 'charge', 'chargeur', 'autonomie'],
    },
  },
  mdp: {
    keywords: [
      ['mot de passe', 'password', 'mdp'],
      ['oublie', 'perdu', 'expire', 'reset', 'reinitialiser', 'reinitialisation'],
      ['connecter', 'connexion', 'login', 'acces', 'session'],
      ['bloque', 'verrouille', 'lock'],
    ],
    subTypes: {
      'Windows / Active Directory': ['windows', 'session', 'pc', 'ordinateur', 'ad', 'active directory', 'poste'],
      'Messagerie / Outlook': ['mail', 'outlook', 'messagerie', 'email', 'courriel'],
      'Application metier': ['application', 'logiciel', 'app', 'erp', 'sap', 'sage'],
    },
  },
  mail: {
    keywords: [
      ['mail', 'email', 'courriel', 'adresse mail', 'boite mail'],
      ['creer', 'creation', 'nouveau', 'nouvelle'],
      ['compte', 'adresse'],
      ['@ism', '@groupeism'],
    ],
  },
  delete: {
    keywords: [
      ['supprimer', 'suppression', 'desactiver', 'fermer', 'cloturer'],
      ['compte', 'acces', 'profil'],
      ['depart', 'quitte', 'demission', 'fin de contrat', 'licenciement'],
    ],
  },
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/['']/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function detectIntent(userMessage: string): DetectedIntent | null {
  const services = useCatalogueStore.getState().services.filter((s) => s.active)
  const normalized = normalize(userMessage)
  const words = normalized.split(' ')

  let bestMatch: DetectedIntent | null = null
  let bestScore = 0

  for (const service of services) {
    const rules = SERVICE_KEYWORDS[service.id]
    if (!rules) continue

    // Count keyword group matches
    let matchedGroups = 0
    const matchedKeywords: string[] = []

    for (const group of rules.keywords) {
      for (const kw of group) {
        if (normalized.includes(normalize(kw))) {
          matchedGroups++
          matchedKeywords.push(kw)
          break // One match per group is enough
        }
      }
    }

    if (matchedGroups === 0) continue

    // Score: ratio of matched groups to total groups, with minimum threshold
    const score = matchedGroups / rules.keywords.length
    const confidence = Math.min(score * 2, 1) // Scale up, cap at 1

    if (confidence > bestScore && confidence >= 0.15) {
      // Detect sub-type
      let subType: string | undefined
      if (rules.subTypes) {
        for (const [name, keywords] of Object.entries(rules.subTypes)) {
          for (const kw of keywords) {
            if (normalized.includes(normalize(kw))) {
              subType = name
              break
            }
          }
          if (subType) break
        }
      }

      bestScore = confidence
      bestMatch = { service, subType, confidence, keywords: matchedKeywords }
    }
  }

  return bestMatch
}

/**
 * Get the quick reply options for a detected service.
 */
export function getQuickReplies(serviceId: string): { label: string; value: string }[] {
  const rules = SERVICE_KEYWORDS[serviceId]
  if (!rules?.subTypes) return []
  return Object.keys(rules.subTypes).map((name) => ({ label: name, value: name }))
}

/**
 * Get the form fields for a service (from catalogue or defaults).
 */
export function getServiceFormFields(service: CatalogueService) {
  if (service.formFields && service.formFields.length > 0) {
    return service.formFields
  }

  // Default fields based on service ID
  const defaults: Record<string, any[]> = {
    machine: [
      { id: 'location', label: 'Localisation', type: 'text', placeholder: 'Bureau, salle, batiment...', required: true },
      { id: 'urgency', label: 'Urgence', type: 'radio', required: true, options: ['Faible', 'Normal', 'Elevee', 'Urgente'] },
      { id: 'screenshot', label: 'Capture d\'ecran', type: 'file', required: false, accept: 'image/*', maxFiles: 3 },
      { id: 'details', label: 'Details supplementaires', type: 'textarea', placeholder: 'Decrivez le probleme...', required: false },
    ],
    mdp: [
      { id: 'username', label: 'Identifiant ou email du compte', type: 'text', placeholder: 'prenom.nom ou email...', required: true },
      { id: 'since', label: 'Depuis quand ?', type: 'text', placeholder: 'Ce matin, hier...', required: false },
      { id: 'urgency', label: 'Urgence', type: 'radio', required: true, options: ['Faible', 'Normal', 'Elevee', 'Urgente'] },
    ],
    mail: [
      { id: 'beneficiary', label: 'Prenom et nom du beneficiaire', type: 'text', required: true },
      { id: 'department', label: 'Departement / service', type: 'text', required: true },
      { id: 'startDate', label: 'Date d\'arrivee', type: 'date', required: false },
      { id: 'urgency', label: 'Urgence', type: 'radio', required: true, options: ['Faible', 'Normal', 'Elevee', 'Urgente'] },
    ],
  }

  return defaults[service.id] || [
    { id: 'description', label: 'Description', type: 'textarea', placeholder: 'Decrivez votre besoin...', required: true },
    { id: 'location', label: 'Localisation', type: 'text', required: false },
    { id: 'urgency', label: 'Urgence', type: 'radio', required: true, options: ['Faible', 'Normal', 'Elevee', 'Urgente'] },
  ]
}
