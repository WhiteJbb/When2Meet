import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, getUserProfile, upsertUserProfile, isSupabaseConfigured } from '../lib/supabase'

const AuthContext = createContext({
  user: null,
  profile: null,
  loading: true,
  guestMode: false,
  setGuestMode: () => {},
  login: () => {},
  logout: () => {},
  syncSession: () => {}
})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [guestMode, setGuestModeState] = useState(() => {
    return localStorage.getItem('w2w-guest-mode') === 'true'
  })

  const setGuestMode = useCallback((val) => {
    setGuestModeState(val)
    if (val) {
      localStorage.setItem('w2w-guest-mode', 'true')
    } else {
      localStorage.removeItem('w2w-guest-mode')
    }
  }, [])

  // 로컬 데이터를 클라우드 프로필에 병합(마이그레이션)
  const migrateLocalDataToCloud = useCallback(async (userId, kakaoName) => {
    try {
      // 1. 기존 DB 프로필 조회
      let cloudProfile = await getUserProfile(userId)
      
      // 2. 로컬 데이터 추출
      const localRecent = JSON.parse(localStorage.getItem('w2w-recent-rooms') || '[]')
      const localOwned = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('w2w-owner-') && localStorage.getItem(key) === 'true') {
          localOwned.push(key.replace('w2w-owner-', ''))
        }
      }

      if (!cloudProfile) {
        // 신규 유저: 로컬 데이터를 클라우드에 최초 등록
        cloudProfile = await upsertUserProfile({
          id: userId,
          name: kakaoName,
          recent_rooms: localRecent,
          owned_rooms: localOwned,
          updated_at: new Date().toISOString()
        })
      } else {
        // 기존 유저: 클라우드와 로컬 데이터를 영리하게 병합
        const cloudRecent = cloudProfile.recent_rooms || []
        const cloudOwned = cloudProfile.owned_rooms || []

        // 최근 방 목록 병합 (중복 제거 및 최신 순 정렬)
        const recentMap = new Map()
        localRecent.forEach(r => { if (r && r.id) recentMap.set(r.id, r) })
        cloudRecent.forEach(r => { if (r && r.id) recentMap.set(r.id, r) })
        const mergedRecent = Array.from(recentMap.values())
          .sort((a, b) => (b.visitedAt || 0) - (a.visitedAt || 0))
          .slice(0, 5)

        // 방장 권한 병합
        const mergedOwned = Array.from(new Set([...localOwned, ...cloudOwned]))

        cloudProfile = await upsertUserProfile({
          id: userId,
          name: kakaoName || cloudProfile.name,
          recent_rooms: mergedRecent,
          owned_rooms: mergedOwned,
          updated_at: new Date().toISOString()
        })
      }

      setProfile(cloudProfile)

      // 3. 로컬스토리지를 클라우드에서 가져온 데이터로 동기화
      localStorage.setItem('w2w-recent-rooms', JSON.stringify(cloudProfile.recent_rooms))
      cloudProfile.owned_rooms.forEach(roomId => {
        localStorage.setItem(`w2w-owner-${roomId}`, 'true')
      })

    } catch (err) {
      console.error('Failed to migrate local data to cloud:', err)
    }
  }, [])

  // 세션 강제 동기화 (방 생성/방 방문/방 삭제 시 호출)
  const syncSession = useCallback(async (customRecent = null, customOwned = null) => {
    if (!user || !isSupabaseConfigured) return

    try {
      const recent = customRecent || JSON.parse(localStorage.getItem('w2w-recent-rooms') || '[]')
      let owned = customOwned
      if (!owned) {
        owned = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith('w2w-owner-') && localStorage.getItem(key) === 'true') {
            owned.push(key.replace('w2w-owner-', ''))
          }
        }
      }

      const updated = await upsertUserProfile({
        id: user.id,
        name: user.user_metadata?.full_name || user.user_metadata?.name || profile?.name || '사용자',
        recent_rooms: recent,
        owned_rooms: owned,
        updated_at: new Date().toISOString()
      })
      setProfile(updated)
    } catch (err) {
      console.error('Failed to sync session to cloud:', err)
    }
  }, [user, profile])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    // 1. 현재 사용자 세션 가져오기
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) {
        const name = user.user_metadata?.full_name || user.user_metadata?.name || '사용자'
        migrateLocalDataToCloud(user.id, name).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    }).catch(() => setLoading(false))

    // 2. 인증 상태 변화 리슨
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        const name = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || '사용자'
        migrateLocalDataToCloud(currentUser.id, name)
      } else {
        setProfile(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [migrateLocalDataToCloud])

  const login = useCallback(async () => {
    if (!isSupabaseConfigured) return
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: window.location.origin + window.location.pathname
      }
    })
    if (error) console.error('OAuth Login Error:', error)
  }, [])

  const logout = useCallback(async () => {
    if (!isSupabaseConfigured) return
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setGuestMode(false)
    // 로그아웃 시 로컬스토리지는 유지하되 게스트모드 리셋
    localStorage.removeItem('w2w-guest-mode')
  }, [setGuestMode])

  return (
    <AuthContext.Provider value={{ user, profile, loading, guestMode, setGuestMode, login, logout, syncSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
