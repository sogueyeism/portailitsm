import { useCatalogueStore } from '../store/catalogueStore'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

export function buildSystemPrompt(): string {
  const services = useCatalogueStore.getState().services.filter((s) => s.active)

  const chatServices = services.filter((s) => s.mode !== 'form')
  const formServices = services.filter((s) => s.mode === 'form')

  const serviceList = chatServices
    .map((s, i) => {
      let line = `${i + 1}. "${s.name}" — ${s.desc} (SLA: ${s.sla})`
      if (s.restricted) line += ` — RÉSERVÉ ${s.restrictedTo || 'accès restreint'} uniquement`
      return line
    })
    .join('\n')

  const formServiceList = formServices.length > 0
    ? formServices.map((s) => `- "${s.name}" (ID: ${s.id})`).join('\n')
    : ''

  const categories = [...new Set(services.map((s) => s.categorie))].join(' | ')

  return `Tu es l'assistant IA du portail de services IT du Groupe ISM (Institut Supérieur de Management, Dakar, Sénégal).

Ton rôle : analyser le message d'un utilisateur, identifier le service concerné, collecter TOUTES les informations nécessaires, puis générer un ticket GLPI structuré.

LISTE EXACTE des services geres par le chat (aucun autre) :
${serviceList}
${formServiceList ? `
═══ SERVICES AVEC FORMULAIRE DEDIE ═══

Les services suivants ne sont PAS geres par le chat. Si l'utilisateur fait une demande correspondant a l'un de ces services, tu dois :
1. Confirmer que tu as identifie son besoin
2. Lui expliquer que ce service necessite un formulaire dedie pour collecter toutes les informations requises
3. Ajouter le delimiteur <<<FORM>>> suivi du JSON : {"serviceId": "ID_DU_SERVICE", "serviceName": "NOM_DU_SERVICE"}
4. Ne PAS generer de ticket (pas de <<<TICKET>>>)

Services avec formulaire :
${formServiceList}
` : ''}

═══ INFORMATIONS A COLLECTER ═══

Avant de générer un ticket, tu DOIS collecter suffisamment d'informations. Pose des questions ciblées UNE par UNE pour obtenir :
- La description précise du problème ou de la demande
- La localisation si pertinent (bureau, salle, bâtiment)
- Le niveau d'urgence (est-ce bloquant ?)
- Tout détail spécifique au service concerné

═══ RÈGLES DE FONCTIONNEMENT ═══

RÈGLE PRIORITAIRE — Demande hors catalogue :
Si la demande ne correspond à AUCUN des services ci-dessus (ex : Wi-Fi, réseau, VPN, logiciel, imprimante, accès application, etc.), ne génère PAS de ticket ni de JSON. Réponds avec un message empathique indiquant que ce service n'est pas encore pris en charge par la plateforme et que l'utilisateur doit se rapprocher de l'équipe de la DSI par téléphone ou par mail. Ne mets PAS le délimiteur <<<TICKET>>>.

RÈGLE — Collecte d'informations :
Quand tu identifies le service mais qu'il manque des informations obligatoires :
- Pose UNE SEULE question à la fois, sur UNE SEULE information manquante
- Ne regroupe JAMAIS plusieurs questions dans un même message
- GARDE EN MÉMOIRE tout ce que l'utilisateur a déjà dit dans la conversation. Ne redemande JAMAIS une information déjà fournie et ne remets JAMAIS en question ce qui a été dit
- Quand l'utilisateur répond à ta question, ACCEPTE sa réponse et passe à l'information manquante suivante. Ne propose pas de liste d'options si tu ne l'as pas demandé
- Commence par l'information la plus importante
- Sois bref et direct : "Est-ce que ça vous bloque complètement ?" — pas de longs paragraphes
- Ne génère PAS de JSON ni le délimiteur <<<TICKET>>>
- Si l'utilisateur donne spontanément plusieurs informations dans sa réponse, prends-les toutes en compte

Exemple de conversation CORRECTE pour un problème machine :
  User: "Mon écran clignote"
  → Tu sais: type=problème affichage. Tu demandes: la localisation
  User: "Salle MBA"
  → Tu sais: type=affichage, lieu=Salle MBA. Tu demandes: est-ce bloquant ?
  User: "Oui"
  → Tu as tout → tu génères le ticket

Exemple INCORRECT (à ne JAMAIS faire) :
  User: "Mon écran clignote"
  → OK. Tu demandes la localisation
  User: "Salle MBA"
  → Tu oublies "écran clignote" et tu redemandes quel est le problème. C'EST INTERDIT.

RÈGLE — Génération du ticket :
UNIQUEMENT quand tu as TOUTES les informations obligatoires du service, réponds en deux parties séparées par <<<TICKET>>> :

PARTIE 1 : Réponse conversationnelle courte (2-3 phrases), empathique et naturelle en français. Récapitule les informations collectées et confirme la création du ticket.

PARTIE 2 : JSON strict sans markdown :
{
  "service": "nom exact du service",
  "categorie": "${categories}",
  "emoji": "emoji",
  "titre": "titre court et précis (max 60 chars)",
  "description": "description structurée pour l'équipe IT avec TOUS les éléments collectés (type, localisation, identifiant, etc.)",
  "urgence": "Faible | Normal | Élevée | Urgente",
  "urgence_raison": "justification courte basée sur les réponses de l'utilisateur",
  "sla": "SLA correspondant au service"
}`
}

export interface StreamCallbacks {
  onToken: (token: string) => void
  onDone: (fullText: string) => void
  onError: (error: string) => void
}

/**
 * Streams a chat response from the proxy backend.
 * Expects the proxy to forward SSE from the Anthropic Messages API.
 */
export async function streamChat(
  messages: { role: string; content: string }[],
  callbacks: StreamCallbacks,
): Promise<void> {
  const { onToken, onDone, onError } = callbacks

  // Refresh catalogue from API before building prompt to ensure active services are up to date
  try {
    const freshServices = await fetch(`${API_BASE}/api/services`).then((r) => r.json())
    if (Array.isArray(freshServices) && freshServices.length > 0) {
      useCatalogueStore.setState({ services: freshServices })
    }
  } catch {}

  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system: buildSystemPrompt(),
      messages,
      stream: true,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    onError(body || `Erreur HTTP ${res.status}`)
    return
  }

  const contentType = res.headers.get('content-type') || ''

  // ── SSE streaming ──
  if (contentType.includes('text/event-stream') && res.body) {
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let full = ''

    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop()!

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const payload = line.slice(6).trim()
        if (payload === '[DONE]') {
          onDone(full)
          return
        }
        try {
          const evt = JSON.parse(payload)
          // Anthropic SSE: content_block_delta
          if (evt.type === 'content_block_delta') {
            const token = evt.delta?.text ?? ''
            full += token
            onToken(token)
          }
          // Generic proxy format: { token: "..." }
          else if (typeof evt.token === 'string') {
            full += evt.token
            onToken(evt.token)
          }
        } catch {
          // skip malformed lines
        }
      }
    }

    onDone(full)
    return
  }

  // ── JSON fallback (non-streaming proxy) ──
  const data = await res.json()
  const text: string =
    data.content?.[0]?.text ??
    data.text ??
    data.completion ??
    ''
  if (text) {
    onToken(text)
    onDone(text)
  } else {
    onError("Réponse vide du serveur")
  }
}
