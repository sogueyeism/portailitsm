import { useState, useEffect } from 'react'
import { showToast } from '../../components/ui/Toast'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

export default function ParametresPage() {
  const [dsiPhone, setDsiPhone] = useState('')
  const [dsiEmail, setDsiEmail] = useState('')
  const [glpiUrl, setGlpiUrl] = useState('')
  const [glpiToken, setGlpiToken] = useState('')
  const [smtpHost, setSmtpHost] = useState('')
  const [smtpPort, setSmtpPort] = useState('587')
  const [smtpUser, setSmtpUser] = useState('')
  const [smtpPass, setSmtpPass] = useState('')
  const [smtpFrom, setSmtpFrom] = useState('')
  const [dsiEmails, setDsiEmails] = useState('')
  const [oneloginClientId, setOneloginClientId] = useState('')
  const [oneloginClientSecret, setOneloginClientSecret] = useState('')
  const [oneloginIssuer, setOneloginIssuer] = useState('')
  const [maintenanceMode, setMaintenanceMode] = useState('false')
  const [maintenanceMessage, setMaintenanceMessage] = useState('')
  const [aiDailyLimit, setAiDailyLimit] = useState('50')
  const [apiKeyMasked, setApiKeyMasked] = useState('')
  const [newApiKey, setNewApiKey] = useState('')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  // Load settings on mount
  useEffect(() => {
    fetch(`${API}/api/settings`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then((r) => r.json())
      .then((data) => {
        setDsiPhone(data.dsiPhone || '')
        setDsiEmail(data.dsiEmail || '')
        setGlpiUrl(data.glpiUrl || '')
        setGlpiToken(data.glpiToken || '')
        setSmtpHost(data.smtpHost || '')
        setSmtpPort(data.smtpPort || '587')
        setSmtpUser(data.smtpUser || '')
        setSmtpPass(data.smtpPass || '')
        setSmtpFrom(data.smtpFrom || '')
        setDsiEmails(data.dsiEmails || '')
        setOneloginClientId(data.oneloginClientId || '')
        setOneloginClientSecret(data.oneloginClientSecret || '')
        setOneloginIssuer(data.oneloginIssuer || '')
        setMaintenanceMode(data.maintenanceMode || 'false')
        setMaintenanceMessage(data.maintenanceMessage || '')
        setAiDailyLimit(data.aiDailyLimit || '50')
      })
      // Load API key status
      fetch(`${API}/api/admin/api-key`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then((r) => r.json()).then((d) => setApiKeyMasked(d.masked || '')).catch(() => {})
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    try {
      await fetch(`${API}/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ dsiPhone, dsiEmail, glpiUrl, glpiToken, smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom, dsiEmails, oneloginClientId, oneloginClientSecret, oneloginIssuer, maintenanceMode, maintenanceMessage, aiDailyLimit }),
      })
      setSaved(true)
      showToast('success', 'Paramètres enregistrés')
      setTimeout(() => setSaved(false), 2500)
    } catch {
      showToast('error', 'Erreur lors de la sauvegarde')
    }
  }

  if (loading) return <div className="py-10 text-center text-[13px]" style={{ color: 'var(--text-3)' }}>Chargement...</div>

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-extrabold" style={{ color: 'var(--text-1)' }}>
          Paramètres
        </h1>
        <p className="text-[13px]" style={{ color: 'var(--text-3)' }}>
          Configuration du portail et de la connexion GLPI
        </p>
      </div>

      <div className="flex flex-col gap-6" style={{ maxWidth: 600 }}>
        {/* Coordonnees DSI */}
        <Section title="Coordonnees DSI" subtitle="Affichees aux utilisateurs pour les demandes hors catalogue">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Téléphone">
              <input
                className="w-full rounded-lg border px-3 py-2.5 text-[13px]"
                style={{ borderColor: 'var(--border)', fontFamily: 'inherit' }}
                placeholder="Ex: 33 849 69 19"
                value={dsiPhone}
                onChange={(e) => setDsiPhone(e.target.value)}
              />
            </Field>
            <Field label="Email">
              <input
                className="w-full rounded-lg border px-3 py-2.5 text-[13px]"
                style={{ borderColor: 'var(--border)', fontFamily: 'inherit' }}
                placeholder="Ex: support-it@ism.edu.sn"
                value={dsiEmail}
                onChange={(e) => setDsiEmail(e.target.value)}
              />
            </Field>
          </div>
        </Section>

        {/* Connexion GLPI */}
        <Section title="Connexion GLPI" subtitle="Configuration de l'API GLPI pour le versement automatique des tickets">
          <div className="flex flex-col gap-3">
            <Field label="URL de l'API GLPI">
              <input
                className="w-full rounded-lg border px-3 py-2.5 text-[13px] font-mono"
                style={{ borderColor: 'var(--border)', fontFamily: "'JetBrains Mono', monospace" }}
                placeholder="https://glpi.ism.sn/apirest.php"
                value={glpiUrl}
                onChange={(e) => setGlpiUrl(e.target.value)}
              />
            </Field>
            <Field label="App Token GLPI">
              <input
                type="password"
                className="w-full rounded-lg border px-3 py-2.5 text-[13px] font-mono"
                style={{ borderColor: 'var(--border)', fontFamily: "'JetBrains Mono', monospace" }}
                placeholder="Votre token d'application GLPI"
                value={glpiToken}
                onChange={(e) => setGlpiToken(e.target.value)}
              />
            </Field>
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-[12px]"
              style={{ background: 'var(--info-lt)', color: 'var(--info)' }}
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <circle cx="10" cy="10" r="8" />
                <line x1="10" y1="9" x2="10" y2="14" />
                <circle cx="10" cy="6.5" r=".8" fill="currentColor" stroke="none" />
              </svg>
              Cette configuration permettra de verser automatiquement les tickets valides dans votre instance GLPI.
            </div>
          </div>
        </Section>

        {/* Notifications email */}
        <Section title="Notifications email" subtitle="Configuration du serveur SMTP pour l'envoi de notifications">
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Serveur SMTP">
                <input
                  className="w-full rounded-lg border px-3 py-2.5 text-[13px]"
                  style={{ borderColor: 'var(--border)', fontFamily: 'inherit' }}
                  placeholder="Ex: smtp.gmail.com"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                />
              </Field>
              <Field label="Port">
                <input
                  className="w-full rounded-lg border px-3 py-2.5 text-[13px]"
                  style={{ borderColor: 'var(--border)', fontFamily: 'inherit' }}
                  placeholder="587"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Identifiant SMTP">
                <input
                  className="w-full rounded-lg border px-3 py-2.5 text-[13px]"
                  style={{ borderColor: 'var(--border)', fontFamily: 'inherit' }}
                  placeholder="votre-email@groupeism.sn"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                />
              </Field>
              <Field label="Mot de passe SMTP">
                <input
                  type="password"
                  className="w-full rounded-lg border px-3 py-2.5 text-[13px]"
                  style={{ borderColor: 'var(--border)', fontFamily: 'inherit' }}
                  placeholder="••••••••"
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                />
              </Field>
            </div>
            <Field label="Adresse d'expedition">
              <input
                className="w-full rounded-lg border px-3 py-2.5 text-[13px]"
                style={{ borderColor: 'var(--border)', fontFamily: 'inherit' }}
                placeholder="portail-it@groupeism.sn"
                value={smtpFrom}
                onChange={(e) => setSmtpFrom(e.target.value)}
              />
            </Field>
            <Field label="Emails des techniciens DSI (separes par des virgules)">
              <textarea
                className="w-full rounded-lg border px-3 py-2.5 text-[13px]"
                style={{ borderColor: 'var(--border)', fontFamily: 'inherit', resize: 'vertical', minHeight: 50 }}
                placeholder="tech1@groupeism.sn, tech2@groupeism.sn"
                value={dsiEmails}
                onChange={(e) => setDsiEmails(e.target.value)}
              />
            </Field>
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-[12px]"
              style={{ background: 'var(--info-lt)', color: 'var(--info)' }}
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <circle cx="10" cy="10" r="8" />
                <line x1="10" y1="9" x2="10" y2="14" />
                <circle cx="10" cy="6.5" r=".8" fill="currentColor" stroke="none" />
              </svg>
              Les techniciens recevront un email a chaque nouveau ticket. Les demandeurs seront notifies lors des changements de statut.
            </div>
          </div>
        </Section>

        {/* Cle API Anthropic */}
        <Section title="Cle API Anthropic" subtitle="Configuration de l'acces a l'IA Claude">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="text-[12px] font-medium" style={{ color: 'var(--text-2)' }}>
                  Cle actuelle : <span className="font-mono text-[11px]" style={{ color: 'var(--text-3)' }}>{apiKeyMasked || 'Non configuree'}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                className="flex-1 rounded-lg border px-3 py-2.5 text-[13px]"
                style={{ borderColor: 'var(--border)', fontFamily: 'inherit' }}
                placeholder="sk-ant-api03-..."
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
              />
              <button
                onClick={async () => {
                  if (!newApiKey) return
                  await fetch(`${API}/api/admin/api-key`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ apiKey: newApiKey }),
                  })
                  setApiKeyMasked(newApiKey.slice(0, 12) + '...' + newApiKey.slice(-6))
                  setNewApiKey('')
                  showToast('success', 'Cle API mise a jour')
                }}
                disabled={!newApiKey}
                className="cursor-pointer rounded-lg border-none px-4 py-2.5 text-[13px] font-bold text-white disabled:opacity-50"
                style={{ background: 'var(--accent)' }}
              >
                Mettre a jour
              </button>
            </div>
          </div>
        </Section>

        {/* Mode maintenance */}
        <Section title="Mode maintenance" subtitle="Désactiver temporairement l'acces au portail">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium" style={{ color: 'var(--text-2)' }}>
                {maintenanceMode === 'true' ? 'Le portail est en maintenance' : 'Le portail est actif'}
              </span>
              <button
                onClick={() => setMaintenanceMode(maintenanceMode === 'true' ? 'false' : 'true')}
                className="relative h-6 w-11 cursor-pointer rounded-full border-none transition-colors"
                style={{ background: maintenanceMode === 'true' ? 'var(--danger)' : 'var(--success)' }}
              >
                <div
                  className="absolute top-[2px] h-5 w-5 rounded-full bg-white shadow transition-all"
                  style={{ left: maintenanceMode === 'true' ? 22 : 2 }}
                />
              </button>
            </div>
            {maintenanceMode === 'true' && (
              <Field label="Message affiche aux utilisateurs">
                <textarea
                  className="w-full rounded-lg border px-3 py-2.5 text-[13px]"
                  style={{ borderColor: 'var(--border)', fontFamily: 'inherit', resize: 'vertical', minHeight: 60 }}
                  placeholder="Le portail est en cours de maintenance..."
                  value={maintenanceMessage}
                  onChange={(e) => setMaintenanceMessage(e.target.value)}
                />
              </Field>
            )}
          </div>
        </Section>

        {/* Quotas IA */}
        <Section title="Quotas IA" subtitle="Limiter l'utilisation de l'IA par utilisateur">
          <div className="flex flex-col gap-3">
            <Field label="Nombre max de messages IA par jour et par utilisateur">
              <input
                type="number"
                className="w-full rounded-lg border px-3 py-2.5 text-[13px]"
                style={{ borderColor: 'var(--border)', fontFamily: 'inherit' }}
                min={1}
                max={500}
                value={aiDailyLimit}
                onChange={(e) => setAiDailyLimit(e.target.value)}
              />
            </Field>
            <div className="rounded-lg px-3 py-2 text-[12px]" style={{ background: 'var(--info-lt)', color: 'var(--info)' }}>
              Chaque message envoyé au chat IA compte comme 1 utilisation. Valeur recommandée : 30-50 par jour.
            </div>
          </div>
        </Section>

        {/* SSO OneLogin */}
        <Section title="SSO OneLogin" subtitle="Connexion via votre fournisseur d'identité OneLogin">
          <div className="flex flex-col gap-3">
            <Field label="Issuer URL (domaine OneLogin)">
              <input
                className="w-full rounded-lg border px-3 py-2.5 text-[13px]"
                style={{ borderColor: 'var(--border)', fontFamily: 'inherit' }}
                placeholder="https://groupeism.onelogin.com"
                value={oneloginIssuer}
                onChange={(e) => setOneloginIssuer(e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Client ID">
                <input
                  className="w-full rounded-lg border px-3 py-2.5 text-[13px]"
                  style={{ borderColor: 'var(--border)', fontFamily: 'inherit' }}
                  placeholder="Fourni par OneLogin"
                  value={oneloginClientId}
                  onChange={(e) => setOneloginClientId(e.target.value)}
                />
              </Field>
              <Field label="Client Secret">
                <input
                  type="password"
                  className="w-full rounded-lg border px-3 py-2.5 text-[13px]"
                  style={{ borderColor: 'var(--border)', fontFamily: 'inherit' }}
                  placeholder="••••••••"
                  value={oneloginClientSecret}
                  onChange={(e) => setOneloginClientSecret(e.target.value)}
                />
              </Field>
            </div>
            <div
              className="flex items-start gap-2 rounded-lg px-3 py-2 text-[12px]"
              style={{ background: oneloginClientId && oneloginIssuer ? 'var(--success-lt)' : 'var(--info-lt)', color: oneloginClientId && oneloginIssuer ? 'var(--success)' : 'var(--info)' }}
            >
              <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <circle cx="10" cy="10" r="8" />
                <line x1="10" y1="9" x2="10" y2="14" />
                <circle cx="10" cy="6.5" r=".8" fill="currentColor" stroke="none" />
              </svg>
              {oneloginClientId && oneloginIssuer
                ? 'SSO OneLogin configure. Le bouton "Se connecter avec OneLogin" apparaitra sur la page de connexion.'
                : 'Renseignez les 3 champs pour activer le SSO. L\'URL de callback a configurer dans OneLogin est : ' + window.location.origin + '/'}
            </div>
          </div>
        </Section>

        {/* Comptes DSI */}
        <Section title="Comptes DSI" subtitle="Gestion des utilisateurs ayant accès au back office">
          <div className="flex flex-col gap-2">
            <DsiUserRow name="Amadou D." email="a.diallo@ism.sn" role="Administrateur" />
            <DsiUserRow name="Ibrahima S." email="i.sow@ism.sn" role="Technicien" />
            <DsiUserRow name="Aissatou B." email="a.ba@ism.sn" role="Technicien" />
          </div>
          <button
            className="mt-3 cursor-pointer rounded-lg border px-3 py-2 text-[12.5px] font-semibold transition-colors"
            style={{ borderColor: 'var(--border)', background: 'transparent', color: 'var(--text-2)', borderStyle: 'dashed' }}
          >
            + Ajouter un membre DSI
          </button>
        </Section>

        {/* Save */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className="cursor-pointer rounded-lg border-none px-6 py-2.5 text-[13px] font-bold text-white transition-colors"
            style={{ background: 'var(--accent)' }}
          >
            Enregistrer les modifications
          </button>
          {saved && (
            <span className="text-[13px] font-semibold" style={{ color: 'var(--success)' }}>
              Modifications enregistrees
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl border p-5"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <h2 className="mb-1 text-[15px] font-bold" style={{ color: 'var(--text-1)' }}>{title}</h2>
      <p className="mb-4 text-[12px]" style={{ color: 'var(--text-3)' }}>{subtitle}</p>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function DsiUserRow({ name, email, role }: { name: string; email: string; role: string }) {
  return (
    <div
      className="flex items-center justify-between rounded-lg border px-4 py-2.5"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-extrabold"
          style={{ background: 'var(--accent-lt)', color: 'var(--accent)' }}
        >
          {name.split(' ').map((n) => n[0]).join('')}
        </div>
        <div>
          <div className="text-[13px] font-semibold" style={{ color: 'var(--text-1)' }}>{name}</div>
          <div className="text-[11px]" style={{ color: 'var(--text-3)' }}>{email}</div>
        </div>
      </div>
      <span
        className="rounded-full px-2 py-[2px] text-[10.5px] font-bold"
        style={{
          background: role === 'Administrateur' ? 'var(--accent-lt)' : 'var(--bg)',
          color: role === 'Administrateur' ? 'var(--accent)' : 'var(--text-3)',
        }}
      >
        {role}
      </span>
    </div>
  )
}
