import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import CreateRoom from './components/CreateRoom'
import RoomPage from './components/RoomPage'
import WelcomePage from './components/WelcomePage'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Loader2 } from 'lucide-react'

function AppContent() {
  const { user, loading, guestMode, login, setGuestMode } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#0ecfb0]" />
      </div>
    )
  }

  // 로그인하지 않았고 + 게스트 모드도 비활성화 상태라면 웰컴 페이지 표시
  if (!user && !guestMode) {
    return <WelcomePage onLogin={login} onGuest={() => setGuestMode(true)} />
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<CreateRoom />} />
        <Route path="/room/:id" element={<RoomPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
