import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import api from '@/lib/api'

const AuthContext = createContext(null)

const readStoredUser = () => {
  try {
    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')
    return token && user ? JSON.parse(user) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser)
  const [loading, setLoading] = useState(() => !!localStorage.getItem('token'))

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    api
      .get('/auth/me')
      .then(({ data }) => {
        setUser(data.data)
        localStorage.setItem('user', JSON.stringify(data.data))
      })
      .catch((err) => {
        // Only drop the session on an auth failure — not when the server is briefly unreachable.
        if (err.response?.status === 401) setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const onUnauthorized = () => setUser(null)
    window.addEventListener('auth:unauthorized', onUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized)
  }, [])

  const login = useCallback((token, userData) => {
    const { token: _t, ...profile } = userData
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(profile))
    setUser(profile)
  }, [])

  const updateUser = useCallback((profile) => {
    localStorage.setItem('user', JSON.stringify(profile))
    setUser(profile)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
