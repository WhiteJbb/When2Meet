import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { API_BASE, getAuthConfig, getCurrentUser, logout as logoutApi } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [kakaoEnabled, setKakaoEnabled] = useState(false)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const [auth, config] = await Promise.all([getCurrentUser(), getAuthConfig()])
      setUser(auth.user || null)
      setKakaoEnabled(Boolean(config.kakao_login))
    } catch {
      setUser(null)
      setKakaoEnabled(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const login = useCallback(() => {
    window.location.assign(`${API_BASE}/auth/kakao`)
  }, [])

  const logout = useCallback(async () => {
    await logoutApi()
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, kakaoEnabled, loading, login, logout, refresh }), [user, kakaoEnabled, loading, login, logout, refresh])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
