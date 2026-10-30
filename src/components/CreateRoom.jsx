import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle, ArrowRight, Clock3, Link2, Check, Loader2, X
} from 'lucide-react'
import DatePicker from './DatePicker'
import { createRoom } from '../lib/api'
import { generateDateRange } from '../utils/timeUtils'

const TIME_OPTIONS = Array.from({ length: 25 }, (_, i) => ({
  value: i,
  label: `${String(i).padStart(2, '0')}:00`,
}))


export default function CreateRoom() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ title: '', startDate: todayStr(), endDate: '', numDays: 7, startHour: 9, endHour: 24 })
  const [dateMode, setDateMode] = useState('numDays') // 'numDays' or 'range'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [recentRooms, setRecentRooms] = useState([])
  const [sheetOpen, setSheetOpen] = useState(false)
  const sheetRef = useRef(null)

  useEffect(() => {
    const sheet = sheetRef.current
    if (!sheetOpen || !sheet) return
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    sheet.showModal()
    return () => {
      sheet.close()
      document.body.style.overflow = overflow
    }
  }, [sheetOpen])

  useEffect(() => {
    // 이 브라우저에서 방문한 일정
    const recent = JSON.parse(localStorage.getItem('w2w-recent-rooms') || '[]')
    setRecentRooms(recent)
  }, [])

  function todayStr() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.title.trim()) { setError('일정 제목을 입력해주세요.'); return }
    if (dateMode === 'range' && !form.endDate) { setError('종료 날짜를 선택해주세요.'); return }
    if (form.startHour >= form.endHour) { setError('종료 시간은 시작 시간보다 늦어야 합니다.'); return }
    
    // 날짜 범위 계산
    let numDays = form.numDays
    if (dateMode === 'range' && form.endDate) {
      const start = new Date(form.startDate + 'T00:00:00')
      const end = new Date(form.endDate + 'T00:00:00')
      numDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
      if (numDays < 1) { setError('종료일은 시작일보다 늦어야 합니다.'); return }
      if (numDays > 30) { setError('최대 30일까지 선택 가능합니다.'); return }
    }
    
    setLoading(true)
    try {
      const dates = generateDateRange(form.startDate, numDays)
      const room = await createRoom({ title: form.title.trim(), dates, time_start: form.startHour, time_end: form.endHour })
      
      // 방 생성자 토큰 저장
      localStorage.setItem(`w2w-owner-${room.id}`, 'true')
      if (room.owner_token) {
        localStorage.setItem(`w2w-owner-token-${room.id}`, room.owner_token)
      }
      
      navigate(`/room/${room.id}`)
    } catch (err) {
      setError('일정을 만들지 못했습니다. 다시 시도해주세요.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // 날짜 범위 계산
  let previewDates = []
  if (dateMode === 'numDays') {
    previewDates = generateDateRange(form.startDate, form.numDays)
  } else if (form.endDate) {
    const start = new Date(form.startDate + 'T00:00:00')
    const end = new Date(form.endDate + 'T00:00:00')
    const numDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
    previewDates = numDays > 0 && numDays <= 30 ? generateDateRange(form.startDate, numDays) : []
  }

  const previewStart = previewDates[0]
  const previewEnd = previewDates[previewDates.length - 1]
  const previewRange = previewDates.length > 0
    ? new Intl.DateTimeFormat('ko-KR', {
        month: 'long', day: 'numeric',
        year: previewStart.slice(0, 4) !== previewEnd.slice(0, 4) ? 'numeric' : undefined,
      }).formatRange(new Date(previewStart + 'T00:00:00'), new Date(previewEnd + 'T00:00:00'))
    : '기간을 선택해주세요'

  // 주별로 날짜 그룹화 (8일 이상일 때만)
  const groupedByWeek = []
  if (previewDates.length >= 8) {
    // 첫 날짜의 요일 확인
    const firstDate = new Date(previewDates[0] + 'T00:00:00')
    const firstDayOfWeek = firstDate.getDay() // 0=일, 1=월, ..., 6=토
    
    let currentWeek = []
    
    // 첫 주의 앞부분을 빈 칸으로 채우기
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push(null)
    }
    
    // 날짜 배치
    previewDates.forEach((d) => {
      currentWeek.push(d)
      
      // 토요일이거나 7칸이 차면 다음 주로
      if (currentWeek.length === 7) {
        groupedByWeek.push([...currentWeek])
        currentWeek = []
      }
    })
    
    // 마지막 주가 남아있으면 추가
    if (currentWeek.length > 0) {
      // 마지막 주의 뒷부분을 빈 칸으로 채우기
      while (currentWeek.length < 7) {
        currentWeek.push(null)
      }
      groupedByWeek.push(currentWeek)
    }
  } else {
    // 7일 이하면 한 줄로
    if (previewDates.length > 0) {
      groupedByWeek.push(previewDates)
    }
  }

  const FormActions = (
    <>
      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm mb-3"
          style={{ background: '#fff1f2', color: '#e11d48' }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}
      <button type="submit" form="meeting-form" className="btn-primary w-full py-3.5" disabled={loading}>
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" />생성 중...</> : <>일정 만들기<ArrowRight className="w-4 h-4" /></>}
      </button>
    </>
  )

  const FormContent = (
    <form id="meeting-form" onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="meeting-title" className="label">일정 이름</label>
        <input id="meeting-title" required type="text" className="input" placeholder="예: 오랜만에 저녁 모임"
          value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} maxLength={60}
        />
      </div>

      {/* 날짜 선택 모드 토글 */}
      <div>
        <label className="label">날짜 선택 방식</label>
        <div className="date-mode">
          <button
            type="button"
            aria-pressed={dateMode === 'numDays'}
            onClick={() => setDateMode('numDays')}
            className="date-mode-option"
          >
            시작일 + 일수
          </button>
          <button
            type="button"
            aria-pressed={dateMode === 'range'}
            onClick={() => setDateMode('range')}
            className="date-mode-option"
          >
            시작일 + 종료일
          </button>
        </div>
      </div>

      {dateMode === 'numDays' ? (
        <>
          <div className="date-fields grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="start-date" className="label">시작 날짜</label>
              <DatePicker inline id="start-date" value={form.startDate} minDate={todayStr()} onChange={val => setForm(f => ({...f, startDate: val}))} />
            </div>
            <div>
              <label htmlFor="day-count" className="label">날짜 수</label>
              <select id="day-count" className="input" value={form.numDays} onChange={e => setForm(f => ({...f, numDays: Number(e.target.value)}))}>
                {Array.from({length: 30}, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>{n}일</option>
                ))}
              </select>
            </div>
          </div>

          {/* 빠른 선택 버튼 */}
          <div>
            <label className="label text-xs">빠른 선택</label>
            <div className="flex gap-2">
              {[
                { label: '1주', days: 7 },
                { label: '2주', days: 14 },
                { label: '3주', days: 21 },
                { label: '4주', days: 28 }
              ].map(({ label, days }) => (
                <button
                  key={days}
                  aria-pressed={form.numDays === days}
                  type="button"
                  onClick={() => setForm(f => ({...f, numDays: days}))}
                  className="quick-days"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="date-fields grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="start-date" className="label">시작 날짜</label>
            <DatePicker inline id="start-date" value={form.startDate} minDate={todayStr()} onChange={val => setForm(f => ({...f, startDate: val}))} fullWidth />
          </div>
          <div>
            <label htmlFor="end-date" className="label">종료 날짜</label>
            <DatePicker inline id="end-date" value={form.endDate} minDate={form.startDate} onChange={val => setForm(f => ({...f, endDate: val}))} fullWidth />
          </div>
        </div>
      )}

      {/* 날짜 미리보기 - 주별 그룹화 */}
      {previewDates.length > 0 && (
        <div>
          <label className="label text-xs">선택된 날짜 ({previewDates.length}일)</label>
          <div className="candidate-dates space-y-1.5 overflow-y-auto"
            style={{ maxHeight: groupedByWeek.length <= 4 ? 'none' : '280px' }}
          >
            {groupedByWeek.map((week, weekIdx) => (
              <div key={weekIdx} className="grid grid-cols-7 gap-1">
                {week.map((d, idx) => {
                  // 빈 칸 처리
                  if (!d) {
                    return <div key={`empty-${weekIdx}-${idx}`} />
                  }
                  
                  const date = new Date(d + 'T00:00:00')
                  const days = ['일','월','화','수','목','금','토']
                  const dayOfWeek = date.getDay()
                  const isSunday = dayOfWeek === 0
                  const isSaturday = dayOfWeek === 6
                  
                  return (
                    <span key={d}
                      className={`candidate-day ${isSaturday ? 'weekday-saturday' : isSunday ? 'weekday-sunday' : ''}`}
                    >
                      {date.getMonth()+1}/{date.getDate()}<br/>({days[dayOfWeek]})
                    </span>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="start-hour" className="label">시작 시간</label>
          <select id="start-hour" className="input" value={form.startHour} onChange={e => setForm(f => ({...f, startHour: Number(e.target.value)}))}>
            {TIME_OPTIONS.slice(0,24).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="end-hour" className="label">종료 시간</label>
          <select id="end-hour" className="input" value={form.endHour} onChange={e => setForm(f => ({...f, endHour: Number(e.target.value)}))}>
            {TIME_OPTIONS.slice(1).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

    </form>
  )

  return (
    <div className="home-page">
      <section className="service-intro" aria-labelledby="hero-heading">
        <div className="intro-inner">
          <div className="intro-copy">
            <p className="intro-eyebrow">우리, 언제 만날까요?</p>
            <h1 id="hero-heading">만날 시간,<br /><span>함께 정해요.</span></h1>
            <p className="intro-description">“언제 시간 돼?”는 짧게,<br />함께하는 시간은 길게.</p>
            <div className="intro-actions">
              <button id="open-create-meeting" type="button" className="btn-primary intro-create-button" aria-haspopup="dialog"
                onClick={() => setSheetOpen(true)}>일정 만들기<ArrowRight size={20} /></button>
              <button type="button" className="intro-guide-link" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>어떻게 쓰나요?</button>
            </div>
            <span className="service-caption">가입 없이 무료로. 링크 하나면 초대 끝.</span>
          </div>
          <figure className="gathering-scene" aria-labelledby="gathering-caption">
            <div className="gathering-photo">
              <img src="/images/dinner.jpg" width="1000" height="1500" alt="식탁에 둘러앉아 저녁을 함께하는 사람들" fetchpriority="high" />
              <span className="photo-note">좋은 날은, 같이.</span>
            </div>
            <div className="chat-bubble chat-question"><span className="chat-name">우리 단톡방</span><p>다들 이번 주에 밥 먹을래?</p><span className="chat-time">오후 2:03</span></div>
            <div className="chat-bubble chat-answer"><p>좋아! 언제가 편해?</p><span className="chat-time">오후 2:04</span></div>
            <div className="sample-invite">
              <div className="sample-invite-top"><span className="sample-invite-icon"><Link2 size={18} /></span><span>When2Meet <small>초대가 도착했어요</small></span><ArrowRight size={18} /></div>
              <strong>오랜만에, 저녁 한 끼.</strong>
              <p>이번 주 중 편한 시간을 골라줘!</p>
              <div className="sample-invite-bottom"><span>가능한 시간 모으는 중</span><span className="sample-people" aria-hidden="true"><i /><i /><i /></span></div>
            </div>
            <figcaption id="gathering-caption">이렇게 약속이 시작돼요 · 초대 예시</figcaption>
          </figure>
        </div>
      </section>

      <dialog ref={sheetRef} className="create-sheet" aria-labelledby="sheet-heading"
        onCancel={event => { event.preventDefault(); if (!loading) setSheetOpen(false) }}
        onClick={event => { if (event.target === event.currentTarget && !loading) setSheetOpen(false) }}>
        <div className="create-sheet-panel">
          <header className="create-sheet-header">
            <div><h2 id="sheet-heading">새 일정 만들기</h2><p>날짜와 시간 범위를 정해주세요.</p></div>
            <button type="button" autoFocus className="create-sheet-close" aria-label="일정 만들기 닫기"
              disabled={loading} onClick={() => setSheetOpen(false)}><X size={21} /></button>
          </header>
          <div className="create-sheet-body">{FormContent}</div>
          <footer className="create-sheet-footer">
            <p className="create-sheet-summary">{previewRange}{previewDates.length > 0 ? ` · ${previewDates.length}일` : ''}<span>{String(form.startHour).padStart(2, '0')}:00–{String(form.endHour).padStart(2, '0')}:00</span></p>
            {FormActions}
          </footer>
        </div>
      </dialog>

      <div className="home-details">
        <section className="recent-section" aria-labelledby="recent-heading">
          <div className="recent-heading"><h2 id="recent-heading">최근 일정</h2><span>이 브라우저에서 방문한 일정</span></div>
          {recentRooms.length > 0 ? (
            <div className="recent-cards">
              {recentRooms.slice(0, 5).map(room => (
                <button type="button" className="recent-card" key={room.id || room} onClick={() => navigate(`/room/${room.id || room}`)}>
                  <span className="recent-card-heading">
                    <span className="recent-card-icon" aria-hidden="true"><Clock3 size={18} /></span>
                    <span className="recent-card-title">{room.title || `일정 ${(room.id || room).slice(0, 8)}`}</span>
                  </span>
                  <span className="recent-card-footer">일정 열기<ArrowRight size={17} aria-hidden="true" /></span>
                </button>
              ))}
            </div>
          ) : <div className="recent-empty"><Clock3 size={21} /><p>아직 방문한 일정이 없어요.<span>참여한 일정은 여기에 표시됩니다.</span></p></div>}
        </section>

        <section id="how-it-works" className="guide-section" aria-labelledby="guide-heading">
          <div className="guide-heading"><p>만나는 일만 남도록.</p><h2 id="guide-heading">복잡한 조율은 줄이고,<br />약속은 가볍게.</h2></div>
          <ol className="guide-steps">
            <li>
              <div className="guide-demo demo-link" aria-hidden="true"><Link2 size={19} /><span>우리의 다음 약속</span><span className="demo-link-action">링크 공유 <ArrowRight size={13} /></span></div>
              <span className="guide-number">01</span><h3>링크 하나로 모여요.</h3><p>후보 날짜와 시간을 정하고,<br />함께할 사람들에게 링크를 보내세요.</p>
            </li>
            <li>
              <div className="guide-demo demo-times" aria-hidden="true"><span>나는 이때 괜찮아!</span><div>{[0,1,2,3,4,5,6,7,8,9,10,11].map(n => <i key={n} className={[2,3,5,6,7,10].includes(n) ? 'selected' : ''}>{[3,6,10].includes(n) && <Check size={13} />}</i>)}</div></div>
              <span className="guide-number">02</span><h3>되는 시간을 골라요.</h3><p>이름을 적고 가능한 시간을 선택하세요.<br />누구나 가입 없이 참여할 수 있어요.</p>
            </li>
            <li>
              <div className="guide-demo demo-result" aria-hidden="true"><span className="demo-check"><Check size={20} /></span><div><small>우리 모두 되는 시간</small><strong>토요일, 저녁 7시</strong></div></div>
              <span className="guide-number">03</span><h3>겹치는 때를 한눈에.</h3><p>가장 많이 겹치는 시간을 확인하고,<br />모두에게 좋은 날을 정하세요.</p>
            </li>
          </ol>
        </section>
        <div className="closing-invite"><p>미뤄둔 약속, 이제 잡아볼까요?</p><button type="button" className="btn-primary" aria-haspopup="dialog" onClick={() => setSheetOpen(true)}>일정 만들기<ArrowRight size={18} /></button></div>
      </div>
    </div>
  )
}
