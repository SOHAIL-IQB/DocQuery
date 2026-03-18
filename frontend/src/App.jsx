import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PublicRoute, ProtectedRoute } from './components/layout/RouteGuards';
import AppLayout from './components/layout/AppLayout';
import ChatWorkspace from './pages/ChatWorkspace';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';

const APP_NAME = 'DocQuery AI';

const RouteMeta = () => {
  const { pathname } = useLocation();

  React.useEffect(() => {
    let title = APP_NAME;

    if (pathname === '/' || pathname === '/login') {
      title = `Login | ${APP_NAME}`;
    } else if (pathname === '/signup' || pathname === '/register') {
      title = `Create Account | ${APP_NAME}`;
    } else if (pathname === '/dashboard') {
      title = `Dashboard | ${APP_NAME}`;
    } else if (pathname.startsWith('/chat')) {
      title = `Chat Workspace | ${APP_NAME}`;
    } else if (pathname === '/settings') {
      title = `Settings | ${APP_NAME}`;
    }

    document.title = title;
  }, [pathname]);

  return null;
};


class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ errorInfo });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "40px", backgroundColor: "#fff", color: "#000", zIndex: 99999 }}>
          <h2>Application Crashed</h2>
          <pre>{this.state.error?.toString()}</pre>
          <pre style={{ fontSize: "12px", whiteSpace: "pre-wrap" }}>{this.state.errorInfo?.componentStack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <RouteMeta />
          <Routes>
            {/* Public Routes (Only accessible if NOT logged in) */}
            <Route element={<PublicRoute />}>
              <Route path="/" element={<Login />} />
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="/signup" element={<Register />} />
              <Route path="/register" element={<Navigate to="/signup" replace />} />
            </Route>

            {/* Protected Application Routes wrapped in AppLayout */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/chat" element={<ChatWorkspace />} />
                <Route path="/chat/:chatId" element={<ChatWorkspace />} />
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
