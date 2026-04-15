import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

export default function LoginPage() {
  const { login } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [ssoConfig, setSsoConfig] = useState<{ configured: boolean; clientId: string; issuer: string } | null>(null)

  // Load SSO config
  useEffect(() => {
    fetch(`${API}/api/auth/sso/config`)
      .then((r) => r.json())
      .then(setSsoConfig)
      .catch(() => {})
  }, [])

  // Handle SSO callback (code in URL)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code) {
      handleSsoCallback(code)
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erreur de connexion')
        setLoading(false)
        return
      }

      localStorage.setItem('token', data.token)
      login(data.user)
    } catch {
      setError('Impossible de contacter le serveur')
    }
    setLoading(false)
  }

  const handleSsoLogin = () => {
    if (!ssoConfig?.configured) return
    const redirectUri = `${window.location.origin}/`
    const url = `${ssoConfig.issuer}/oidc/2/auth?client_id=${ssoConfig.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid+profile+email`
    window.location.href = url
  }

  const handleSsoCallback = async (code: string) => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/auth/sso/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redirectUri: `${window.location.origin}/` }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erreur SSO')
        setLoading(false)
        // Clean URL
        window.history.replaceState({}, '', '/')
        return
      }

      localStorage.setItem('token', data.token)
      login(data.user)
      window.history.replaceState({}, '', '/')
    } catch {
      setError('Erreur de connexion SSO')
    }
    setLoading(false)
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{
        background: 'var(--brown-800)',
        backgroundImage: 'url(/bg-ism.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Dark overlay */}
      <div className="pointer-events-none fixed inset-0" style={{ background: 'rgba(42,20,0,.75)' }} />

      <div className="relative w-full" style={{ maxWidth: 420 }}>
        {/* Logo + branding */}
        <div className="mb-8 text-center">
          <img
            src="/logo-ism.png"
            alt="Groupe ISM"
            className="mx-auto mb-4"
            style={{ height: 72, borderRadius: 'var(--r-lg)' }}
          />
          <h1 className="mb-1 text-2xl font-extrabold text-white">Portail IT</h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,.45)' }}>
            Groupe ISM — Institut Supérieur de Management
          </p>
        </div>

        {/* Login card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: 'var(--surface)',
            boxShadow: '0 20px 60px rgba(0,0,0,.3)',
          }}
        >
          <h2 className="mb-6 text-center text-lg font-bold" style={{ color: 'var(--text-1)' }}>
            Connexion
          </h2>

          {/* Error */}
          {error && (
            <div
              className="mb-4 rounded-lg px-4 py-2.5 text-[13px] font-medium"
              style={{ background: 'var(--danger-lt)', color: 'var(--danger)' }}
            >
              {error}
            </div>
          )}

          {/* Email/Password form */}
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
                Adresse email
              </label>
              <input
                type="email"
                className="form-input w-full"
                placeholder="prenom.nom@groupeism.sn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="mb-5">
              <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
                Mot de passe
              </label>
              <input
                type="password"
                className="form-input w-full"
                placeholder="Votre mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full cursor-pointer rounded-xl border-none py-3 text-[14px] font-bold text-white transition-colors disabled:opacity-50"
              style={{ background: 'var(--accent)' }}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          {/* SSO separator */}
          {ssoConfig?.configured && (
            <>
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
                <span className="text-[11px] font-semibold" style={{ color: 'var(--text-3)' }}>OU</span>
                <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
              </div>

              <button
                onClick={handleSsoLogin}
                disabled={loading}
                className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border py-3 text-[14px] font-bold transition-colors disabled:opacity-50"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text-1)' }}
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="10" cy="10" r="8" />
                  <path d="M10 6v4l2 2" />
                </svg>
                Se connecter avec OneLogin
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-[11px]" style={{ color: 'rgba(255,255,255,.3)' }}>
          Portail de services IT — Groupe ISM, Dakar
        </p>
      </div>
    </div>
  )
}
