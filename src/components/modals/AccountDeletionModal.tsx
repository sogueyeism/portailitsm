import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../ui/Modal'
import { useDemandStore } from '../../store/demandStore'
import { useAuthStore } from '../../store/authStore'
import { showToast } from '../ui/Toast'

interface Props { open: boolean; onClose: () => void }

export default function AccountDeletionModal({ open, onClose }: Props) {
  const { user } = useAuthStore()
  if (!user) return null
  const navigate = useNavigate()
  const addDemand = useDemandStore((s) => s.addDemand)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [reason, setReason] = useState('')
  const [date, setDate] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const canSubmit = name.trim() && email.trim() && reason && confirmed

  const handleSubmit = () => {
    const id = `DEM-${String(Date.now()).slice(-4)}`
    addDemand({
      id, userId: user.id, userName: user.displayName, userEmail: user.email,
      createdAt: new Date().toISOString(), status: 'pending', horsCategorie: false,
      ticket: {
        service: 'Suppression de compte', categorie: 'Accès & Sécurité', emoji: '🗑️',
        titre: `Suppression compte — ${name}`,
        description: `Suppression de tous les accès pour ${name} (${email}). Motif: ${reason}.${date ? ' Depart: ' + date + '.' : ''} Demande RH: ${user.displayName}.`,
        urgence: 'Normal', urgence_raison: date ? `Depart le ${date}` : 'Processus RH', sla: '1 jour ouvre',
      },
      conversation: [{ role: 'user', content: `[Formulaire RH] Suppression compte ${name}` }],
    })
    showToast('success', `Demande ${id} soumise — suivez son avancement dans Mes demandes`)
    navigate('/tickets')
    onClose(); setName(''); setEmail(''); setReason(''); setDate(''); setConfirmed(false)
  }

  return (
    <Modal open={open} onClose={onClose} title="Suppression de compte" icon="🗑️" width={480}>
      <div className="flex flex-col gap-4">
        <div className="rounded-lg px-3 py-2.5 text-[12px] font-semibold" style={{ background: 'var(--danger-lt)', color: 'var(--danger)' }}>Action irréversible. Tous les accès seront supprimes.</div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nom complet"><input className="form-input" placeholder="Moussa Diop" value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Email"><input className="form-input" placeholder="m.diop@ism.sn" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        </div>
        <Field label="Motif">
          <select className="form-input" value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="">Sélectionnez...</option>
            <option value="Fin de contrat">Fin de contrat</option>
            <option value="Demission">Demission</option>
            <option value="Licenciement">Licenciement</option>
            <option value="Fin de stage">Fin de stage</option>
            <option value="Transfert">Transfert</option>
          </select>
        </Field>
        <Field label="Date de depart (optionnel)"><input type="date" className="form-input" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <label className="flex items-center gap-2.5 text-[12.5px]" style={{ color: 'var(--text-2)' }}>
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
          Je confirme la suppression définitive de tous les accès
        </label>
        <div className="rounded-lg px-3 py-2 text-[12px]" style={{ background: 'var(--warn-lt)', color: 'var(--warn)' }}>SLA : 1 jour ouvre</div>
        <button onClick={handleSubmit} disabled={!canSubmit} className="cursor-pointer rounded-xl border-none py-3 text-[14px] font-bold text-white disabled:opacity-50" style={{ background: 'var(--danger)' }}>Confirmer la suppression</button>
      </div>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div><label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>{label}</label>{children}</div>)
}
