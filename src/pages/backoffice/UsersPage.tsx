import { useState, useEffect } from 'react'
import { showToast } from '../../components/ui/Toast'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

interface UserRow {
  id: number
  email: string
  first_name: string
  last_name: string
  initials: string
  display_name: string
  role: string
  active: number
  created_at: string
  last_login: string | null
}

const ROLES = [
  { value: 'user', label: 'Utilisateur', bg: 'var(--accent-lt)', color: 'var(--accent)' },
  { value: 'rh', label: 'RH', bg: 'var(--danger-lt)', color: 'var(--danger)' },
  { value: 'dsi', label: 'DSI', bg: 'var(--ai-lt)', color: 'var(--ai)' },
]

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<UserRow | null>(null)
  const [resetPwUser, setResetPwUser] = useState<UserRow | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null)

  const loadUsers = () => {
    fetch(`${API}/api/users`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then((r) => r.json())
      .then(setUsers)
      .catch(() => showToast('error', 'Erreur chargement utilisateurs'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadUsers() }, [])

  const handleToggleActive = async (user: UserRow) => {
    await fetch(`${API}/api/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !user.active }),
    })
    showToast('success', `${user.display_name} ${user.active ? 'désactivé' : 'active'}`)
    loadUsers()
  }

  const handleDelete = async (user: UserRow) => {
    if (!confirm(`Supprimer définitivement ${user.display_name} ?`)) return
    const res = await fetch(`${API}/api/users/${user.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) {
      showToast('error', data.error)
      return
    }
    showToast('success', `${user.display_name} supprime`)
    loadUsers()
  }

  const roleStyle = (role: string) => ROLES.find((r) => r.value === role) || ROLES[0]

  if (loading) return <div className="py-10 text-center text-[13px]" style={{ color: 'var(--text-3)' }}>Chargement...</div>

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold" style={{ color: 'var(--text-1)' }}>Utilisateurs</h1>
          <p className="text-[13px]" style={{ color: 'var(--text-3)' }}>Gérez les comptes d'acces au portail ({users.length} utilisateurs)</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-[13px] font-semibold"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text-2)' }}
          >
            Importer CSV
          </button>
          <a
            href={`${API}/api/export/users`}
            className="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-[13px] font-semibold no-underline"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text-2)' }}
          >
            Exporter
          </a>
          <button
            onClick={() => setShowCreate(true)}
            className="flex cursor-pointer items-center gap-2 rounded-lg border-none px-4 py-2.5 text-[13px] font-bold text-white"
            style={{ background: 'var(--accent)' }}
          >
            + Ajouter
          </button>
        </div>
      </div>

      {/* Users table */}
      <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border)' }}>
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface-2)' }}>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Utilisateur</th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Email</th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Role</th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Statut</th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Dernière connexion</th>
              <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const rs = roleStyle(u.role)
              return (
                <tr
                  key={u.id}
                  className="border-t"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)', opacity: u.active ? 1 : 0.5 }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-extrabold"
                        style={{ background: 'var(--accent)', color: '#fff' }}
                      >
                        {u.initials}
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold" style={{ color: 'var(--text-1)' }}>{u.first_name} {u.last_name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[12.5px]" style={{ color: 'var(--text-2)' }}>{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full px-2.5 py-[3px] text-[10px] font-bold" style={{ background: rs.bg, color: rs.color }}>
                      {rs.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="flex items-center gap-1.5 text-[12px] font-semibold"
                      style={{ color: u.active ? 'var(--success)' : 'var(--danger)' }}
                    >
                      <span className="inline-block h-[6px] w-[6px] rounded-full" style={{ background: u.active ? 'var(--success)' : 'var(--danger)' }} />
                      {u.active ? 'Actif' : 'Desactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--text-3)' }}>
                    {u.last_login
                      ? new Date(u.last_login).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                      : 'Jamais'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <ActionBtn label="Modifier" onClick={() => setEditing(u)} />
                      <ActionBtn label="Mot de passe" onClick={() => setResetPwUser(u)} />
                      <ActionBtn
                        label={u.active ? 'Désactiver' : 'Activer'}
                        onClick={() => handleToggleActive(u)}
                        danger={!!u.active}
                      />
                      {u.id !== 1 && <ActionBtn label="Supprimer" onClick={() => handleDelete(u)} danger />}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadUsers() }}
        />
      )}

      {/* Edit modal */}
      {editing && (
        <EditUserModal
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); loadUsers() }}
        />
      )}

      {/* Import CSV modal */}
      {showImport && (
        <ModalOverlay onClose={() => { setShowImport(false); setImportResult(null) }}>
          <h3 className="mb-2 text-[16px] font-bold" style={{ color: 'var(--text-1)' }}>Importer des utilisateurs</h3>
          <p className="mb-4 text-[13px]" style={{ color: 'var(--text-2)' }}>
            Fichier CSV avec les colonnes : <strong>email</strong>, prenom, nom, role, mot_de_passe
          </p>
          {importResult ? (
            <div>
              <div className="mb-3 rounded-lg px-4 py-3" style={{ background: 'var(--success-lt)', color: 'var(--success)' }}>
                <strong>{importResult.created}</strong> utilisateur(s) créé(s), <strong>{importResult.skipped}</strong> ignoré(s) (deja existants)
              </div>
              {importResult.errors.length > 0 && (
                <div className="mb-3 rounded-lg px-4 py-3 text-[12px]" style={{ background: 'var(--danger-lt)', color: 'var(--danger)' }}>
                  {importResult.errors.map((e, i) => <div key={i}>{e}</div>)}
                </div>
              )}
              <button onClick={() => { setShowImport(false); setImportResult(null); loadUsers() }} className="w-full cursor-pointer rounded-lg border-none py-2.5 text-[13px] font-bold text-white" style={{ background: 'var(--accent)' }}>
                Fermer
              </button>
            </div>
          ) : (
            <div>
              <div className="mb-3 rounded-lg border border-dashed px-4 py-6 text-center" style={{ borderColor: 'var(--border)' }}>
                <input
                  type="file"
                  accept=".csv"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const form = new FormData()
                    form.append('image', file)
                    try {
                      const res = await fetch(`${API}/api/users/import`, { method: 'POST', body: form })
                      const data = await res.json()
                      if (res.ok) setImportResult(data)
                      else showToast('error', data.error)
                    } catch { showToast('error', 'Erreur upload') }
                  }}
                />
              </div>
              <div className="rounded-lg px-3 py-2 text-[11px]" style={{ background: 'var(--info-lt)', color: 'var(--info)' }}>
                Format attendu : CSV (separateur virgule ou point-virgule). La premiere ligne doit contenir les en-tetes. Colonnes reconnues : email, prenom/first, nom/last/name, role/profil, password/mot_de_passe
              </div>
            </div>
          )}
        </ModalOverlay>
      )}

      {/* Reset password modal */}
      {resetPwUser && (
        <ResetPasswordModal
          user={resetPwUser}
          onClose={() => setResetPwUser(null)}
        />
      )}
    </div>
  )
}

function ActionBtn({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="cursor-pointer rounded px-2 py-1 text-[11px] font-semibold transition-colors"
      style={{
        border: `1px solid ${danger ? 'rgba(156,32,32,.2)' : 'var(--border)'}`,
        background: 'transparent',
        color: danger ? 'var(--danger)' : 'var(--text-2)',
      }}
    >
      {label}
    </button>
  )
}

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState('user')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setError('')
    setLoading(true)
    const res = await fetch(`${API}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, firstName, lastName, role }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(data.error)
      return
    }
    showToast('success', `Utilisateur ${firstName} ${lastName} cree`)
    onCreated()
  }

  return (
    <ModalOverlay onClose={onClose}>
      <h3 className="mb-5 text-[16px] font-bold" style={{ color: 'var(--text-1)' }}>Nouvel utilisateur</h3>
      {error && <div className="mb-3 rounded-lg px-3 py-2 text-[12px]" style={{ background: 'var(--danger-lt)', color: 'var(--danger)' }}>{error}</div>}
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prenom"><input className="form-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} /></Field>
          <Field label="Nom"><input className="form-input" value={lastName} onChange={(e) => setLastName(e.target.value)} /></Field>
        </div>
        <Field label="Email"><input className="form-input" type="email" placeholder="prenom.nom@groupeism.sn" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Mot de passe"><input className="form-input" type="password" placeholder="Min. 6 caractères" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <Field label="Role">
          <select className="form-input" value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </Field>
      </div>
      <div className="mt-5 flex gap-2">
        <button onClick={handleSubmit} disabled={loading || !email || !password || !firstName || !lastName} className="flex-1 cursor-pointer rounded-lg border-none py-2.5 text-[13px] font-bold text-white disabled:opacity-50" style={{ background: 'var(--accent)' }}>
          {loading ? 'Creation...' : 'Créer l\'utilisateur'}
        </button>
        <button onClick={onClose} className="flex-1 cursor-pointer rounded-lg border py-2.5 text-[13px] font-bold" style={{ borderColor: 'var(--border)', background: 'transparent', color: 'var(--text-2)' }}>Annuler</button>
      </div>
    </ModalOverlay>
  )
}

function EditUserModal({ user, onClose, onSaved }: { user: UserRow; onClose: () => void; onSaved: () => void }) {
  const [firstName, setFirstName] = useState(user.first_name)
  const [lastName, setLastName] = useState(user.last_name)
  const [role, setRole] = useState(user.role)
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    await fetch(`${API}/api/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, role }),
    })
    setLoading(false)
    showToast('success', `${firstName} ${lastName} mis a jour`)
    onSaved()
  }

  return (
    <ModalOverlay onClose={onClose}>
      <h3 className="mb-5 text-[16px] font-bold" style={{ color: 'var(--text-1)' }}>Modifier : {user.display_name}</h3>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prenom"><input className="form-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} /></Field>
          <Field label="Nom"><input className="form-input" value={lastName} onChange={(e) => setLastName(e.target.value)} /></Field>
        </div>
        <Field label="Email"><input className="form-input" value={user.email} disabled style={{ opacity: 0.6 }} /></Field>
        <Field label="Role">
          <select className="form-input" value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </Field>
      </div>
      <div className="mt-5 flex gap-2">
        <button onClick={handleSave} disabled={loading} className="flex-1 cursor-pointer rounded-lg border-none py-2.5 text-[13px] font-bold text-white disabled:opacity-50" style={{ background: 'var(--accent)' }}>
          Enregistrer
        </button>
        <button onClick={onClose} className="flex-1 cursor-pointer rounded-lg border py-2.5 text-[13px] font-bold" style={{ borderColor: 'var(--border)', background: 'transparent', color: 'var(--text-2)' }}>Annuler</button>
      </div>
    </ModalOverlay>
  )
}

function ResetPasswordModal({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleReset = async () => {
    setLoading(true)
    await fetch(`${API}/api/users/${user.id}/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    setLoading(false)
    setDone(true)
    showToast('success', `Mot de passe de ${user.display_name} réinitialisé`)
  }

  return (
    <ModalOverlay onClose={onClose}>
      <h3 className="mb-2 text-[16px] font-bold" style={{ color: 'var(--text-1)' }}>Réinitialiser le mot de passe</h3>
      <p className="mb-4 text-[13px]" style={{ color: 'var(--text-2)' }}>Pour {user.first_name} {user.last_name} ({user.email})</p>
      {done ? (
        <div className="rounded-lg px-4 py-3 text-center text-[13px] font-semibold" style={{ background: 'var(--success-lt)', color: 'var(--success)' }}>
          Mot de passe réinitialisé avec succès
        </div>
      ) : (
        <>
          <Field label="Nouveau mot de passe">
            <input className="form-input" type="password" placeholder="Min. 6 caractères" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <div className="mt-4 flex gap-2">
            <button onClick={handleReset} disabled={loading || password.length < 6} className="flex-1 cursor-pointer rounded-lg border-none py-2.5 text-[13px] font-bold text-white disabled:opacity-50" style={{ background: 'var(--danger)' }}>
              Réinitialiser
            </button>
            <button onClick={onClose} className="flex-1 cursor-pointer rounded-lg border py-2.5 text-[13px] font-bold" style={{ borderColor: 'var(--border)', background: 'transparent', color: 'var(--text-2)' }}>Annuler</button>
          </div>
        </>
      )}
    </ModalOverlay>
  )
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center"
      style={{ background: 'rgba(42,20,0,.52)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-[460px] rounded-xl p-6" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-lg)' }}>
        {children}
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
