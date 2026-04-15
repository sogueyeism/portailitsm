import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useNotificationStore } from '../../store/notificationStore'
import { useDemandStore } from '../../store/demandStore'

export default function Topbar() {
  const { role, user, logout } = useAuthStore()
  const isRH = role === 'rh'
  const isDSI = role === 'dsi'
  const notifications = useNotificationStore((s) => s.notifications)
  const markAllRead = useNotificationStore((s) => s.markAllRead)
  const unread = notifications.filter((n) => !n.read).length
  const allDemands = useDemandStore((s) => s.demandes)
  const myDemandsCount = allDemands.filter((d) => d.userId === user?.id && !d.horsCategorie).length
  const [showNotifs, setShowNotifs] = useState(false)

  return (
    <div className="sticky top-0 z-[300]">
      {/* ── Main bar ── */}
      <header
        className="flex h-[58px] items-center justify-between px-7"
        style={{
          background: 'var(--brown-800)',
          boxShadow: '0 2px 16px rgba(42,20,0,.4)',
        }}
      >
        {/* Brand */}
        <div className="flex items-center gap-3">
          <img
            src="/logo-ism.png"
            alt="ISM"
            className="shrink-0"
            style={{ height: 36, borderRadius: 'var(--r-sm)' }}
          />

          <div
            className="h-[22px] w-px"
            style={{ background: 'rgba(232,131,26,.3)' }}
          />

          <div>
            <div className="text-sm font-extrabold leading-[1.1] tracking-[.2px] text-white">
              Groupe ISM
            </div>
            <div
              className="text-[10px] font-medium uppercase tracking-[.8px]"
              style={{ color: 'var(--orange-300)' }}
            >
              Portail IT
            </div>
          </div>

          <span
            className="rounded-[20px] px-2 py-[3px] text-[9.5px] font-bold uppercase tracking-[.6px]"
            style={{
              background: 'rgba(232,131,26,.12)',
              border: '1px solid rgba(232,131,26,.3)',
              color: 'var(--orange-300)',
            }}
          >
            GLPI
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-0.5">
          <NavLink to="/" end className={({ isActive }) => navBtnClass(isActive)}>
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 2a3 3 0 0 1 2.5 1.3L17 9h-1.5v7a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1V9H3l4.5-5.7A3 3 0 0 1 10 2z" />
            </svg>
            Accueil
          </NavLink>

          <NavLink to="/tickets" className={({ isActive }) => navBtnClass(isActive)}>
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="10" cy="10" r="7.5" />
              <polyline points="10,6.5 10,10 12.5,12.5" />
            </svg>
            Mes demandes
            {myDemandsCount > 0 && (
              <span
                className="rounded-lg px-[5px] py-px text-[9px] font-extrabold"
                style={{ background: 'var(--orange-400)', color: 'var(--brown-800)' }}
              >
                {myDemandsCount}
              </span>
            )}
          </NavLink>

          {isDSI && (
            <NavLink to="/backoffice" className={({ isActive }) => navBtnClass(isActive)}>
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="10" cy="10" r="3" />
                <path d="M10 1v3M10 16v3M1 10h3M16 10h3M3.5 3.5l2 2M14.5 14.5l2 2M3.5 16.5l2-2M14.5 5.5l2-2" />
              </svg>
              Back office
            </NavLink>
          )}
        </nav>

        {/* Right */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className="relative flex h-[34px] w-[34px] cursor-pointer items-center justify-center transition-colors duration-[120ms]"
              style={{
                border: '1px solid rgba(232,131,26,.22)',
                borderRadius: 'var(--r-sm)',
                background: 'transparent',
                color: 'var(--orange-300)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(232,131,26,.1)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              title="Notifications"
            >
              <svg className="h-[15px] w-[15px]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 2a6 6 0 0 1 6 6v3.5l1.5 2.5H2.5L4 11.5V8a6 6 0 0 1 6-6z" />
                <path d="M8 17a2 2 0 0 0 4 0" />
              </svg>
              {unread > 0 && (
                <div
                  className="absolute right-1 top-1 h-[7px] w-[7px] animate-pulse rounded-full"
                  style={{
                    background: 'var(--orange-400)',
                    border: '2px solid var(--brown-800)',
                  }}
                />
              )}
            </button>

            {/* Dropdown */}
            {showNotifs && (
              <div
                className="absolute right-0 top-[42px] z-[400] w-[320px] rounded-xl border shadow-lg"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
              >
                <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-[13px] font-bold" style={{ color: 'var(--text-1)' }}>Notifications</span>
                  {unread > 0 && (
                    <button
                      onClick={() => markAllRead()}
                      className="cursor-pointer border-none bg-transparent text-[11px] font-semibold"
                      style={{ color: 'var(--accent)' }}
                    >
                      Tout marquer lu
                    </button>
                  )}
                </div>
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-[12px]" style={{ color: 'var(--text-3)' }}>
                      Aucune notification
                    </div>
                  ) : (
                    notifications.slice(0, 8).map((n) => (
                      <div
                        key={n.id}
                        className="border-b px-4 py-3"
                        style={{
                          borderColor: 'var(--border)',
                          background: n.read ? 'transparent' : 'var(--accent-lt)',
                        }}
                      >
                        <div className="mb-0.5 text-[12px] font-bold" style={{ color: 'var(--text-1)' }}>
                          {n.title}
                        </div>
                        <div className="mb-1 text-[11.5px] leading-snug" style={{ color: 'var(--text-2)' }}>
                          {n.message}
                        </div>
                        <div className="text-[10px]" style={{ color: 'var(--text-3)' }}>
                          {new Date(n.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User pill */}
          {user && (
            <NavLink
              to="/profil"
              className="flex items-center gap-2 no-underline transition-colors duration-[120ms]"
              style={{
                padding: '4px 12px 4px 4px',
                border: '1px solid rgba(232,131,26,.25)',
                borderRadius: '24px',
                background: 'transparent',
              }}
            >
              <div
                className="flex h-[26px] w-[26px] items-center justify-center rounded-full text-[9px] font-extrabold"
                style={{ background: 'var(--orange-400)', color: 'var(--brown-800)' }}
              >
                {user.initials}
              </div>
              <span className="text-[12.5px] font-semibold text-white">
                {user.displayName}
              </span>
              <span
                className="rounded-lg px-1.5 py-[2px] text-[9px] font-bold uppercase tracking-[.4px]"
                style={
                  isDSI
                    ? { background: 'rgba(74,29,150,.3)', color: '#C4B5FD', border: '1px solid rgba(74,29,150,.4)' }
                    : isRH
                      ? { background: 'rgba(156,32,32,.25)', color: '#FFAAAA', border: '1px solid rgba(156,32,32,.4)' }
                      : { background: 'rgba(232,131,26,.15)', color: 'var(--orange-300)', border: '1px solid rgba(232,131,26,.25)' }
                }
              >
                {isDSI ? 'DSI' : isRH ? 'RH' : 'Utilisateur'}
              </span>
            </NavLink>
          )}

          {/* Logout button */}
          <button
            onClick={logout}
            className="flex h-[34px] w-[34px] cursor-pointer items-center justify-center transition-colors duration-[120ms]"
            style={{
              border: '1px solid rgba(232,131,26,.22)',
              borderRadius: 'var(--r-sm)',
              background: 'transparent',
              color: 'var(--orange-300)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(156,32,32,.2)'; e.currentTarget.style.color = '#FFAAAA' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--orange-300)' }}
            title="Déconnexion"
          >
            <svg className="h-[15px] w-[15px]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 3h3v14h-3" /><path d="M10 10H3" /><polyline points="7,6 3,10 7,14" />
            </svg>
          </button>
        </div>
      </header>

    </div>
  )
}

/* ── Nav button class helper ── */
function navBtnClass(isActive: boolean): string {
  const base =
    'flex items-center gap-[7px] rounded-[var(--r-sm)] px-3.5 py-[7px] text-[12.5px] font-semibold cursor-pointer border-none transition-all duration-150 no-underline'
  return isActive
    ? `${base} text-white bg-[rgba(232,131,26,.18)]`
    : `${base} text-white/60 bg-transparent hover:text-white hover:bg-white/[.08]`
}

