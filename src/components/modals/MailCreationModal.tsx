import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../ui/Modal'
import { useDemandStore } from '../../store/demandStore'
import { useAuthStore } from '../../store/authStore'
import { showToast } from '../ui/Toast'

interface Props { open: boolean; onClose: () => void }

export default function MailCreationModal({ open, onClose }: Props) {
  const { user } = useAuthStore()
  if (!user) return null
  const navigate = useNavigate()
  const addDemand = useDemandStore((s) => s.addDemand)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [department, setDepartment] = useState('')
  const [startDate, setStartDate] = useState('')

  const suggested = firstName && lastName ? `${firstName.toLowerCase().charAt(0)}.${lastName.toLowerCase()}@ism.sn` : ''
  const canSubmit = firstName.trim() && lastName.trim()

  const handleSubmit = () => {
    const id = `DEM-${String(Date.now()).slice(-4)}`
    addDemand({
      id, userId: user.id, userName: user.displayName, userEmail: user.email,
      createdAt: new Date().toISOString(), status: 'pending', horsCategorie: false,
      ticket: {
        service: 'Creation de compte mail', categorie: 'Messagerie', emoji: '📧',
        titre: `Nouveau mail — ${firstName} ${lastName}`,
        description: `Creation ${suggested} pour ${firstName} ${lastName}${department ? ', dept ' + department : ''}${startDate ? '. Arrivee: ' + startDate : ''}.`,
        urgence: 'Faible', urgence_raison: startDate ? `Arrivee le ${startDate}` : 'Pas urgent', sla: '4 heures ouvrees',
      },
      conversation: [{ role: 'user', content: `[Formulaire] Nouveau mail pour ${firstName} ${lastName}` }],
    })
    showToast('success', `Demande ${id} soumise — suivez son avancement dans Mes demandes`)
    navigate('/tickets')
    onClose(); setFirstName(''); setLastName(''); setDepartment(''); setStartDate('')
  }

  return (
    <Modal open={open} onClose={onClose} title="Creation de compte mail" icon="✉️">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prenom"><input className="form-input" placeholder="Ibrahima" value={firstName} onChange={(e) => setFirstName(e.target.value)} /></Field>
          <Field label="Nom"><input className="form-input" placeholder="Fall" value={lastName} onChange={(e) => setLastName(e.target.value)} /></Field>
        </div>
        {suggested && <div className="rounded-lg px-3 py-2 text-[12.5px]" style={{ background: 'var(--ai-lt)', color: 'var(--ai)' }}>Adresse suggeree : <strong>{suggested}</strong></div>}
        <Field label="Departement"><input className="form-input" placeholder="Marketing, RH..." value={department} onChange={(e) => setDepartment(e.target.value)} /></Field>
        <Field label="Date d'arrivee (optionnel)"><input type="date" className="form-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
        <div className="rounded-lg px-3 py-2 text-[12px]" style={{ background: 'var(--info-lt)', color: 'var(--info)' }}>SLA : 4 heures ouvrees</div>
        <button onClick={handleSubmit} disabled={!canSubmit} className="cursor-pointer rounded-xl border-none py-3 text-[14px] font-bold text-white disabled:opacity-50" style={{ background: 'var(--accent)' }}>Soumettre</button>
      </div>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div><label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>{label}</label>{children}</div>)
}
