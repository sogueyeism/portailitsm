import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../ui/Modal'
import { useDemandStore } from '../../store/demandStore'
import { useAuthStore } from '../../store/authStore'
import { showToast } from '../ui/Toast'

interface Props {
  open: boolean
  onClose: () => void
}

export default function MachineProblemModal({ open, onClose }: Props) {
  const { user } = useAuthStore()
  if (!user) return null
  const navigate = useNavigate()
  const addDemand = useDemandStore((s) => s.addDemand)

  const [type, setType] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [urgency, setUrgency] = useState<'Faible' | 'Normal' | 'Élevée' | 'Urgente'>('Normal')

  const canSubmit = type && description.trim().length > 10

  const handleSubmit = () => {
    const id = `DEM-${String(Date.now()).slice(-4)}`
    addDemand({
      id,
      userId: user.id,
      userName: user.displayName,
      userEmail: user.email,
      createdAt: new Date().toISOString(),
      status: 'pending',
      horsCategorie: false,
      ticket: {
        service: 'Signaler un problème machine',
        categorie: 'Support technique',
        emoji: '💻',
        titre: `${type}${location ? ' — ' + location : ''}`,
        description: description.trim(),
        urgence: urgency,
        urgence_raison: urgency === 'Urgente' ? 'Bloquant pour le travail' : 'Standard',
        sla: '4 heures ouvrees',
      },
      conversation: [
        { role: 'user', content: `[Formulaire] ${type} — ${description}` },
      ],
    })
    showToast('success', `Demande ${id} soumise — suivez son avancement dans Mes demandes`)
    navigate('/tickets')
    onClose()
    setType(''); setLocation(''); setDescription(''); setUrgency('Normal')
  }

  return (
    <Modal open={open} onClose={onClose} title="Signaler un problème machine" icon="🖥️">
      <div className="flex flex-col gap-4">
        <Field label="Type de problème">
          <select className="form-input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Sélectionnez...</option>
            <option value="PC ne demarre pas">PC ne demarre pas</option>
            <option value="Ecran bleu (BSOD)">Ecran bleu (BSOD)</option>
            <option value="Lenteur excessive">Lenteur excessive</option>
            <option value="Périphérique défaillant">Périphérique défaillant</option>
            <option value="Probleme d'affichage">Probleme d'affichage</option>
            <option value="Autre">Autre panne</option>
          </select>
        </Field>
        <Field label="Localisation (bureau, salle)">
          <input className="form-input" placeholder="Ex: Bureau 204, Batiment A" value={location} onChange={(e) => setLocation(e.target.value)} />
        </Field>
        <Field label="Description detaillee">
          <textarea className="form-input" rows={3} placeholder="Décrivez le problème..." value={description} onChange={(e) => setDescription(e.target.value)} style={{ resize: 'vertical', minHeight: 80 }} />
        </Field>
        <Field label="Urgence">
          <select className="form-input" value={urgency} onChange={(e) => setUrgency(e.target.value as typeof urgency)}>
            <option value="Faible">Faible</option>
            <option value="Normal">Normal</option>
            <option value="Élevée">Elevee</option>
            <option value="Urgente">Urgente — bloquant</option>
          </select>
        </Field>
        <div className="rounded-lg px-3 py-2 text-[12px]" style={{ background: 'var(--info-lt)', color: 'var(--info)' }}>SLA : 4 heures ouvrees</div>
        <button onClick={handleSubmit} disabled={!canSubmit} className="cursor-pointer rounded-xl border-none py-3 text-[14px] font-bold text-white disabled:opacity-50" style={{ background: 'var(--accent)' }}>Soumettre</button>
      </div>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>{label}</label>
      {children}
    </div>
  )
}
