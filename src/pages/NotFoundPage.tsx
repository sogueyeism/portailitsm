import { NavLink } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[calc(100vh-58px)] flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 text-[64px]">🔍</div>
      <h1 className="mb-2 text-[28px] font-extrabold" style={{ color: 'var(--text-1)' }}>
        Page introuvable
      </h1>
      <p className="mb-8 max-w-[400px] text-[14px] leading-relaxed" style={{ color: 'var(--text-2)' }}>
        La page que vous cherchez n'existe pas ou a été déplacée.
      </p>
      <NavLink
        to="/"
        className="inline-flex items-center gap-2 rounded-xl border-none px-6 py-3 text-[14px] font-bold text-white no-underline"
        style={{ background: 'var(--accent)' }}
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 2a3 3 0 0 1 2.5 1.3L17 9h-1.5v7a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1V9H3l4.5-5.7A3 3 0 0 1 10 2z" />
        </svg>
        Retour à l'accueil
      </NavLink>
    </div>
  )
}
