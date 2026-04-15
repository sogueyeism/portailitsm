import { useState } from 'react'
import { useCatalogueStore, type CatalogueService } from '../../store/catalogueStore'
import { showToast } from '../../components/ui/Toast'
import { createGlpiCategory, listGlpiCategories, type GlpiCategory } from '../../services/glpi'
import AIServiceCreator from '../../components/backoffice/AIServiceCreator'

const ICON_COLORS: CatalogueService['iconColor'][] = ['orange', 'blue', 'green', 'red']
const SLA_SPEEDS: { value: CatalogueService['slaSpeed']; label: string }[] = [
  { value: 'fast', label: 'Rapide (1h)' },
  { value: 'mid', label: 'Moyen (4h)' },
  { value: 'slow', label: 'Long (1j+)' },
]

function newEmptyService(): CatalogueService {
  return {
    id: `svc-${Date.now()}`,
    emoji: '📋',
    name: '',
    desc: '',
    sla: '4 heures',
    slaSpeed: 'mid',
    iconColor: 'orange',
    categorie: '',
    active: true,
    restricted: false,
    restrictedTo: '',
    mode: 'chat',
  }
}

export default function CataloguePage() {
  const { services, addService, updateService, removeService, toggleActive } = useCatalogueStore()
  const [editing, setEditing] = useState<CatalogueService | null>(null)
  const [creating, setCreating] = useState(false)
  const [aiCreating, setAiCreating] = useState(false)
  const [deleting, setDeleting] = useState<CatalogueService | null>(null)
  const [importing, setImporting] = useState(false)
  const [glpiCategories, setGlpiCategories] = useState<GlpiCategory[]>([])
  const [loadingImport, setLoadingImport] = useState(false)

  const handleSave = (updated: CatalogueService) => {
    updateService(updated.id, updated)
    setEditing(null)
    showToast('success', `Service "${updated.name}" mis a jour`)
  }

  const handleCreate = async (svc: CatalogueService) => {
    // Create the GLPI category automatically
    try {
      const result = await createGlpiCategory(svc.name)
      svc.glpiCategoryId = result.glpiCategoryId
      showToast('success', `Service "${svc.name}" cree + categorie GLPI #${result.glpiCategoryId}`)
    } catch {
      showToast('info', `Service "${svc.name}" cree (categorie GLPI non creee — GLPI indisponible)`)
    }
    addService(svc)
    setCreating(false)
  }

  const handleOpenImport = async () => {
    setImporting(true)
    setLoadingImport(true)
    try {
      const cats = await listGlpiCategories()
      // Filter out categories already linked to a service
      const linkedIds = new Set(services.map((s) => s.glpiCategoryId).filter(Boolean))
      setGlpiCategories(cats.filter((c) => !linkedIds.has(c.id)))
    } catch {
      showToast('error', 'Impossible de charger les categories GLPI')
      setImporting(false)
    } finally {
      setLoadingImport(false)
    }
  }

  const handleImport = (cat: GlpiCategory) => {
    const svc: CatalogueService = {
      id: `svc-glpi-${cat.id}`,
      emoji: '📋',
      name: cat.name,
      desc: cat.completename,
      sla: '4 heures',
      slaSpeed: 'mid',
      iconColor: 'orange',
      categorie: cat.level > 1 ? cat.completename.split(' > ')[0] : cat.name,
      active: true,
      restricted: false,
      glpiCategoryId: cat.id,
      mode: 'chat',
    }
    addService(svc)
    setGlpiCategories((prev) => prev.filter((c) => c.id !== cat.id))
    showToast('success', `"${cat.name}" importe (GLPI #${cat.id})`)
  }

  const handleDelete = () => {
    if (!deleting) return
    removeService(deleting.id)
    showToast('info', `Service "${deleting.name}" supprime`)
    setDeleting(null)
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold" style={{ color: 'var(--text-1)' }}>
            Catalogue de services
          </h1>
          <p className="text-[13px]" style={{ color: 'var(--text-3)' }}>
            Gérez les services proposes aux utilisateurs du portail
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleOpenImport}
            className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-[13px] font-semibold transition-colors"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text-2)' }}
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 14v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" /><polyline points="7,10 10,13 13,10" /><line x1="10" y1="3" x2="10" y2="13" />
            </svg>
            Importer depuis GLPI
          </button>
          <button
            onClick={() => setAiCreating(true)}
            className="flex cursor-pointer items-center gap-2 rounded-lg border-none px-4 py-2.5 text-[13px] font-bold text-white transition-colors"
            style={{ background: 'var(--ai)' }}
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M10 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16z" /><path d="M10 6v4l3 2" />
            </svg>
            Créer avec l'IA
          </button>
          <button
            onClick={() => setCreating(true)}
            className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-[13px] font-semibold transition-colors"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text-2)' }}
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <line x1="10" y1="4" x2="10" y2="16" /><line x1="4" y1="10" x2="16" y2="10" />
            </svg>
            Manuel
          </button>
        </div>
      </div>

      {/* Services grid */}
      <div className="grid grid-cols-2 gap-4">
        {services.map((svc) => (
          <div
            key={svc.id}
            className="rounded-xl border p-5 transition-all"
            style={{
              background: 'var(--surface)',
              borderColor: svc.active ? 'var(--border)' : 'var(--danger)',
              opacity: svc.active ? 1 : 0.6,
            }}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-[20px]">{svc.emoji}</span>
                <span className="text-[14px] font-bold" style={{ color: 'var(--text-1)' }}>
                  {svc.name}
                </span>
              </div>
              <button
                onClick={() => toggleActive(svc.id)}
                className="relative h-6 w-11 cursor-pointer rounded-full border-none transition-colors"
                style={{ background: svc.active ? 'var(--success)' : '#ccc' }}
              >
                <div
                  className="absolute top-[2px] h-5 w-5 rounded-full bg-white shadow transition-all"
                  style={{ left: svc.active ? 22 : 2 }}
                />
              </button>
            </div>

            <p className="mb-3 text-[12.5px]" style={{ color: 'var(--text-2)' }}>{svc.desc}</p>

            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full px-2 py-[2px] text-[10.5px] font-bold" style={{ background: 'var(--accent-lt)', color: 'var(--accent)' }}>
                SLA : {svc.sla}
              </span>
              <span className="rounded-full px-2 py-[2px] text-[10.5px] font-bold" style={{ background: 'var(--info-lt)', color: 'var(--info)' }}>
                {svc.categorie}
              </span>
              {svc.restricted && (
                <span className="rounded-full px-2 py-[2px] text-[10.5px] font-bold" style={{ background: 'var(--danger-lt)', color: 'var(--danger)' }}>
                  Reserve {svc.restrictedTo}
                </span>
              )}
              {svc.glpiCategoryId && (
                <span className="rounded-full px-2 py-[2px] text-[10.5px] font-bold" style={{ background: 'var(--ai-lt)', color: 'var(--ai)' }}>
                  GLPI #{svc.glpiCategoryId}
                </span>
              )}
              <span
                className="rounded-full px-2 py-[2px] text-[10.5px] font-bold"
                style={svc.mode === 'form'
                  ? { background: 'var(--warn-lt)', color: 'var(--warn)' }
                  : { background: 'var(--success-lt)', color: 'var(--success)' }
                }
              >
                {svc.mode === 'form' ? 'Formulaire' : 'Chat IA'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditing(svc)}
                className="cursor-pointer rounded-lg border px-3 py-[6px] text-[12px] font-semibold transition-colors"
                style={{ borderColor: 'var(--border)', background: 'transparent', color: 'var(--text-2)' }}
              >
                Modifier
              </button>
              <button
                onClick={() => setDeleting(svc)}
                className="cursor-pointer rounded-lg border px-3 py-[6px] text-[12px] font-semibold transition-colors"
                style={{ borderColor: 'rgba(156,32,32,.2)', background: 'transparent', color: 'var(--danger)' }}
              >
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Import from GLPI modal */}
      {importing && (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center"
          style={{ background: 'rgba(42,20,0,.52)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setImporting(false) }}
        >
          <div className="w-[520px] rounded-xl" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-lg)', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-[16px] font-bold" style={{ color: 'var(--text-1)' }}>
                Importer depuis GLPI
              </h3>
              <button
                onClick={() => setImporting(false)}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border-none"
                style={{ background: 'var(--bg)', color: 'var(--text-3)' }}
              >
                <svg viewBox="0 0 14 14" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <line x1="2" y1="2" x2="12" y2="12" /><line x1="12" y1="2" x2="2" y2="12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loadingImport ? (
                <p className="py-8 text-center text-[13px]" style={{ color: 'var(--text-3)' }}>Chargement des categories GLPI...</p>
              ) : glpiCategories.length === 0 ? (
                <p className="py-8 text-center text-[13px]" style={{ color: 'var(--text-3)' }}>Toutes les categories GLPI sont déjà importees.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="mb-2 text-[12px]" style={{ color: 'var(--text-3)' }}>
                    Cliquez sur une categorie pour l'importer comme service du portail.
                  </p>
                  {glpiCategories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3 transition-colors"
                      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                      onClick={() => handleImport(cat)}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-lt)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)' }}
                    >
                      <div>
                        <div className="text-[13px] font-semibold" style={{ color: 'var(--text-1)' }}>
                          {cat.name}
                        </div>
                        {cat.level > 1 && (
                          <div className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                            {cat.completename}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded px-1.5 py-[1px] text-[10px] font-bold" style={{ background: 'var(--ai-lt)', color: 'var(--ai)' }}>
                          GLPI #{cat.id}
                        </span>
                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round">
                          <line x1="10" y1="4" x2="10" y2="16" /><line x1="4" y1="10" x2="16" y2="10" />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Service Creator */}
      {aiCreating && (
        <AIServiceCreator
          existingServices={services}
          onClose={() => setAiCreating(false)}
          onCreate={handleCreate}
        />
      )}

      {/* Edit modal */}
      {editing && (
        <ServiceModal
          title={`Modifier : ${editing.name}`}
          initial={editing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}

      {/* Create modal */}
      {creating && (
        <ServiceModal
          title="Ajouter un nouveau service"
          initial={newEmptyService()}
          onSave={handleCreate}
          onClose={() => setCreating(false)}
        />
      )}

      {/* Delete confirmation */}
      {deleting && (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center"
          style={{ background: 'rgba(42,20,0,.52)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setDeleting(null) }}
        >
          <div className="w-[380px] rounded-xl p-6 text-center" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-lg)' }}>
            <div className="mb-3 text-[28px]">{deleting.emoji}</div>
            <h3 className="mb-2 text-[15px] font-bold" style={{ color: 'var(--text-1)' }}>
              Supprimer ce service ?
            </h3>
            <p className="mb-5 text-[13px]" style={{ color: 'var(--text-2)' }}>
              Le service <strong>"{deleting.name}"</strong> sera retire du catalogue et ne sera plus accèssible aux utilisateurs ni a l'IA.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                className="flex-1 cursor-pointer rounded-lg border-none py-2.5 text-[13px] font-bold text-white"
                style={{ background: 'var(--danger)' }}
              >
                Supprimer
              </button>
              <button
                onClick={() => setDeleting(null)}
                className="flex-1 cursor-pointer rounded-lg border py-2.5 text-[13px] font-bold"
                style={{ borderColor: 'var(--border)', background: 'transparent', color: 'var(--text-2)' }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ServiceModal({
  title,
  initial,
  onSave,
  onClose,
}: {
  title: string
  initial: CatalogueService
  onSave: (s: CatalogueService) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState({ ...initial })
  const canSave = draft.name.trim() && draft.desc.trim() && draft.sla.trim() && draft.categorie.trim()

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center"
      style={{ background: 'rgba(42,20,0,.52)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-[520px] rounded-xl p-6" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-lg)', maxHeight: '85vh', overflowY: 'auto' }}>
        <h3 className="mb-5 text-[16px] font-bold" style={{ color: 'var(--text-1)' }}>
          {title}
        </h3>
        <div className="flex flex-col gap-4">
          {/* Emoji + Name */}
          <div className="flex gap-3">
            <Field label="Emoji">
              <input
                className="form-input w-[60px] text-center text-[20px]"
                value={draft.emoji}
                onChange={(e) => setDraft({ ...draft, emoji: e.target.value })}
                maxLength={4}
              />
            </Field>
            <div className="flex-1">
              <Field label="Nom du service">
                <input
                  className="form-input"
                  placeholder="Ex: Installation de logiciel"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </Field>
            </div>
          </div>

          <Field label="Description">
            <textarea
              className="form-input"
              rows={2}
              placeholder="Description courte du service pour les utilisateurs"
              value={draft.desc}
              onChange={(e) => setDraft({ ...draft, desc: e.target.value })}
              style={{ resize: 'vertical' }}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="SLA">
              <input
                className="form-input"
                placeholder="Ex: 4 heures, 1 jour..."
                value={draft.sla}
                onChange={(e) => setDraft({ ...draft, sla: e.target.value })}
              />
            </Field>
            <Field label="Vitesse SLA">
              <select
                className="form-input"
                value={draft.slaSpeed}
                onChange={(e) => setDraft({ ...draft, slaSpeed: e.target.value as CatalogueService['slaSpeed'] })}
              >
                {SLA_SPEEDS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Catégorie">
              <input
                className="form-input"
                placeholder="Ex: Support technique"
                value={draft.categorie}
                onChange={(e) => setDraft({ ...draft, categorie: e.target.value })}
              />
            </Field>
            <Field label="Couleur">
              <div className="flex gap-2 pt-1">
                {ICON_COLORS.map((c) => {
                  const bg = c === 'orange' ? 'var(--accent)' : c === 'blue' ? 'var(--info)' : c === 'green' ? 'var(--success)' : 'var(--danger)'
                  return (
                    <button
                      key={c}
                      onClick={() => setDraft({ ...draft, iconColor: c })}
                      className="h-8 w-8 cursor-pointer rounded-lg border-2 transition-transform"
                      style={{
                        background: bg,
                        borderColor: draft.iconColor === c ? 'var(--text-1)' : 'transparent',
                        transform: draft.iconColor === c ? 'scale(1.15)' : 'scale(1)',
                      }}
                    />
                  )
                })}
              </div>
            </Field>
          </div>

          {/* Mode: chat or form */}
          <Field label="Mode de traitement">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDraft({ ...draft, mode: 'chat' })}
                className="flex-1 cursor-pointer rounded-lg border px-3 py-2 text-[12px] font-semibold transition-colors"
                style={{
                  borderColor: draft.mode !== 'form' ? 'var(--success)' : 'var(--border)',
                  background: draft.mode !== 'form' ? 'var(--success-lt)' : 'transparent',
                  color: draft.mode !== 'form' ? 'var(--success)' : 'var(--text-3)',
                }}
              >
                Chat IA — l'IA collecte les infos
              </button>
              <button
                type="button"
                onClick={() => setDraft({ ...draft, mode: 'form' })}
                className="flex-1 cursor-pointer rounded-lg border px-3 py-2 text-[12px] font-semibold transition-colors"
                style={{
                  borderColor: draft.mode === 'form' ? 'var(--warn)' : 'var(--border)',
                  background: draft.mode === 'form' ? 'var(--warn-lt)' : 'transparent',
                  color: draft.mode === 'form' ? 'var(--warn)' : 'var(--text-3)',
                }}
              >
                Formulaire — redirige vers le formulaire
              </button>
            </div>
          </Field>

          <label className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--text-2)' }}>
            <input
              type="checkbox"
              checked={draft.restricted}
              onChange={(e) => setDraft({ ...draft, restricted: e.target.checked })}
            />
            Accès restreint
          </label>
          {draft.restricted && (
            <Field label="Reserve a">
              <input
                className="form-input"
                placeholder="Ex: RH, Direction..."
                value={draft.restrictedTo || ''}
                onChange={(e) => setDraft({ ...draft, restrictedTo: e.target.value })}
              />
            </Field>
          )}

          {/* Form fields editor */}
          <FormFieldsEditor
            fields={draft.formFields || []}
            onChange={(fields) => setDraft({ ...draft, formFields: fields })}
          />

          {/* Info box */}
          <div
            className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-[12px] leading-relaxed"
            style={{ background: 'var(--info-lt)', color: 'var(--info)' }}
          >
            <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <circle cx="10" cy="10" r="8" />
              <line x1="10" y1="9" x2="10" y2="14" />
              <circle cx="10" cy="6.5" r=".8" fill="currentColor" stroke="none" />
            </svg>
            {draft.mode === 'form'
              ? 'Les champs définis ci-dessus seront affiches dans le formulaire de demande.'
              : 'Les champs définis ci-dessus seront collectes par l\'IA dans le chat.'}
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={() => onSave(draft)}
            disabled={!canSave}
            className="flex-1 cursor-pointer rounded-lg border-none py-2.5 text-[13px] font-bold text-white disabled:opacity-50"
            style={{ background: 'var(--accent)' }}
          >
            {initial.name ? 'Enregistrer' : 'Créer le service'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 cursor-pointer rounded-lg border py-2.5 text-[13px] font-bold"
            style={{ borderColor: 'var(--border)', background: 'transparent', color: 'var(--text-2)' }}
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>{label}</label>
      {children}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// Visual Form Fields Editor
// ═══════════════════════════════════════════════════════════

import type { FormField, FormFieldType } from '../../store/catalogueStore'

const FIELD_TYPES: { value: FormFieldType; label: string; icon: string }[] = [
  { value: 'text', label: 'Texte court', icon: 'Aa' },
  { value: 'textarea', label: 'Texte long', icon: '...' },
  { value: 'select', label: 'Liste déroulante', icon: '▾' },
  { value: 'multiselect', label: 'Choix multiples', icon: '☑' },
  { value: 'radio', label: 'Boutons radio', icon: '◉' },
  { value: 'checkbox', label: 'Case a cocher', icon: '✓' },
  { value: 'checkboxgroup', label: 'Groupe de cases', icon: '☑☑' },
  { value: 'date', label: 'Date', icon: '📅' },
  { value: 'datetime', label: 'Date + heure', icon: '📅⏰' },
  { value: 'time', label: 'Heure', icon: '⏰' },
  { value: 'email', label: 'Email', icon: '@' },
  { value: 'phone', label: 'Téléphone', icon: '📞' },
  { value: 'number', label: 'Nombre', icon: '#' },
  { value: 'file', label: 'Fichier joint', icon: '📎' },
  { value: 'section', label: 'Séparateur', icon: '—' },
]

const NEEDS_OPTIONS: FormFieldType[] = ['select', 'multiselect', 'radio', 'checkboxgroup']

function newField(): FormField {
  return { id: `f-${Date.now()}`, label: '', type: 'text', required: false, placeholder: '' }
}

function FormFieldsEditor({ fields, onChange }: { fields: FormField[]; onChange: (f: FormField[]) => void }) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null)

  const addField = () => {
    onChange([...fields, newField()])
    setEditingIdx(fields.length)
  }

  const removeField = (idx: number) => {
    onChange(fields.filter((_, i) => i !== idx))
    if (editingIdx === idx) setEditingIdx(null)
  }

  const updateField = (idx: number, patch: Partial<FormField>) => {
    onChange(fields.map((f, i) => (i === idx ? { ...f, ...patch } : f)))
  }

  const moveField = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= fields.length) return
    const copy = [...fields]
    ;[copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]]
    onChange(copy)
    if (editingIdx === idx) setEditingIdx(newIdx)
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
          Champs du formulaire ({fields.length})
        </label>
        <button
          type="button"
          onClick={addField}
          className="flex cursor-pointer items-center gap-1 rounded-lg border-none px-2.5 py-1 text-[11px] font-bold text-white"
          style={{ background: 'var(--ai)' }}
        >
          + Ajouter un champ
        </button>
      </div>

      {fields.length === 0 && (
        <div className="rounded-lg border border-dashed px-4 py-6 text-center text-[12px]" style={{ borderColor: 'var(--border)', color: 'var(--text-3)' }}>
          Aucun champ. Les champs par defaut (Description, Urgence) seront utilises.
        </div>
      )}

      <div className="flex flex-col gap-2">
        {fields.map((field, idx) => (
          <div key={field.id} className="rounded-lg border" style={{ borderColor: editingIdx === idx ? 'var(--ai)' : 'var(--border)', background: editingIdx === idx ? 'var(--ai-lt)' : 'var(--surface)' }}>
            {/* Field summary row */}
            <div className="flex items-center gap-2 px-3 py-2" onClick={() => setEditingIdx(editingIdx === idx ? null : idx)} style={{ cursor: 'pointer' }}>
              <span className="w-6 text-center text-[11px] font-bold" style={{ color: 'var(--text-3)' }}>
                {FIELD_TYPES.find((t) => t.value === field.type)?.icon || '?'}
              </span>
              <span className="flex-1 text-[12.5px] font-semibold" style={{ color: field.label ? 'var(--text-1)' : 'var(--text-3)' }}>
                {field.label || 'Nouveau champ...'}
              </span>
              <span className="rounded px-1.5 py-[1px] text-[9px] font-bold" style={{ background: 'var(--bg)', color: 'var(--text-3)' }}>
                {FIELD_TYPES.find((t) => t.value === field.type)?.label || field.type}
              </span>
              {field.required && <span className="text-[9px] font-bold" style={{ color: 'var(--danger)' }}>requis</span>}
              <button type="button" onClick={(e) => { e.stopPropagation(); moveField(idx, -1) }} className="flex h-5 w-5 cursor-pointer items-center justify-center rounded border-none text-[11px]" style={{ background: 'var(--bg)', color: 'var(--text-3)' }}>↑</button>
              <button type="button" onClick={(e) => { e.stopPropagation(); moveField(idx, 1) }} className="flex h-5 w-5 cursor-pointer items-center justify-center rounded border-none text-[11px]" style={{ background: 'var(--bg)', color: 'var(--text-3)' }}>↓</button>
              <button type="button" onClick={(e) => { e.stopPropagation(); removeField(idx) }} className="flex h-5 w-5 cursor-pointer items-center justify-center rounded border-none text-[11px]" style={{ background: 'var(--danger-lt)', color: 'var(--danger)' }}>✕</button>
            </div>

            {/* Field editor (expanded) */}
            {editingIdx === idx && (
              <div className="flex flex-col gap-2.5 border-t px-3 py-3" style={{ borderColor: 'rgba(74,29,150,.15)' }}>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[10px] font-bold" style={{ color: 'var(--text-3)' }}>Libelle</label>
                    <input className="form-input text-[12px]" placeholder="Ex: Localisation" value={field.label} onChange={(e) => updateField(idx, { label: e.target.value, id: field.id || `f-${Date.now()}` })} />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold" style={{ color: 'var(--text-3)' }}>Type</label>
                    <select className="form-input text-[12px]" value={field.type} onChange={(e) => updateField(idx, { type: e.target.value as FormFieldType })}>
                      {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[10px] font-bold" style={{ color: 'var(--text-3)' }}>Placeholder</label>
                    <input className="form-input text-[12px]" placeholder="Texte indicatif..." value={field.placeholder || ''} onChange={(e) => updateField(idx, { placeholder: e.target.value })} />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold" style={{ color: 'var(--text-3)' }}>Texte d'aide</label>
                    <input className="form-input text-[12px]" placeholder="Aide sous le champ..." value={field.helpText || ''} onChange={(e) => updateField(idx, { helpText: e.target.value })} />
                  </div>
                </div>

                {NEEDS_OPTIONS.includes(field.type) && (
                  <div>
                    <label className="mb-1 block text-[10px] font-bold" style={{ color: 'var(--text-3)' }}>Options (1 par ligne)</label>
                    <textarea
                      className="form-input text-[12px]"
                      rows={3}
                      placeholder={"Option 1\nOption 2\nOption 3"}
                      value={(field.options || []).join('\n')}
                      onChange={(e) => updateField(idx, { options: e.target.value.split('\n') })}
                      onBlur={(e) => updateField(idx, { options: e.target.value.split('\n').filter((o) => o.trim()) })}
                      style={{ resize: 'vertical', minHeight: 60 }}
                    />
                  </div>
                )}

                {field.type === 'file' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-bold" style={{ color: 'var(--text-3)' }}>Types acceptes</label>
                      <input className="form-input text-[12px]" placeholder="image/*,.pdf,.doc" value={field.accept || ''} onChange={(e) => updateField(idx, { accept: e.target.value })} />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold" style={{ color: 'var(--text-3)' }}>Max fichiers</label>
                      <input className="form-input text-[12px]" type="number" min={1} max={10} value={field.maxFiles || 5} onChange={(e) => updateField(idx, { maxFiles: parseInt(e.target.value) || 5 })} />
                    </div>
                  </div>
                )}

                {field.type === 'number' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-bold" style={{ color: 'var(--text-3)' }}>Min</label>
                      <input className="form-input text-[12px]" type="number" value={field.min ?? ''} onChange={(e) => updateField(idx, { min: e.target.value ? parseInt(e.target.value) : undefined })} />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold" style={{ color: 'var(--text-3)' }}>Max</label>
                      <input className="form-input text-[12px]" type="number" value={field.max ?? ''} onChange={(e) => updateField(idx, { max: e.target.value ? parseInt(e.target.value) : undefined })} />
                    </div>
                  </div>
                )}

                <label className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--text-2)' }}>
                  <input type="checkbox" checked={field.required} onChange={(e) => updateField(idx, { required: e.target.checked })} />
                  Champ obligatoire
                </label>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
