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
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

export function PublicOnlyRoute() {
  const { user, loading } = useAuth()
  if (loading && !user) return <Splash />
  if (user) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
