import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle, Calendar, CalendarDays, Clock, Link2,
  CheckCircle2, ArrowRight, Hash, PenLine, Loader2
} from 'lucide-react'
import DatePicker from './DatePicker'
import { createRoom, isSupabaseConfigured } from '../lib/supabase'
import { generateDateRange } from '../utils/timeUtils'
import { useAuth } from '../context/AuthContext'

const TIME_OPTIONS = Array.from({ length: 25 }, (_, i) => ({
  value: i,
  label: `${String(i).padStart(2, '0')}:00`,
}))

const STEPS = [
  { icon: CalendarDays, title: '방 만들기',  desc: '날짜 범위와 시간대를 설정해서 방을 생성해요.' },
  { icon: Link2,        title: '링크 공유',  desc: '생성된 링크를 팀원들에게 보내요.' },
  { icon: CheckCircle2, title: '결과 확인',  desc: '모두가 가능한 최적의 시간을 확인해요.' },
]

export default function CreateRoom() {
  const navigate = useNavigate()
  const { profile, syncSession } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', startDate: todayStr(), endDate: '', numDays: 7, startHour: 9, endHour: 24 })
  const [dateMode, setDateMode] = useState('numDays') // 'numDays' or 'range'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [recentRooms, setRecentRooms] = useState([])

  useEffect(() => {
    // 최근 방문한 방 불러오기 (로그인 유저는 클라우드 프로필 우선)
    if (profile) {
      setRecentRooms(profile.recent_rooms || [])
    } else {
      const recent = JSON.parse(localStorage.getItem('w2w-recent-rooms') || '[]')
      setRecentRooms(recent)
    }
  }, [profile])

  function todayStr() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.title.trim()) { setError('방 제목을 입력해주세요.'); return }
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
      
      // 소유한 방 목록 추출 및 동기화
      const owned = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('w2w-owner-') && localStorage.getItem(key) === 'true') {
          owned.push(key.replace('w2w-owner-', ''))
        }
      }
      await syncSession(null, owned).catch(err => console.error('Failed to sync on room create:', err))
      
      navigate(`/room/${room.id}`)
    } catch (err) {
      setError('방 생성에 실패했습니다.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // 날짜 범위 계산
  let previewDates = []
  if (dateMode === 'range' && form.endDate) {
    const start = new Date(form.startDate + 'T00:00:00')
    const end = new Date(form.endDate + 'T00:00:00')
    const numDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
    previewDates = numDays > 0 && numDays <= 30 ? generateDateRange(form.startDate, numDays) : []
  } else {
    previewDates = generateDateRange(form.startDate, form.numDays)
  }

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

  const FormContent = (
    <div className="space-y-4">
      <div>
        <label className="label"><PenLine className="w-3 h-3 inline mr-1" />회의 제목</label>
        <input type="text" className="input" placeholder="Ex) 프로젝트 킥오프 미팅"
          value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} maxLength={60}
        />
      </div>

      {/* 날짜 선택 모드 토글 */}
      <div>
        <label className="label"><Calendar className="w-3 h-3 inline mr-1" />날짜 선택 방식</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setDateMode('numDays')}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-semibold transition-all ${
              dateMode === 'numDays'
                ? 'bg-[#0ecfb0] text-white'
                : 'bg-[#f5f5f5] dark:bg-[#2a2a30] text-[#888] hover:bg-[#e8e8e8] dark:hover:bg-[#323238]'
            }`}
          >
            일수 선택
          </button>
          <button
            type="button"
            onClick={() => setDateMode('range')}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-semibold transition-all ${
              dateMode === 'range'
                ? 'bg-[#0ecfb0] text-white'
                : 'bg-[#f5f5f5] dark:bg-[#2a2a30] text-[#888] hover:bg-[#e8e8e8] dark:hover:bg-[#323238]'
            }`}
          >
            기간 선택
          </button>
        </div>
      </div>

      {dateMode === 'numDays' ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label"><Calendar className="w-3 h-3 inline mr-1" />시작 날짜</label>
              <DatePicker value={form.startDate} minDate={todayStr()} onChange={val => setForm(f => ({...f, startDate: val}))} />
            </div>
            <div>
              <label className="label"><Hash className="w-3 h-3 inline mr-1" />날짜 수</label>
              <select className="input" value={form.numDays} onChange={e => setForm(f => ({...f, numDays: Number(e.target.value)}))}>
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
                  type="button"
                  onClick={() => setForm(f => ({...f, numDays: days}))}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                    form.numDays === days
                      ? 'bg-[#edfdf8] dark:bg-[#0f2e2a] text-[#0ecfb0] border border-[#a8f2e4] dark:border-[#1a4a44]'
                      : 'bg-[#f5f5f5] dark:bg-[#2a2a30] text-[#888] hover:bg-[#e8e8e8] dark:hover:bg-[#323238]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label"><Calendar className="w-3 h-3 inline mr-1" />시작 날짜</label>
            <DatePicker value={form.startDate} minDate={form.startDate} onChange={val => setForm(f => ({...f, startDate: val}))} fullWidth />
          </div>
          <div>
            <label className="label"><Calendar className="w-3 h-3 inline mr-1" />종료 날짜</label>
            <DatePicker value={form.endDate} minDate={form.startDate} onChange={val => setForm(f => ({...f, endDate: val}))} fullWidth />
          </div>
        </div>
      )}

      {/* 날짜 미리보기 - 주별 그룹화 */}
      {previewDates.length > 0 && (
        <div>
          <label className="label text-xs">선택된 날짜 ({previewDates.length}일)</label>
          <div className="space-y-1.5 overflow-y-auto p-2 rounded-xl bg-[#f9f9f9] dark:bg-[#1a1a1f]"
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
                      className={`text-[10px] font-bold px-1.5 py-1 text-center ${
                        isSunday
                          ? 'bg-[#fff1f2] dark:bg-[#2d1a1d] text-[#e11d48] border border-[#fecdd3] dark:border-[#4a2028]'
                          : isSaturday
                          ? 'bg-[#eff6ff] dark:bg-[#1e293b] text-[#3b82f6] border border-[#bfdbfe] dark:border-[#334155]'
                          : 'bg-[#edfdf8] dark:bg-[#0f2e2a] text-[#0ecfb0] dark:text-[#0ab8a0] border border-[#a8f2e4] dark:border-[#1a4a44]'
                      }`}
                      style={{ borderRadius: '8px' }}
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
          <label className="label"><Clock className="w-3 h-3 inline mr-1" />시작 시간</label>
          <select className="input" value={form.startHour} onChange={e => setForm(f => ({...f, startHour: Number(e.target.value)}))}>
            {TIME_OPTIONS.slice(0,24).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label"><Clock className="w-3 h-3 inline mr-1" />종료 시간</label>
          <select className="input" value={form.endHour} onChange={e => setForm(f => ({...f, endHour: Number(e.target.value)}))}>
            {TIME_OPTIONS.slice(1).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 text-sm font-semibold"
          style={{ borderRadius: '999px', background: '#fff1f2', color: '#e11d48', border: '1.5px solid #fecdd3' }}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      <button onClick={handleSubmit} className="btn-primary w-full py-4 text-base"
        disabled={loading || !isSupabaseConfigured}
      >
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" />생성 중...</> : <>방 만들기<ArrowRight className="w-4 h-4" /></>}
      </button>
    </div>
  )

  return (
    <div className="pb-4">

      {/* ── PC 레이아웃 ── */}
      <div className="hidden md:block pt-12">
        <div className="grid gap-12 items-start" style={{ gridTemplateColumns: '1fr 1fr' }}>

          {/* 왼쪽: 소개 */}
          <div className="flex flex-col h-full">
            <p className="section-sub mb-2">Team Scheduler</p>
            <h1 className="text-5xl font-extrabold tracking-tight leading-tight mb-4 text-[#111] dark:text-[#e4e4e7]">
              모두의 일정을<br />한번에
            </h1>
            <p className="text-base font-medium mb-8 text-[#aaa]">
              방을 만들고 팀원에게 링크를 공유하세요.<br />
              모두가 가능한 최적의 시간을 찾아드립니다.
            </p>

            {/* 히어로 카드 */}
            <div className="rounded-3xl p-8 relative overflow-hidden mb-5 flex-shrink-0"
              style={{
                background: 'linear-gradient(145deg, #a8f2e4 0%, #0ecfb0 60%, #08b094 100%)',
                boxShadow: '0 8px 32px rgba(14,207,176,0.35)',
              }}
            >
              <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
              <div className="absolute -bottom-4 -left-4 w-28 h-28 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }} />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: 'rgba(255,255,255,0.25)' }}>
                  <CalendarDays className="w-6 h-6 text-white" />
                </div>
                <p className="font-extrabold text-white text-2xl leading-tight">팀 일정 조율,<br />더 쉽게</p>
                <p className="text-white/70 text-sm font-semibold mt-2">링크 하나로 모두의 가능 시간 수집</p>
              </div>
            </div>

            {/* 스텝 */}
            <div className="space-y-3 flex-1">
              {STEPS.map((s, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-[#f9f9f9] dark:bg-[#232329]">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#edfdf8] dark:bg-[#0f2e2a] border border-[#a8f2e4] dark:border-[#1a4a44]">
                    <s.icon className="w-4 h-4 text-[#0ecfb0] dark:text-[#0ab8a0]" />
                  </div>
                  <div>
                    <p className="font-extrabold text-base text-[#111] dark:text-[#e4e4e7]">{s.title}</p>
                    <p className="text-sm font-medium mt-0.5 text-[#aaa]">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* 최근 일정 */}
            {recentRooms.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-semibold mb-2 text-[#aaa]">최근 일정</p>
                <div className="space-y-2">
                  {recentRooms.slice(0, 3).map(room => (
                    <button
                      key={room.id || room}
                      onClick={() => navigate(`/room/${room.id || room}`)}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-[#f9f9f9] dark:bg-[#232329] hover:bg-[#f0f0f0] dark:hover:bg-[#2a2a30] transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#edfdf8] dark:bg-[#0f2e2a] flex-shrink-0">
                          <CalendarDays className="w-3.5 h-3.5 text-[#0ecfb0] dark:text-[#0ab8a0]" />
                        </div>
                        <p className="text-xs font-bold text-[#111] dark:text-[#e4e4e7] truncate">
                          {room.title || `방 ${(room.id || room).slice(0, 8)}...`}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#aaa] flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 오른쪽: 인라인 폼 */}
          <div className="card p-8">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#edfdf8] dark:bg-[#0f2e2a] border border-[#a8f2e4] dark:border-[#1a4a44]">
                <CalendarDays className="w-4 h-4 text-[#0ecfb0] dark:text-[#0ab8a0]" />
              </div>
              <p className="font-extrabold text-xl text-[#111] dark:text-[#e4e4e7]">방 만들기</p>
            </div>
            {!isSupabaseConfigured && (
              <div className="mb-4 p-3 rounded-2xl flex gap-2"
                style={{ background: '#fffbeb', border: '1.5px solid #fde68a' }}
              >
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs font-semibold text-amber-700">Supabase 미설정 — <code>.env.local</code>을 확인해주세요.</p>
              </div>
            )}
            {FormContent}
          </div>
        </div>
      </div>

      {/* ── 모바일 레이아웃 ── */}
      <div className="md:hidden">
        <div className="pt-2 pb-6">
          <p className="section-sub mb-1">Team Scheduler</p>
          <h1 className="section-title">모두의 일정을 한번에</h1>
        </div>

        {!isSupabaseConfigured && (
          <div className="mb-5 p-4 rounded-2xl flex gap-3"
            style={{ background: '#fffbeb', border: '1.5px solid #fde68a' }}
          >
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs font-semibold text-amber-700">Supabase 미설정</p>
          </div>
        )}

        {/* 히어로 카드 + 사이드 그리드 */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          <button onClick={() => setShowForm(true)}
            className="col-span-3 rounded-3xl p-5 text-left relative overflow-hidden transition-all active:scale-[0.97]"
            style={{
              background: 'linear-gradient(145deg, #a8f2e4 0%, #0ecfb0 60%, #08b094 100%)',
              minHeight: '200px',
              boxShadow: '0 6px 24px rgba(14,207,176,0.35)',
            }}
          >
            <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
            <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.25)' }}>
                <CalendarDays className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-extrabold text-white text-base leading-tight">방 만들기</p>
                <p className="text-white/70 text-xs font-semibold mt-1">날짜·시간 설정 후 팀원 초대</p>
              </div>
            </div>
          </button>

          <div className="col-span-2 flex flex-col gap-3">
            <div className="card flex-1 p-4 flex flex-col justify-between">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#edfdf8] dark:bg-[#0f2e2a] border border-[#a8f2e4] dark:border-[#1a4a44]">
                <Link2 className="w-4 h-4 text-[#0ecfb0] dark:text-[#0ab8a0]" />
              </div>
              <div>
                <p className="font-extrabold text-sm text-[#111] dark:text-[#e4e4e7]">링크 공유</p>
                <p className="text-xs font-medium mt-0.5 text-[#aaa]">팀원에게 전달</p>
              </div>
            </div>
            <div className="card flex-1 p-4 flex flex-col justify-between">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#edfdf8] dark:bg-[#0f2e2a] border border-[#a8f2e4] dark:border-[#1a4a44]">
                <CheckCircle2 className="w-4 h-4 text-[#0ecfb0] dark:text-[#0ab8a0]" />
              </div>
              <div>
                <p className="font-extrabold text-sm text-[#111] dark:text-[#e4e4e7]">결과 확인</p>
                <p className="text-xs font-medium mt-0.5 text-[#aaa]">최적 시간 발견</p>
              </div>
            </div>
          </div>
        </div>

        {/* 최근 일정 */}
        {recentRooms.length > 0 && (
          <div className="mb-6">
            <p className="section-sub mb-1">최근 일정</p>
            <p className="section-title text-lg mb-3">다시 들어가기</p>
            <div className="space-y-2">
              {recentRooms.map(room => (
                <button
                  key={room.id || room}
                  onClick={() => navigate(`/room/${room.id || room}`)}
                  className="w-full card p-4 flex items-center justify-between hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a30] transition-colors active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#edfdf8] dark:bg-[#0f2e2a] border border-[#a8f2e4] dark:border-[#1a4a44] flex-shrink-0">
                      <CalendarDays className="w-5 h-5 text-[#0ecfb0] dark:text-[#0ab8a0]" />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <p className="font-extrabold text-sm text-[#111] dark:text-[#e4e4e7] truncate">
                        {room.title || `방 ${(room.id || room).slice(0, 8)}...`}
                      </p>
                      <p className="text-xs font-medium text-[#aaa]">클릭하여 다시 입장</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-[#aaa] flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 이용 방법 */}
        <div className="mb-6">
          <p className="section-sub mb-1">When2Work 소개</p>
          <p className="section-title text-lg mb-3">이렇게 사용해요</p>
          <div className="card p-4 space-y-3">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#edfdf8] dark:bg-[#0f2e2a] border border-[#a8f2e4] dark:border-[#1a4a44]">
                  <s.icon className="w-3.5 h-3.5 text-[#0ecfb0] dark:text-[#0ab8a0]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-sm text-[#111] dark:text-[#e4e4e7]">{s.title}</p>
                  <p className="text-xs font-medium mt-0.5 text-[#aaa]">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 바텀시트 폼 */}
        {showForm && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center">
            <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}
              onClick={() => setShowForm(false)}
            />
            <div className="relative w-full max-w-lg bg-white dark:bg-[#232329] px-5 pt-6 pb-24"
              style={{ borderRadius: '28px 28px 0 0', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 -4px 40px rgba(0,0,0,0.12)' }}
            >
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-[#e0e0e0] dark:bg-[#444]" />
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center bg-[#edfdf8] dark:bg-[#0f2e2a] border border-[#a8f2e4] dark:border-[#1a4a44]">
                    <CalendarDays className="w-3.5 h-3.5 text-[#0ecfb0] dark:text-[#0ab8a0]" />
                  </div>
                  <p className="font-extrabold text-lg text-[#111] dark:text-[#e4e4e7]">방 만들기</p>
                </div>
                <button onClick={() => setShowForm(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full active:scale-90 bg-[#f5f5f5] dark:bg-[#232329] text-[#888]"
                  style={{ fontSize: '18px' }}
                >×</button>
              </div>
              {FormContent}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
