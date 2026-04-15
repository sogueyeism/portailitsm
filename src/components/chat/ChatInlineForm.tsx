import { useState, useRef } from 'react'
import type { FormField } from '../../store/catalogueStore'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

interface Props {
  fields: FormField[]
  step: number
  totalSteps: number
  onSubmit: (values: Record<string, any>, fileUrls: string[]) => void
}

export default function ChatInlineForm({ fields, step, totalSteps, onSubmit }: Props) {
  const [values, setValues] = useState<Record<string, any>>({})
  const [files, setFiles] = useState<Record<string, File[]>>({})
  const [uploading, setUploading] = useState(false)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const update = (id: string, val: any) => setValues((p) => ({ ...p, [id]: val }))

  const canSubmit = fields
    .filter((f) => f.required)
    .every((f) => {
      const v = values[f.id]
      if (f.type === 'file') return (files[f.id] || []).length > 0
      if (f.type === 'radio') return !!v
      return typeof v === 'string' ? v.trim().length > 0 : !!v
    })

  const handleSubmit = async () => {
    setUploading(true)
    const allUrls: string[] = []

    for (const [fieldId, fieldFiles] of Object.entries(files)) {
      for (const file of fieldFiles) {
        const form = new FormData()
        form.append('image', file)
        try {
          const res = await fetch(`${API_BASE}/api/upload`, { method: 'POST', body: form })
          const data = await res.json()
          if (data.success) allUrls.push(`${API_BASE}${data.url}`)
        } catch {}
      }
    }

    setUploading(false)
    onSubmit(values, allUrls)
  }

  return (
    <div
      className="mt-1.5 max-w-[440px] overflow-hidden rounded-2xl border-2"
      style={{ borderColor: 'var(--ai)', boxShadow: '0 4px 20px rgba(74,29,150,.1)' }}
    >
      <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: 'var(--ai)' }}>
        <span className="text-[12px] font-bold text-white">Dernieres precisions</span>
        <span className="ml-auto text-[10px]" style={{ color: 'rgba(255,255,255,.5)' }}>
          Etape {step}/{totalSteps}
        </span>
      </div>

      <div className="flex flex-col gap-3.5 p-4" style={{ background: 'var(--surface)' }}>
        {fields.map((field) => (
          <div key={field.id}>
            <label className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
              {field.label}
              {field.required && <span style={{ color: 'var(--danger)' }}>*</span>}
            </label>

            {field.type === 'text' && (
              <input
                className="w-full rounded-xl border px-3 py-2.5 text-[13px] outline-none transition-colors focus:border-[var(--ai)]"
                style={{ borderColor: 'var(--border)', fontFamily: 'inherit' }}
                placeholder={field.placeholder || ''}
                value={values[field.id] || ''}
                onChange={(e) => update(field.id, e.target.value)}
              />
            )}

            {field.type === 'textarea' && (
              <textarea
                className="w-full rounded-xl border px-3 py-2.5 text-[13px] outline-none transition-colors focus:border-[var(--ai)]"
                style={{ borderColor: 'var(--border)', fontFamily: 'inherit', resize: 'vertical', minHeight: 60 }}
                placeholder={field.placeholder || ''}
                value={values[field.id] || ''}
                onChange={(e) => update(field.id, e.target.value)}
              />
            )}

            {field.type === 'date' && (
              <input
                type="date"
                className="w-full rounded-xl border px-3 py-2.5 text-[13px] outline-none"
                style={{ borderColor: 'var(--border)', fontFamily: 'inherit' }}
                value={values[field.id] || ''}
                onChange={(e) => update(field.id, e.target.value)}
              />
            )}

            {field.type === 'radio' && (
              <div className="flex flex-wrap gap-2">
                {(field.options || []).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => update(field.id, opt)}
                    className="cursor-pointer rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition-all"
                    style={{
                      borderColor: values[field.id] === opt ? 'var(--accent)' : 'var(--border)',
                      background: values[field.id] === opt ? 'var(--accent)' : 'var(--surface)',
                      color: values[field.id] === opt ? '#fff' : 'var(--text-2)',
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {field.type === 'select' && (
              <select
                className="w-full rounded-xl border px-3 py-2.5 text-[13px] outline-none"
                style={{ borderColor: 'var(--border)', fontFamily: 'inherit' }}
                value={values[field.id] || ''}
                onChange={(e) => update(field.id, e.target.value)}
              >
                <option value="">Selectionnez...</option>
                {(field.options || []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            )}

            {field.type === 'file' && (
              <div>
                <input
                  type="file"
                  ref={(el) => { fileRefs.current[field.id] = el }}
                  accept={field.accept || 'image/*'}
                  multiple={(field.maxFiles || 1) > 1}
                  className="hidden"
                  onChange={(e) => {
                    if (!e.target.files) return
                    setFiles((p) => ({ ...p, [field.id]: [...(p[field.id] || []), ...Array.from(e.target.files!)].slice(0, field.maxFiles || 5) }))
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileRefs.current[field.id]?.click()}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-2.5 text-[12px] font-semibold transition-colors"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-3)' }}
                >
                  + Joindre un fichier
                </button>
                {(files[field.id] || []).length > 0 && (
                  <div className="mt-1.5 flex flex-col gap-1">
                    {files[field.id].map((f, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg px-2.5 py-1 text-[11px]" style={{ background: 'var(--ai-lt)', color: 'var(--ai)' }}>
                        <span className="flex-1 truncate font-medium">{f.name}</span>
                        <button
                          type="button"
                          onClick={() => setFiles((p) => ({ ...p, [field.id]: p[field.id].filter((_, j) => j !== i) }))}
                          className="cursor-pointer border-none bg-transparent text-[10px] font-bold"
                          style={{ color: 'var(--danger)' }}
                        >x</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        <button
          onClick={handleSubmit}
          disabled={!canSubmit || uploading}
          className="cursor-pointer rounded-xl border-none py-2.5 text-[13px] font-bold text-white transition-all disabled:opacity-50"
          style={{ background: 'var(--ai)', boxShadow: '0 2px 10px rgba(74,29,150,.2)' }}
        >
          {uploading ? 'Envoi en cours...' : 'Valider'}
        </button>
      </div>
    </div>
  )
}
