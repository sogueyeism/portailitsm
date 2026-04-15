import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../ui/Modal'
import { useDemandStore } from '../../store/demandStore'
import { useAuthStore } from '../../store/authStore'
import { showToast } from '../ui/Toast'

interface Props { open: boolean; onClose: () => void }

export default function PasswordResetModal({ open, onClose }: Props) {
  const { user } = useAuthStore()
  if (!user) return null
  const navigate = useNavigate()
  const addDemand = useDemandStore((s) => s.addDemand)
  const [accountType, setAccountType] = useState('')
  const [username, setUsername] = useState('')
  const [details, setDetails] = useState('')

  const canSubmit = accountType && username.trim()

  const handleSubmit = () => {
    const id = `DEM-${String(Date.now()).slice(-4)}`
    addDemand({
      id, userId: user.id, userName: user.displayName, userEmail: user.email,
      createdAt: new Date().toISOString(), status: 'pending', horsCategorie: false,
      ticket: {
        service: 'Réinitialisation de mot de passe', categorie: 'Accès & Sécurité', emoji: '🔑',
        titre: `Reset MDP ${accountType} — ${username}`,
        description: `Réinitialisation du mot de passe ${accountType} pour ${username}. ${details}`.trim(),
        urgence: 'Normal', urgence_raison: 'Demande standard', sla: '1 heure ouvree',
      },
      conversation: [{ role: 'user', content: `[Formulaire] Reset ${accountType} pour ${username}` }],
    })
    showToast('success', `Demande ${id} soumise — suivez son avancement dans Mes demandes`)
    navigate('/tickets')
    onClose(); setAccountType(''); setUsername(''); setDetails('')
  }

  return (
    <Modal open={open} onClose={onClose} title="Réinitialisation de mot de passe" icon="🔑">
      <div className="flex flex-col gap-4">
        <Field label="Type de compte">
          <select className="form-input" value={accountType} onChange={(e) => setAccountType(e.target.value)}>
            <option value="">Sélectionnez...</option>
            <option value="Windows/AD">Windows / Active Directory</option>
            <option value="Messagerie">Messagerie</option>
            <option value="Application metier">Application metier</option>
          </select>
        </Field>
        <Field label="Nom d'utilisateur ou email">
          <input className="form-input" placeholder="Ex: o.gueye@ism.sn" value={username} onChange={(e) => setUsername(e.target.value)} />
        </Field>
        <Field label="Details (optionnel)">
          <textarea className="form-input" rows={2} placeholder="Message d'erreur, depuis quand..." value={details} onChange={(e) => setDetails(e.target.value)} style={{ resize: 'vertical', minHeight: 50 }} />
        </Field>
        <div className="rounded-lg px-3 py-2 text-[12px]" style={{ background: 'var(--success-lt)', color: 'var(--success)' }}>SLA : 1 heure ouvree</div>
        <button onClick={handleSubmit} disabled={!canSubmit} className="cursor-pointer rounded-xl border-none py-3 text-[14px] font-bold text-white disabled:opacity-50" style={{ background: 'var(--accent)' }}>Soumettre</button>
      </div>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div><label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>{label}</label>{children}</div>)
}
