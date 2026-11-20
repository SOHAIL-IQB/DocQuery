import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { LogoMark } from '@/components/brand/Logo'

function Splash() {
  return (
    <div className="flex h-dvh items-center justify-center">
      <LogoMark className="size-10 animate-pulse" />
    </div>
  )
}

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading && !user) return <Splash />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return <Outlet />
}

export function PublicOnlyRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading && !user) return <Splash />
  // After signing in, return to the page the user originally asked for.
  if (user) return <Navigate to={safeRedirect(location.state?.from)} replace />
  return <Outlet />
}

// Only allow in-app paths, never another origin.
// eslint-disable-next-line react-refresh/only-export-components
export function safeRedirect(path) {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') ? path : '/dashboard'
}
