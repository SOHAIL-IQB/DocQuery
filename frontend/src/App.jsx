import { Component, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider, useTheme } from '@/context/ThemeContext'
import { ProtectedRoute, PublicOnlyRoute } from '@/components/layout/RouteGuards'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import AppLayout from '@/components/layout/AppLayout'
import Landing from '@/pages/Landing'
import Auth from '@/pages/Auth'
import Dashboard from '@/pages/Dashboard'
import Chat from '@/pages/Chat'
import Settings from '@/pages/Settings'
import NotFound from '@/pages/NotFound'

const APP_NAME = 'DocQuery AI'
const TITLES = {
  '/': `${APP_NAME} — Ask your documents anything`,
  '/login': `Sign in · ${APP_NAME}`,
  '/signup': `Create account · ${APP_NAME}`,
  '/dashboard': `Dashboard · ${APP_NAME}`,
  '/settings': `Settings · ${APP_NAME}`,
}

function RouteMeta() {
  const { pathname } = useLocation()
  useEffect(() => {
    document.title = pathname.startsWith('/chat') ? `Chat · ${APP_NAME}` : TITLES[pathname] || APP_NAME
  }, [pathname])
  return null
}

class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error, info) {
    console.error('Unhandled UI error', error, info)
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="max-w-md text-sm text-muted-foreground">An unexpected error occurred. Reloading usually fixes it.</p>
        <pre className="max-w-lg overflow-auto rounded-lg bg-muted px-3 py-2 text-left text-xs text-muted-foreground">{String(this.state.error)}</pre>
        <Button onClick={() => window.location.reload()}>Reload</Button>
      </div>
    )
  }
}

function ThemedToaster() {
  const { resolved } = useTheme()
  return (
    <Toaster
      theme={resolved}
      position="bottom-right"
      toastOptions={{ classNames: { toast: '!rounded-xl !border-border !bg-popover !text-popover-foreground !shadow-xl', description: '!text-muted-foreground' } }}
    />
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <BrowserRouter>
              <RouteMeta />
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route element={<PublicOnlyRoute />}>
                  <Route path="/login" element={<Auth mode="login" />} />
                  <Route path="/signup" element={<Auth mode="signup" />} />
                  <Route path="/register" element={<Navigate to="/signup" replace />} />
                </Route>
                <Route element={<ProtectedRoute />}>
                  <Route element={<AppLayout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/chat" element={<Chat />} />
                    <Route path="/chat/:chatId" element={<Chat />} />
                    <Route path="/settings" element={<Settings />} />
                  </Route>
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
            <ThemedToaster />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
