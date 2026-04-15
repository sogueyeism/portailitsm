import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../ui/Modal'
import { useDemandStore } from '../../store/demandStore'
import { useAuthStore } from '../../store/authStore'
import { useCatalogueStore, type FormField } from '../../store/catalogueStore'
import { showToast } from '../ui/Toast'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

interface Props {
  open: boolean
  onClose: () => void
  serviceId: string
}

const DEFAULT_FIELDS: FormField[] = [
  { id: 'description', label: 'Description de la demande', type: 'textarea', placeholder: 'Décrivez votre besoin en detail...', required: true },
  { id: 'location', label: 'Localisation', type: 'text', placeholder: 'Ex: Bureau 204, Salle MBA...', required: false },
  { id: 'urgency', label: 'Urgence', type: 'select', required: true, options: ['Faible', 'Normal', 'Elevee', 'Urgente'] },
]

export default function GenericServiceModal({ open, onClose, serviceId }: Props) {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const addDemand = useDemandStore((s) => s.addDemand)
  const service = useCatalogueStore((s) => s.services.find((svc) => svc.id === serviceId))

  const [values, setValues] = useState<Record<string, any>>({})
  const [files, setFiles] = useState<Record<string, File[]>>({})
  const [_uploadedUrls, _setUploadedUrls] = useState<Record<string, string[]>>({})

  if (!service || !user) return null

  const fields = service.formFields && service.formFields.length > 0 ? service.formFields : DEFAULT_FIELDS

  const updateField = (id: string, value: any) => {
    setValues((prev) => ({ ...prev, [id]: value }))
  }

  const handleFileSelect = (fieldId: string, newFiles: FileList | null, maxFiles: number) => {
    if (!newFiles) return
    const current = files[fieldId] || []
    const combined = [...current, ...Array.from(newFiles)].slice(0, maxFiles)
    setFiles((prev) => ({ ...prev, [fieldId]: combined }))
  }

  const removeFile = (fieldId: string, index: number) => {
    setFiles((prev) => ({
      ...prev,
      [fieldId]: (prev[fieldId] || []).filter((_, i) => i !== index),
    }))
  }

  const canSubmit = fields
    .filter((f) => f.required && f.type !== 'section')
    .every((f) => {
      if (f.type === 'file') return (files[f.id] || []).length > 0
      if (f.type === 'multiselect' || f.type === 'checkboxgroup') return (values[f.id] || []).length > 0
      const val = values[f.id]
      if (f.type === 'checkbox') return true // checkbox is always valid
      return typeof val === 'string' ? val.trim().length > 0 : !!val
    })

  const handleSubmit = async () => {
    // Upload files first
    const allUploadedUrls: Record<string, string[]> = {}
    for (const [fieldId, fieldFiles] of Object.entries(files)) {
      const urls: string[] = []
      for (const file of fieldFiles) {
        const form = new FormData()
        form.append('image', file)
        try {
          const res = await fetch(`${API_BASE}/api/upload`, { method: 'POST', body: form })
          const data = await res.json()
          if (data.success) urls.push(`${API_BASE}${data.url}`)
        } catch {}
      }
      allUploadedUrls[fieldId] = urls
    }

    const id = `DEM-${String(Date.now()).slice(-4)}`

    // Build structured form data
    const formData = fields
      .filter((f) => f.type !== 'section')
      .map((f) => {
        const entry: any = { label: f.label, type: f.type }
        if (f.type === 'file') {
          entry.value = `${(allUploadedUrls[f.id] || []).length} fichier(s)`
          entry.fileUrls = allUploadedUrls[f.id] || []
        } else if (f.type === 'multiselect' || f.type === 'checkboxgroup') {
          entry.value = values[f.id] || []
        } else if (f.type === 'checkbox') {
          entry.value = !!values[f.id]
        } else {
          entry.value = values[f.id]?.toString().trim() || ''
        }
        return entry
      })
      .filter((e) => {
        if (Array.isArray(e.value)) return e.value.length > 0
        if (typeof e.value === 'boolean') return true
        return !!e.value
      })

    // Collect all attachment URLs
    const allAttachments = Object.values(allUploadedUrls).flat()

    // Plain text description for compatibility
    const descParts = formData.map((f) => {
      if (f.fileUrls?.length) return `${f.label}: ${f.fileUrls.length} fichier(s) joint(s)`
      if (Array.isArray(f.value)) return `${f.label}: ${f.value.join(', ')}`
      if (typeof f.value === 'boolean') return `${f.label}: ${f.value ? 'Oui' : 'Non'}`
      return `${f.label}: ${f.value}`
    }).join('\n')

    const urgency = values.urgency || values.urgence || 'Normal'

    addDemand({
      id,
      userId: user.id,
      userName: user.displayName,
      userEmail: user.email,
      userFirstName: user.firstName,
      userLastName: user.lastName,
      createdAt: new Date().toISOString(),
      status: 'pending',
      horsCategorie: false,
      ticket: {
        service: service.name,
        categorie: service.categorie,
        emoji: service.emoji,
        titre: `${service.name}${values.location ? ' — ' + values.location : ''}`,
        description: descParts,
        urgence: urgency as 'Faible' | 'Normal' | 'Élevée' | 'Urgente',
        urgence_raison: urgency === 'Urgente' ? 'Bloquant' : 'Standard',
        sla: service.sla,
        formData,
        attachments: allAttachments,
      },
      conversation: [
        { role: 'user', content: `[Formulaire] ${service.name}\n${descParts}` },
      ],
    })

    showToast('success', `Demande ${id} soumise — vous pouvez suivre son avancement dans "Mes demandes"`)
    onClose()
    setValues({})
    setFiles({})
    navigate('/tickets')
  }

  return (
    <Modal open={open} onClose={onClose} title={service.name} icon={service.emoji} width={560}>
      <div className="flex flex-col gap-4">
        {fields.map((field) => (
          <FieldRenderer
            key={field.id}
            field={field}
            value={values[field.id]}
            files={files[field.id] || []}
            onChange={(val) => updateField(field.id, val)}
            onFileSelect={(f) => handleFileSelect(field.id, f, field.maxFiles || 5)}
            onFileRemove={(i) => removeFile(field.id, i)}
          />
        ))}

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full px-2.5 py-[3px] text-[10.5px] font-bold" style={{ background: 'var(--accent-lt)', color: 'var(--accent)' }}>
            SLA : {service.sla}
          </span>
          <span className="rounded-full px-2.5 py-[3px] text-[10.5px] font-bold" style={{ background: 'var(--info-lt)', color: 'var(--info)' }}>
            {service.categorie}
          </span>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="cursor-pointer rounded-xl border-none py-3 text-[14px] font-bold text-white disabled:opacity-50"
          style={{ background: 'var(--accent)' }}
        >
          Soumettre la demande
        </button>
      </div>
    </Modal>
  )
}

function FieldRenderer({
  field, value, files, onChange, onFileSelect, onFileRemove,
}: {
  field: FormField
  value: any
  files: File[]
  onChange: (v: any) => void
  onFileSelect: (f: FileList | null) => void
  onFileRemove: (i: number) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)

  // Section separator
  if (field.type === 'section') {
    return (
      <div className="border-b pb-1 pt-2" style={{ borderColor: 'var(--border)' }}>
        <h3 className="text-[13px] font-bold" style={{ color: 'var(--text-1)' }}>{field.label}</h3>
        {field.helpText && <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>{field.helpText}</p>}
      </div>
    )
  }

  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1 text-[11.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
        {field.label}
        {field.required && <span style={{ color: 'var(--danger)' }}>*</span>}
      </label>
      {field.helpText && <p className="mb-1.5 text-[11px]" style={{ color: 'var(--text-3)' }}>{field.helpText}</p>}

      {field.type === 'text' && (
        <input className="form-input" type="text" placeholder={field.placeholder || ''} value={value || ''} onChange={(e) => onChange(e.target.value)} />
      )}

      {field.type === 'textarea' && (
        <textarea className="form-input" rows={3} placeholder={field.placeholder || ''} value={value || ''} onChange={(e) => onChange(e.target.value)} style={{ resize: 'vertical', minHeight: 80 }} />
      )}

      {field.type === 'email' && (
        <input className="form-input" type="email" placeholder={field.placeholder || 'email@example.com'} value={value || ''} onChange={(e) => onChange(e.target.value)} />
      )}

      {field.type === 'phone' && (
        <input className="form-input" type="tel" placeholder={field.placeholder || '+221 XX XXX XX XX'} value={value || ''} onChange={(e) => onChange(e.target.value)} />
      )}

      {field.type === 'number' && (
        <input className="form-input" type="number" placeholder={field.placeholder || ''} min={field.min} max={field.max} value={value || ''} onChange={(e) => onChange(e.target.value)} />
      )}

      {field.type === 'date' && (
        <input className="form-input" type="date" value={value || ''} onChange={(e) => onChange(e.target.value)} />
      )}

      {field.type === 'datetime' && (
        <input className="form-input" type="datetime-local" value={value || ''} onChange={(e) => onChange(e.target.value)} />
      )}

      {field.type === 'time' && (
        <input className="form-input" type="time" value={value || ''} onChange={(e) => onChange(e.target.value)} />
      )}

      {field.type === 'select' && (
        <select className="form-input" value={value || ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">Sélectionnez...</option>
          {(field.options || []).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )}

      {field.type === 'multiselect' && (
        <div className="flex flex-wrap gap-2 rounded-lg border px-3 py-2.5" style={{ borderColor: 'var(--border)', minHeight: 40 }}>
          {(field.options || []).map((opt) => {
            const selected = (value || []).includes(opt)
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  const arr = value || []
                  onChange(selected ? arr.filter((v: string) => v !== opt) : [...arr, opt])
                }}
                className="cursor-pointer rounded-full px-3 py-1 text-[12px] font-semibold transition-colors"
                style={{
                  background: selected ? 'var(--accent)' : 'var(--bg)',
                  color: selected ? '#fff' : 'var(--text-2)',
                  border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                }}
              >
                {opt}
              </button>
            )
          })}
        </div>
      )}

      {field.type === 'radio' && (
        <div className="flex flex-col gap-2">
          {(field.options || []).map((opt) => (
            <label key={opt} className="flex cursor-pointer items-center gap-2 text-[13px]" style={{ color: 'var(--text-2)' }}>
              <input type="radio" name={field.id} checked={value === opt} onChange={() => onChange(opt)} />
              {opt}
            </label>
          ))}
        </div>
      )}

      {field.type === 'checkbox' && (
        <label className="flex cursor-pointer items-center gap-2 text-[13px]" style={{ color: 'var(--text-2)' }}>
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
          {field.placeholder || 'Oui'}
        </label>
      )}

      {field.type === 'checkboxgroup' && (
        <div className="flex flex-col gap-2">
          {(field.options || []).map((opt) => {
            const arr = value || []
            const checked = arr.includes(opt)
            return (
              <label key={opt} className="flex cursor-pointer items-center gap-2 text-[13px]" style={{ color: 'var(--text-2)' }}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onChange(checked ? arr.filter((v: string) => v !== opt) : [...arr, opt])}
                />
                {opt}
              </label>
            )
          })}
        </div>
      )}

      {field.type === 'file' && (
        <div>
          <input
            ref={fileRef}
            type="file"
            accept={field.accept || 'image/*,.pdf,.doc,.docx,.xls,.xlsx'}
            multiple={(field.maxFiles || 5) > 1}
            className="hidden"
            onChange={(e) => onFileSelect(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-[12.5px] font-semibold transition-colors"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text-2)' }}
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 14v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" /><polyline points="7,10 10,7 13,10" /><line x1="10" y1="7" x2="10" y2="16" />
            </svg>
            Choisir un fichier {(field.maxFiles || 5) > 1 ? `(max ${field.maxFiles || 5})` : ''}
          </button>
          {files.length > 0 && (
            <div className="mt-2 flex flex-col gap-1">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-[12px]" style={{ background: 'var(--ai-lt)' }}>
                  <span className="flex-1 truncate font-medium" style={{ color: 'var(--text-1)' }}>{f.name}</span>
                  <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{(f.size / 1024).toFixed(0)} Ko</span>
                  <button
                    type="button"
                    onClick={() => onFileRemove(i)}
                    className="flex h-5 w-5 cursor-pointer items-center justify-center rounded border-none" style={{ background: 'rgba(156,32,32,.1)', color: 'var(--danger)' }}
                  >
                    <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                      <line x1="1" y1="1" x2="9" y2="9" /><line x1="9" y1="1" x2="1" y2="9" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
