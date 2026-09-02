import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import CreateRoom from './components/CreateRoom'
import RoomPage from './components/RoomPage'

export default function App() {
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
