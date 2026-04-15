import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from './components/ui/Toast'
import { useAuthStore } from './store/authStore'
import { useCatalogueStore } from './store/catalogueStore'
import { useDemandStore } from './store/demandStore'
import Layout from './components/layout/Layout'
import BackofficeLayout from './components/layout/BackofficeLayout'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import TicketsPage from './pages/TicketsPage'
import DashboardPage from './pages/backoffice/DashboardPage'
import DemandesPage from './pages/backoffice/DemandesPage'
import ConversationsPage from './pages/backoffice/ConversationsPage'
import CataloguePage from './pages/backoffice/CataloguePage'
import ParametresPage from './pages/backoffice/ParametresPage'
import UsersPage from './pages/backoffice/UsersPage'
import LogsPage from './pages/backoffice/LogsPage'
import ProfilePage from './pages/ProfilePage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  const { authenticated, checked, checkAuth, role } = useAuthStore()
  const loadServices = useCatalogueStore((s) => s.loadServices)
  const loadDemands = useDemandStore((s) => s.loadDemands)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (authenticated) {
      loadServices()
      loadDemands()
    }
  }, [authenticated, loadServices, loadDemands])

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--brown-800)' }}>
        <div className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,.4)' }}>Chargement...</div>
      </div>
    )
  }

  if (!authenticated) {
    return (
      <>
        <ToastContainer />
        <LoginPage />
      </>
    )
  }

  const isDSI = role === 'dsi'

  return (
    <>
      <ToastContainer />
      <Routes>
        {/* Portail utilisateur */}
        <Route element={<Layout />}>
          <Route path="/" element={isDSI ? <Navigate to="/backoffice" replace /> : <HomePage />} />
          <Route path="/portail" element={<HomePage />} />
          <Route path="/tickets" element={<TicketsPage />} />
          <Route path="/profil" element={<ProfilePage />} />
        </Route>

        {/* Back office DSI */}
        <Route element={<BackofficeLayout />}>
          <Route path="/backoffice" element={isDSI ? <DashboardPage /> : <Navigate to="/" replace />} />
          <Route path="/backoffice/demandes" element={isDSI ? <DemandesPage /> : <Navigate to="/" replace />} />
          <Route path="/backoffice/conversations" element={isDSI ? <ConversationsPage /> : <Navigate to="/" replace />} />
          <Route path="/backoffice/catalogue" element={isDSI ? <CataloguePage /> : <Navigate to="/" replace />} />
          <Route path="/backoffice/utilisateurs" element={isDSI ? <UsersPage /> : <Navigate to="/" replace />} />
          <Route path="/backoffice/logs" element={isDSI ? <LogsPage /> : <Navigate to="/" replace />} />
          <Route path="/backoffice/parametres" element={isDSI ? <ParametresPage /> : <Navigate to="/" replace />} />
        </Route>

        {/* 404 */}
        <Route element={<Layout />}>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  )
}
