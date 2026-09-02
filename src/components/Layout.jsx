import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Home, Sun, Moon, MessageSquarePlus, ArrowLeft } from 'lucide-react'
import FeedbackModal from './FeedbackModal'
import { useTheme } from '../context/ThemeContext'

export default function Layout({ children }) {
  const [showFeedback, setShowFeedback] = useState(false)
  const { theme, toggle } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const isHome = location.pathname === '/'

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#18181b]">
      <header className="hidden md:block sticky top-0 z-40 bg-white dark:bg-[#18181b] border-b border-[#f0f0f0] dark:border-[#2e2e36]">
        <div className="max-w-7xl mx-auto px-10 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-75 transition-opacity">
            <img src="/favicon.svg" alt="When2Meet" className="w-8 h-8" />
            <span className="font-extrabold text-lg tracking-tight text-[#111] dark:text-[#e4e4e7]">When2Meet</span>
          </Link>

          <div className="flex items-center gap-2">
            <button onClick={() => setShowFeedback(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold transition-all active:scale-95 bg-[#edfdf8] dark:bg-[#0f2e2a] text-[#0ecfb0] dark:text-[#0ab8a0] border border-[#a8f2e4]/30 dark:border-[#1a4a44]/30"
              style={{ borderRadius: '999px' }}
            >
              <MessageSquarePlus className="w-4 h-4" /> 피드백 보내기
            </button>
            <button onClick={toggle}
              className="w-9 h-9 flex items-center justify-center rounded-full transition-all bg-[#f5f5f5] dark:bg-[#2c2c35] text-[#888] dark:text-[#666]"
              aria-label="테마 전환"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <span className="px-3 py-2 text-xs font-bold text-[#999] dark:text-[#777]">게스트 모드</span>
          </div>
        </div>
      </header>

      <header className="md:hidden sticky top-0 z-40 bg-white dark:bg-[#18181b] border-b border-[#f0f0f0] dark:border-[#2e2e36]">
        <div className="max-w-lg mx-auto px-5 h-12 flex items-center justify-between">
          {!isHome ? (
            <button onClick={() => {
              if (window.history.length > 1) navigate(-1)
              else navigate('/')
            }}
              className="flex items-center gap-1 text-sm font-bold transition-opacity hover:opacity-60 text-[#111] dark:text-[#e4e4e7]"
            >
              <ArrowLeft className="w-4 h-4" /> 뒤로
            </button>
          ) : (
            <span className="flex items-center gap-2 font-extrabold text-base text-[#111] dark:text-[#e4e4e7]">
              <img src="/favicon.svg" alt="When2Meet" className="w-6 h-6" />
              When2Meet
            </span>
          )}
          <button onClick={toggle}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[#f5f5f5] dark:bg-[#2c2c35] text-[#888] dark:text-[#666]"
            aria-label="테마 전환"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      <main className="flex-1 w-full mx-auto px-5 pb-28 max-w-lg md:px-10 md:pb-10 md:max-w-7xl">
        {children}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#18181b] border-t border-[#f0f0f0] dark:border-[#2e2e36]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="max-w-lg mx-auto px-6 h-16 flex items-center justify-around relative">
          <Link to="/"
            className="flex flex-col items-center gap-0.5 transition-all active:scale-90"
            style={{ color: isHome ? 'var(--brand)' : '#bbb' }}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-extrabold">홈</span>
          </Link>

          <button onClick={() => setShowFeedback(true)}
            className="absolute left-1/2 -translate-x-1/2 -top-5 w-14 h-14 flex items-center justify-center text-white transition-all active:scale-90"
            style={{
              borderRadius: '999px',
              background: 'linear-gradient(135deg, var(--brand), var(--brand-hover))',
              boxShadow: '0 4px 20px var(--brand-shadow)',
            }}
            aria-label="피드백 보내기"
          >
            <MessageSquarePlus className="w-6 h-6" />
          </button>

          <span className="w-14" />

          <button onClick={toggle}
            className="flex flex-col items-center gap-0.5 active:scale-90 text-[#bbb] dark:text-[#555]"
            aria-label="테마 전환"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            <span className="text-[10px] font-extrabold">테마</span>
          </button>
        </div>
      </nav>

      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
    </div>
  )
}
