import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { showToast } from '../components/ui/Toast'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

export default function ProfilePage() {
  const { user, role } = useAuthStore()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  if (!user) return null

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      showToast('error', 'Les mots de passe ne correspondent pas')
      return
    }
    if (newPassword.length < 6) {
      showToast('error', 'Le mot de passe doit contenir au moins 6 caractères')
      return
    }

    setLoading(true)
    try {
      // Verify current password by trying to login
      const loginRes = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, password: currentPassword }),
      })
      if (!loginRes.ok) {
        showToast('error', 'Mot de passe actuel incorrect')
        setLoading(false)
        return
      }

      // Update password
      await fetch(`${API}/api/users/${user.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      })

      showToast('success', 'Mot de passe modifié avec succès')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      showToast('error', 'Erreur lors de la modification')
    }
    setLoading(false)
  }

  const roleLabel = role === 'dsi' ? 'DSI' : role === 'rh' ? 'RH' : 'Utilisateur'
  const roleStyle = role === 'dsi'
    ? { bg: 'var(--ai-lt)', color: 'var(--ai)' }
    : role === 'rh'
      ? { bg: 'var(--danger-lt)', color: 'var(--danger)' }
      : { bg: 'var(--accent-lt)', color: 'var(--accent)' }

  return (
    <div className="mx-auto w-full px-8 py-8" style={{ maxWidth: 640 }}>
      <h1 className="mb-6 text-[22px] font-extrabold" style={{ color: 'var(--text-1)' }}>Mon profil</h1>

      {/* Profile card */}
      <div className="mb-6 rounded-xl border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-4">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-extrabold"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            {user.initials}
          </div>
          <div>
            <div className="text-[18px] font-bold" style={{ color: 'var(--text-1)' }}>
              {user.firstName} {user.lastName}
            </div>
            <div className="text-[13px]" style={{ color: 'var(--text-2)' }}>{user.email}</div>
            <span
              className="mt-1 inline-block rounded-full px-2.5 py-[3px] text-[10px] font-bold"
              style={{ background: roleStyle.bg, color: roleStyle.color }}
            >
              {roleLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="rounded-xl border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <h2 className="mb-4 text-[16px] font-bold" style={{ color: 'var(--text-1)' }}>Changer le mot de passe</h2>
        <div className="flex flex-col gap-3">
          <Field label="Mot de passe actuel">
            <input
              type="password"
              className="form-input w-full"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </Field>
          <Field label="Nouveau mot de passe">
            <input
              type="password"
              className="form-input w-full"
              placeholder="Min. 6 caractères"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </Field>
          <Field label="Confirmer le nouveau mot de passe">
            <input
              type="password"
              className="form-input w-full"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </Field>
          <button
            onClick={handleChangePassword}
            disabled={loading || !currentPassword || !newPassword || !confirmPassword}
            className="mt-2 cursor-pointer rounded-xl border-none py-3 text-[14px] font-bold text-white disabled:opacity-50"
            style={{ background: 'var(--accent)' }}
          >
            {loading ? 'Modification...' : 'Modifier le mot de passe'}
          </button>
        </div>
      </div>
    </div>
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
