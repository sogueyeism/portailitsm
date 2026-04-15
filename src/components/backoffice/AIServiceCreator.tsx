import { useState, useRef, useEffect } from 'react'
import type { CatalogueService } from '../../store/catalogueStore'
import { listGlpiCategories, type GlpiCategory } from '../../services/glpi'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

/** Simple markdown-like rendering: **bold**, - lists, line breaks */
function renderMarkdown(text: string) {
  const lines = text.split('\n')
  return lines.map((line, i) => {
    // Bold
    const parts = line.split(/\*\*(.+?)\*\*/g)
    const rendered = parts.map((part, j) =>
      j % 2 === 1 ? <strong key={j}>{part}</strong> : part
    )
    // List items
    if (line.trimStart().startsWith('- ')) {
      return <div key={i} style={{ paddingLeft: 12, position: 'relative' }}><span style={{ position: 'absolute', left: 0 }}>-</span>{rendered.map((r, _j) => typeof r === 'string' ? r.replace(/^-\s*/, '') : r)}</div>
    }
    return <div key={i}>{rendered}</div>
  })
}

interface Props {
  onClose: () => void
  onCreate: (svc: CatalogueService) => void
  existingServices: CatalogueService[]
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SYSTEM_PROMPT = `Tu es l'assistant IA de configuration du Portail IT du Groupe ISM. Tu aides l'equipe DSI a creer un nouveau service dans le catalogue.

Ton objectif : collecter les informations necessaires pour configurer un service complet, en posant UNE question a la fois.

═══ ETAPE 1 — Informations generales (collecter dans cet ordre) :
1. Le NOM du service (ex: "Installation de logiciel", "Demande de VPN")
2. La DESCRIPTION courte pour les utilisateurs (1-2 phrases)
3. La CATEGORIE (ex: Support technique, Accès & Sécurité, Messagerie, Reseau, ou une nouvelle)
4. Le SLA — delai de traitement (ex: 1 heure, 4 heures, 1 jour, 2 jours)
5. L'acces est-il RESTREINT a certains profils ? (ex: RH uniquement, Direction)
6. Un EMOJI representatif du service
7. Le MODE de traitement : "chat" (l'IA collecte les infos via conversation) ou "form" (l'utilisateur remplit un formulaire dédié)

═══ ETAPE 2 — Definition du formulaire :
Quelle que soit le mode choisi, tu dois définir les champs du formulaire. Ces champs servent :
- En mode "form" : ce sont les champs affiches dans le formulaire
- En mode "chat" : ce sont les informations que l'IA devra collecter

TYPES DE CHAMPS DISPONIBLES (tous supportes) :
- text : texte court (1 ligne)
- textarea : texte long (plusieurs lignes)
- select : liste déroulante a choix unique
- multiselect : selection multiple (l'utilisateur peut choisir plusieurs options)
- checkbox : case a cocher oui/non
- checkboxgroup : groupe de cases a cocher (choix multiples)
- radio : boutons radio (choix unique)
- date : selecteur de date
- datetime : date + heure
- time : heure seule
- email : adresse email (avec validation)
- phone : numero de telephone
- number : valeur numerique (avec min/max optionnels)
- file : fichier a joindre (images, PDF, documents — configurable avec "accept" et "maxFiles")
- section : separateur de section (titre visuel, pas un champ de saisie)

Pour CHAQUE champ, demande :
- Le libelle (ex: "Localisation", "Plan de salle", "Date souhaitee")
- Le type parmi la liste ci-dessus
- Pour select/multiselect/checkboxgroup/radio : les options
- Pour file : les types de fichiers acceptes (ex: "image/*", ".pdf", "image/*,.pdf,.doc") et le nombre max
- Pour number : min/max si pertinent
- S'il est obligatoire ou optionnel
- Un texte d'aide optionnel (helpText)

Propose les champs un par un. Propose des suggestions pertinentes. Apres chaque champ valide, demande "Souhaitez-vous ajouter un autre champ ?"
Quand l'utilisateur dit non ou que c'est suffisant, passe a la generation.

ATTENTION : inclus TOUJOURS un champ "Description" (textarea, obligatoire) et un champ "Urgence" (select avec Faible/Normal/Elevee/Urgente, obligatoire) par defaut. Si l'utilisateur a joint un document ou image au debut de la conversation, utilise-le pour mieux comprendre le contexte du service et proposer des champs pertinents.

═══ REGLES :
- Pose UNE SEULE question a la fois
- Sois bref et direct
- Propose des suggestions pertinentes basees sur le type de service
- IMPORTANT : Quand l'utilisateur confirme (dit "oui", "c'est bon", "je valide", "ok", etc.) et que tu as TOUTES les informations, tu DOIS générér immediatement le recapitulatif ET le JSON dans le MEME message. Ne fais JAMAIS un message de recapitulatif sans le JSON.
- Le delimiteur <<<SERVICE>>> et le JSON doivent etre dans la MEME reponse que le recapitulatif, pas dans un message separe.
- Format de la reponse finale :

{
  "name": "nom du service",
  "desc": "description courte",
  "categorie": "categorie",
  "sla": "delai",
  "slaSpeed": "fast|mid|slow",
  "emoji": "emoji",
  "iconColor": "orange|blue|green|red",
  "restricted": true/false,
  "restrictedTo": "",
  "mode": "chat|form",
  "formFields": [
    { "id": "identifiant_unique", "label": "Libelle", "type": "TYPE", "placeholder": "texte indicatif", "required": true/false, "options": ["opt1", "opt2"], "accept": "image/*,.pdf", "maxFiles": 3, "helpText": "aide", "min": 0, "max": 100 }
  ]
}

Regles pour formFields :
- "options" uniquement pour select, multiselect, checkboxgroup, radio
- "accept" et "maxFiles" uniquement pour file
- "min"/"max" uniquement pour number
- "helpText" est toujours optionnel
- "placeholder" est optionnel

Commence par demander quel type de service la DSI souhaite ajouter.`

export default function AIServiceCreator({ onClose, onCreate, existingServices }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [generatedService, setGeneratedService] = useState<CatalogueService | null>(null)
  const [glpiCategories, setGlpiCategories] = useState<GlpiCategory[]>([])
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const docRef = useRef<HTMLInputElement>(null)
  const historyRef = useRef<Message[]>([])

  // Load GLPI categories for context
  useEffect(() => {
    listGlpiCategories().then(setGlpiCategories).catch(() => {})
  }, [])

  // Auto-start conversation with an initial user message (guard against StrictMode double-run)
  const startedRef = useRef(false)
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    const initMsg: Message = { role: 'user', content: 'Je souhaite creer un nouveau service dans le catalogue du portail IT.' }
    sendToAI([initMsg])
  }, [])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!loading) inputRef.current?.focus()
  }, [loading])

  async function sendToAI(history: Message[]) {
    setLoading(true)
    try {
      const contextPrompt = SYSTEM_PROMPT +
        `\n\nServices existants : ${existingServices.map((s) => s.name).join(', ')}` +
        `\n\nCatégories GLPI existantes : ${glpiCategories.map((c) => `${c.name} (ID ${c.id})`).join(', ')}`

      // Retry up to 2 times on overload (529)
      let data: any = null
      for (let attempt = 0; attempt < 3; attempt++) {
        const res = await fetch(`${API_BASE}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system: contextPrompt,
            messages: history.map((m) => ({ role: m.role, content: m.content })),
            stream: false,
            max_tokens: 4096,
          }),
        })
        if (res.ok) {
          data = await res.json()
          break
        }
        if (res.status === 529 && attempt < 2) {
          await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)))
          continue
        }
        throw new Error(`Erreur API (${res.status})`)
      }

      const fullText = data?.content?.[0]?.text || data?.text || ''
      if (!fullText) {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'Reponse vide du serveur. Réessayez.' }])
        setLoading(false)
        return
      }

      // Parse <<<SERVICE>>> delimiter
      const parts = fullText.split('<<<SERVICE>>>')
      const conversational = parts[0].trim()

      const aiMsg: Message = { role: 'assistant', content: conversational }
      setMessages((prev) => [...prev, aiMsg])
      historyRef.current = [...history, aiMsg]

      // If service JSON was generated
      if (parts[1]) {
        try {
          const cleaned = parts[1].trim().replace(/```json|```/g, '').trim()
          const parsed = JSON.parse(cleaned)
          setGeneratedService({
            id: `svc-${Date.now()}`,
            emoji: parsed.emoji || '📋',
            name: parsed.name,
            desc: parsed.desc,
            sla: parsed.sla,
            slaSpeed: parsed.slaSpeed || 'mid',
            iconColor: parsed.iconColor || 'orange',
            categorie: parsed.categorie,
            active: true,
            restricted: !!parsed.restricted,
            restrictedTo: parsed.restrictedTo || '',
            mode: parsed.mode || 'chat',
            formFields: parsed.formFields || [],
          })
        } catch {}
      }
    } catch (e) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Le service IA est temporairement indisponible. Veuillez reessayer dans quelques secondes.' }])
    }
    setLoading(false)
  }

  const handleSend = async () => {
    const text = input.trim()
    if ((!text && !pendingFile) || loading) return
    setInput('')

    let msgText = text
    const fileName = pendingFile?.name

    // If file attached, upload and add reference to message
    if (pendingFile) {
      setLoading(true)
      const form = new FormData()
      form.append('image', pendingFile)
      try {
        const res = await fetch(`${API_BASE}/api/upload`, { method: 'POST', body: form })
        const data = await res.json()
        if (data.success) {
          msgText = `${text ? text + '\n' : ''}[Document joint: ${fileName} — ${API_BASE}${data.url}]`
        } else {
          msgText = `${text ? text + '\n' : ''}[Document joint: ${fileName} (upload echoue: ${data.error})]`
        }
      } catch (e) {
        msgText = `${text ? text + '\n' : ''}[Document joint: ${fileName} (upload echoue)]`
      }
      setPendingFile(null)
      setLoading(false)
    }

    // Ensure message is never empty
    if (!msgText.trim()) msgText = `[Document joint: ${fileName || 'fichier'}]`

    const userMsg: Message = { role: 'user', content: msgText }
    setMessages((prev) => [...prev, userMsg])
    const newHistory = [...historyRef.current, userMsg]
    historyRef.current = newHistory
    sendToAI(newHistory)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center"
      style={{ background: 'rgba(42,20,0,.52)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="flex w-[580px] flex-col rounded-2xl"
        style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-lg)', maxHeight: '85vh' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg text-sm" style={{ background: 'var(--ai-lt)', color: 'var(--ai)' }}>
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
              <path d="M10 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16z" />
              <path d="M10 6v4l3 2" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-[15px] font-bold" style={{ color: 'var(--text-1)' }}>Assistant creation de service</h3>
            <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>L'IA vous guide pour configurer un nouveau service</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border-none"
            style={{ background: 'var(--bg)', color: 'var(--text-3)' }}
          >
            <svg viewBox="0 0 14 14" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <line x1="2" y1="2" x2="12" y2="12" /><line x1="12" y1="2" x2="2" y2="12" />
            </svg>
          </button>
        </div>

        {/* Messages + Preview (scrollable together) */}
        <div ref={listRef} className="flex-1 overflow-y-auto px-5 py-4" style={{ minHeight: 200 }}>
          <div className="flex flex-col gap-3">
            {messages.filter((m) => m.content.trim()).map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                  style={msg.role === 'assistant'
                    ? { background: 'var(--ai)', color: '#fff' }
                    : { background: 'var(--accent)', color: '#fff' }
                  }
                >
                  {msg.role === 'assistant' ? 'IA' : 'DSI'}
                </div>
                <div
                  className="max-w-[80%] rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed"
                  style={msg.role === 'assistant'
                    ? { background: 'var(--ai-lt)', color: 'var(--text-1)', border: '1px solid rgba(74,29,150,.1)' }
                    : { background: 'var(--brown-800)', color: '#fff' }
                  }
                >
                  {renderMarkdown(msg.content)}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold" style={{ background: 'var(--ai)', color: '#fff' }}>IA</div>
                <div className="rounded-xl px-3.5 py-2.5" style={{ background: 'var(--ai-lt)', border: '1px solid rgba(74,29,150,.1)' }}>
                  <div className="typing-indicator"><span /><span /><span /></div>
                </div>
              </div>
            )}
          </div>

          {/* Generated service preview (inside scroll area) */}
          {generatedService && (
            <div className="mt-4 overflow-hidden rounded-xl border" style={{ borderColor: 'var(--ai-md)' }}>
              <div className="flex items-center gap-3 px-4 py-3" style={{ background: 'var(--ai)', color: '#fff' }}>
                <span className="text-lg">{generatedService.emoji}</span>
                <div>
                  <div className="text-[13px] font-bold">{generatedService.name}</div>
                  <div className="text-[10px]" style={{ color: 'rgba(255,255,255,.6)' }}>Service généré par l'IA</div>
                </div>
              </div>
              <div className="flex flex-col gap-2.5 px-4 py-3" style={{ background: 'var(--ai-lt)' }}>
                <PreviewRow label="Description" value={generatedService.desc} />
                <PreviewRow label="Catégorie" value={generatedService.categorie} />
                <PreviewRow label="SLA" value={generatedService.sla || 'Non défini'} />
                <PreviewRow label="Acces" value={generatedService.restricted ? `Reserve ${generatedService.restrictedTo}` : 'Ouvert a tous'} />
                <PreviewRow label="Mode" value={generatedService.mode === 'form' ? 'Formulaire dédié' : 'Chat IA'} />
                {generatedService.formFields && generatedService.formFields.length > 0 && (
                  <div>
                    <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--ai)' }}>
                      Champs du formulaire
                    </div>
                    <div className="flex flex-col gap-1">
                      {generatedService.formFields.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11.5px]" style={{ background: 'rgba(74,29,150,.05)' }}>
                          <span className="font-bold" style={{ color: 'var(--text-1)' }}>{f.label}</span>
                          <span className="rounded px-1.5 py-[1px] text-[9px] font-bold" style={{ background: 'var(--bg)', color: 'var(--text-3)' }}>{f.type}</span>
                          {f.required && <span className="text-[9px] font-bold" style={{ color: 'var(--danger)' }}>requis</span>}
                          {f.options && <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>({f.options.join(', ')})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action buttons (fixed at bottom, outside scroll) */}
        {generatedService && (
          <div className="flex gap-2 border-t px-5 py-3" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={() => { onCreate(generatedService); onClose() }}
              className="flex-1 cursor-pointer rounded-lg border-none py-2.5 text-[13px] font-bold text-white"
              style={{ background: 'var(--success)' }}
            >
              Créer le service
            </button>
            <button
              onClick={() => {
                setGeneratedService(null)
                const msg: Message = { role: 'user', content: 'Je voudrais modifier quelques éléments.' }
                setMessages((prev) => [...prev, msg])
                const newHistory = [...historyRef.current, msg]
                historyRef.current = newHistory
                sendToAI(newHistory)
              }}
              className="flex-1 cursor-pointer rounded-lg border py-2.5 text-[13px] font-bold"
              style={{ borderColor: 'var(--border)', background: 'transparent', color: 'var(--text-2)' }}
            >
              Modifier
            </button>
          </div>
        )}

        {/* Input */}
        {!generatedService && (
          <div className="border-t px-5 py-3" style={{ borderColor: 'var(--border)' }}>
            {/* Attached file preview */}
            {pendingFile && (
              <div className="mb-2 flex items-center gap-2 rounded-lg border px-3 py-2" style={{ borderColor: 'var(--ai-md)', background: 'var(--ai-lt)' }}>
                <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0" fill="none" stroke="var(--ai)" strokeWidth={1.5}><rect x="2" y="1" width="12" height="14" rx="2" /><line x1="5" y1="6" x2="11" y2="6" /><line x1="5" y1="9" x2="9" y2="9" /></svg>
                <span className="flex-1 truncate text-[12px] font-medium" style={{ color: 'var(--ai)' }}>{pendingFile.name}</span>
                <button onClick={() => setPendingFile(null)} className="flex h-5 w-5 cursor-pointer items-center justify-center rounded border-none" style={{ background: 'rgba(74,29,150,.1)', color: 'var(--ai)' }}>
                  <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="1" y1="1" x2="9" y2="9" /><line x1="9" y1="1" x2="1" y2="9" /></svg>
                </button>
              </div>
            )}
            <div className="flex gap-2">
              {/* File upload button */}
              <input ref={docRef} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setPendingFile(e.target.files[0]); e.target.value = '' }} />
              <button
                onClick={() => docRef.current?.click()}
                disabled={loading}
                className="flex h-[40px] w-[40px] shrink-0 cursor-pointer items-center justify-center rounded-lg border transition-colors disabled:opacity-40"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text-3)' }}
                title="Joindre un document de reference"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6z" /><polyline points="14,2 14,6 16,6" /><line x1="8" y1="10" x2="12" y2="10" /><line x1="8" y1="13" x2="12" y2="13" />
                </svg>
              </button>
              <textarea
                ref={inputRef}
                className="flex-1 resize-none rounded-lg border px-3 py-2.5 text-[13px]"
                style={{ borderColor: 'var(--border)', fontFamily: 'inherit', minHeight: 40, maxHeight: 80 }}
                placeholder="Décrivez le service a creer..."
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={loading || (!input.trim() && !pendingFile)}
                className="flex h-[40px] w-[40px] shrink-0 cursor-pointer items-center justify-center rounded-lg border-none text-white disabled:opacity-40"
                style={{ background: 'var(--ai)' }}
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="10" x2="17" y2="10" /><polyline points="11,4 17,10 11,16" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-[85px] shrink-0 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--ai)', marginTop: 2 }}>
        {label}
      </span>
      <span className="text-[12.5px]" style={{ color: 'var(--text-1)' }}>{value}</span>
    </div>
  )
}
