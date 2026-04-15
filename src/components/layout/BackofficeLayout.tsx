import { NavLink, Outlet, Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

const NAV_ITEMS = [
  {
    to: '/backoffice',
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="7" height="8" rx="1.5" />
        <rect x="11" y="2" width="7" height="5" rx="1.5" />
        <rect x="2" y="12" width="7" height="6" rx="1.5" />
        <rect x="11" y="9" width="7" height="9" rx="1.5" />
      </svg>
    ),
  },
  {
    to: '/backoffice/demandes',
    label: 'Demandes',
    icon: (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h12a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
        <line x1="7" y1="8" x2="13" y2="8" />
        <line x1="7" y1="11" x2="11" y2="11" />
      </svg>
    ),
  },
  {
    to: '/backoffice/conversations',
    label: 'Conversations IA',
    icon: (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 4h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-4l-3 3-3-3H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
        <circle cx="7" cy="9" r=".8" fill="currentColor" stroke="none" />
        <circle cx="10" cy="9" r=".8" fill="currentColor" stroke="none" />
        <circle cx="13" cy="9" r=".8" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    to: '/backoffice/catalogue',
    label: 'Catalogue',
    icon: (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="6" height="6" rx="1" />
        <rect x="11" y="3" width="6" height="6" rx="1" />
        <rect x="3" y="11" width="6" height="6" rx="1" />
        <rect x="11" y="11" width="6" height="6" rx="1" />
      </svg>
    ),
  },
  {
    to: '/backoffice/logs',
    label: 'Logs',
    icon: (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="14" height="14" rx="2" /><line x1="7" y1="7" x2="13" y2="7" /><line x1="7" y1="10" x2="13" y2="10" /><line x1="7" y1="13" x2="10" y2="13" />
      </svg>
    ),
  },
  {
    to: '/backoffice/utilisateurs',
    label: 'Utilisateurs',
    icon: (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="6" r="3" /><path d="M2 17v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1" /><circle cx="16" cy="6" r="2" /><path d="M16 11a3 3 0 0 1 3 3v1" />
      </svg>
    ),
  },
  {
    to: '/backoffice/parametres',
    label: 'Paramètres',
    icon: (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="3" />
        <path d="M10 1v3M10 16v3M1 10h3M16 10h3M3.5 3.5l2 2M14.5 14.5l2 2M3.5 16.5l2-2M14.5 5.5l2-2" />
      </svg>
    ),
  },
]

export default function BackofficeLayout() {
  const { role, user, logout } = useAuthStore()

  if (role !== 'dsi') {
    return <Navigate to="/" replace />
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className="flex w-[250px] shrink-0 flex-col overflow-y-auto"
        style={{ background: 'var(--brown-800)', height: '100vh', position: 'sticky', top: 0 }}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5">
          <img
            src="/logo-ism.png"
            alt="ISM"
            className="shrink-0"
            style={{ height: 36, borderRadius: 'var(--r-sm)' }}
          />
          <div>
            <div className="text-sm font-extrabold leading-tight text-white">Groupe ISM</div>
            <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--orange-300)' }}>
              Back Office DSI
            </div>
          </div>
        </div>

        <div className="mx-4 h-px" style={{ background: 'rgba(232,131,26,.15)' }} />

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/backoffice'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-[9px] text-[13px] font-semibold no-underline transition-all duration-150 ${
                  isActive
                    ? 'text-white bg-[rgba(232,131,26,.18)]'
                    : 'text-white/55 hover:text-white hover:bg-white/[.06]'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: user + switch */}
        <div className="mt-auto px-3 pb-4">
          <div className="mx-1 mb-3 h-px" style={{ background: 'rgba(232,131,26,.15)' }} />

          <NavLink
            to="/portail"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-semibold no-underline transition-colors"
            style={{ background: 'rgba(232,131,26,.1)', color: 'var(--orange-300)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(232,131,26,.18)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(232,131,26,.1)' }}
          >
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 2a3 3 0 0 1 2.5 1.3L17 9h-1.5v7a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1V9H3l4.5-5.7A3 3 0 0 1 10 2z" />
            </svg>
            Voir le portail
          </NavLink>

          {user && (
            <div
              className="mt-3 flex items-center gap-2.5 rounded-lg px-3 py-2"
              style={{ background: 'rgba(255,255,255,.05)' }}
            >
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-extrabold"
                style={{ background: 'var(--orange-400)', color: 'var(--brown-800)' }}
              >
                {user.initials}
              </div>
              <div className="flex-1">
                <div className="text-[12px] font-semibold text-white">{user.displayName}</div>
                <div className="text-[10px]" style={{ color: 'rgba(255,255,255,.4)' }}>{user.email}</div>
              </div>
            </div>
          )}

          <button
            onClick={logout}
            className="mt-2 flex w-full cursor-pointer items-center gap-2 rounded-lg border-none px-3 py-2 text-[12px] font-semibold transition-colors"
            style={{ background: 'rgba(156,32,32,.15)', color: '#FFAAAA' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(156,32,32,.25)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(156,32,32,.15)' }}
          >
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 3h3v14h-3" /><path d="M10 10H3" /><polyline points="7,6 3,10 7,14" />
            </svg>
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
        {/* Top bar */}
        <header
          className="flex h-[52px] items-center justify-between border-b px-6"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div />
          <div className="flex items-center gap-2">
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
              style={{ background: 'var(--ai-lt)', color: 'var(--ai)' }}
            >
              Administration DSI
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
