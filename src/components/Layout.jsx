import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Sun, Moon, MessageSquarePlus, ArrowLeft } from 'lucide-react'
import FeedbackModal from './FeedbackModal'
import { useTheme } from '../context/ThemeContext'

export default function Layout({ children }) {
  const [showFeedback, setShowFeedback] = useState(false)
  const { theme, toggle } = useTheme()
  const isHome = useLocation().pathname === '/'

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.focus() }}>본문으로 건너뛰기</a>
      <header className="site-header">
        <div className="header-inner">
          <Link to="/" className="wordmark" aria-label="When2Meet 홈"><span className="overlap-mark" aria-hidden="true"><i /><i /><i /></span><span>When2Meet</span></Link>
          <nav className="header-nav" aria-label="주 메뉴">
            {isHome ? <><button className="nav-link active" onClick={() => document.getElementById('open-create-meeting')?.click()}>새 일정</button><button className="nav-link" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>이용 방법</button></> : <Link to="/" className="nav-link flex items-center gap-2"><ArrowLeft size={15} /> 새 일정 만들기</Link>}
          </nav>
          <div className="header-actions">
            <button aria-label="의견 보내기" className="feedback-link" onClick={() => setShowFeedback(true)}><MessageSquarePlus size={16} /><span>의견 보내기</span></button>
            <span className="header-separator" />
            <button onClick={toggle} className="theme-button" aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
          </div>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className={`main-content${isHome ? ' home-main' : ''}`}>{children}</main>
      <footer className="site-footer"><span className="footer-wordmark">When2Meet</span><span>각자의 시간을, 한곳에.</span><button onClick={() => setShowFeedback(true)}>의견 보내기</button></footer>
      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
    </div>
  )
}
