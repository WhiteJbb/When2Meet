import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { Copy, Check, RefreshCw, Save, CalendarDays, Clock3, Users, AlertCircle, Loader2, Trash2, Frown, Timer, BarChart2 } from 'lucide-react'
import { getRoom, getAvailabilities, upsertAvailability, deleteRoom } from '../lib/supabase'
import TimeGrid from './TimeGrid'
import ResultsView from './ResultsView'

export default function RoomPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [availabilities, setAvailabilities] = useState([])
  const [avLoading, setAvLoading] = useState(false)
  const [name, setName] = useState(() => localStorage.getItem('w2w-name') || '')
  const [selected, setSelected] = useState(() => {
    // localStorage에서 이 방의 선택 데이터 불러오기
    const saved = localStorage.getItem(`w2w-selected-${id}`)
    return saved ? new Set(JSON.parse(saved)) : new Set()
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [tab, setTab] = useState('input')
  const [copied, setCopied] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  
  // 방 생성자 확인
  const isOwner = localStorage.getItem(`w2w-owner-${id}`) === 'true'

  useEffect(() => {
    async function load() {
      try { setRoom(await getRoom(id)) }
      catch { setError('방을 찾을 수 없습니다.') }
      finally { setLoading(false) }
    }
    load()
    
    // 최근 방문한 방 저장 (방 정보 포함)
    if (id) {
      getRoom(id).then(roomData => {
        if (roomData) {
          const recentRooms = JSON.parse(localStorage.getItem('w2w-recent-rooms') || '[]')
          const roomInfo = { id, title: roomData.title, visitedAt: Date.now() }
          const newRecent = [roomInfo, ...recentRooms.filter(r => r.id !== id)].slice(0, 5)
          localStorage.setItem('w2w-recent-rooms', JSON.stringify(newRecent))
        }
      }).catch(() => {})
    }
  }, [id])

  // 튜토리얼 표시 여부 체크
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('w2w-tutorial-seen')
    if (!hasSeenTutorial && !loading && room) {
      setShowTutorial(true)
    }
  }, [loading, room])

  // 선택 상태를 localStorage에 저장
  useEffect(() => {
    if (id && selected.size > 0) {
      localStorage.setItem(`w2w-selected-${id}`, JSON.stringify([...selected]))
    }
  }, [id, selected])

  const loadAvailabilities = useCallback(async () => {
    if (!id) return
    setAvLoading(true)
    try {
      const data = await getAvailabilities(id)
      setAvailabilities(data)
      const myName = localStorage.getItem('w2w-name')
      if (myName) {
        const mine = data.find(d => d.name === myName)
        if (mine) setSelected(new Set(mine.slots))
      }
    } catch(e) { console.error(e) }
    finally { setAvLoading(false) }
  }, [id])

  useEffect(() => { loadAvailabilities() }, [loadAvailabilities])

  async function handleSave() {
    if (!name.trim()) { setSaveError('이름을 입력해주세요.'); return }
    setSaving(true); setSaveError('')
    try {
      localStorage.setItem('w2w-name', name.trim())
      await upsertAvailability({ room_id: id, name: name.trim(), slots: [...selected] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      await loadAvailabilities()
    } catch { setSaveError('저장에 실패했습니다.') }
    finally { setSaving(false) }
  }

  function handleCopy() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  async function handleDelete() {
    setDeleting(true)
    try { await deleteRoom(id); navigate('/') }
    catch { alert('삭제에 실패했습니다.') }
    finally { setDeleting(false); setShowDeleteConfirm(false) }
  }

  function closeTutorial(dontShowAgain = false) {
    if (dontShowAgain) {
      localStorage.setItem('w2w-tutorial-seen', 'true')
    }
    setShowTutorial(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#0ecfb0' }} />
    </div>
  )

  if (error || !room) return (
    <div className="max-w-md mx-auto text-center py-16">
      <Frown className="w-12 h-12 mx-auto mb-4" style={{ color: '#ccc' }} />
      <h2 className="text-xl font-extrabold mb-2">방을 찾을 수 없어요</h2>
      <p className="text-sm font-medium mb-6" style={{ color: '#aaa' }}>{error}</p>
      <a href="/" className="btn-primary">홈으로 돌아가기</a>
    </div>
  )

  return (
    <div className="space-y-5 pt-2">

      {/* ── 방 타이틀 ── */}
      <div>
        <p className="section-sub mb-0.5">진행 중인 일정 조율</p>
        <div className="flex items-start justify-between gap-3">
          <h1 className="section-title leading-tight flex-1 min-w-0 truncate">{room.title}</h1>
          <div className="flex gap-1.5 flex-shrink-0 mt-1">
            <button onClick={handleCopy}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-bold transition-all active:scale-95 ${
                copied
                  ? 'bg-[#edfdf8] dark:bg-[#0f2e2a] text-[#0ecfb0] dark:text-[#0ab8a0] border border-[#a8f2e4] dark:border-[#1a4a44]'
                  : 'bg-[#f5f5f5] dark:bg-[#2c2c35] text-[#888] dark:text-[#777] border border-[#ebebeb] dark:border-[#3a3a45]'
              }`}
              style={{ borderRadius: '999px' }}
            >
              {copied ? <><Check className="w-3.5 h-3.5"/>복사됨</> : <><Copy className="w-3.5 h-3.5"/>링크 복사</>}
            </button>
            {isOwner && (
              <button onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold active:scale-95 transition-all bg-[#fff1f2] dark:bg-[#2d1a1d] text-[#e11d48] border border-[#fecdd3] dark:border-[#4a2028]"
                style={{ borderRadius: '999px' }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 정보 태그 */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          <span className="text-xs font-bold px-2.5 py-1 flex items-center gap-1 bg-[#edfdf8] dark:bg-[#0f2e2a] text-[#0ecfb0] dark:text-[#0ab8a0] border border-[#a8f2e4] dark:border-[#1a4a44]"
            style={{ borderRadius:'999px' }}>
            <CalendarDays className="w-3 h-3" /> {room.dates[0]} ~ {room.dates[room.dates.length-1]}
          </span>
          <span className="text-xs font-bold px-2.5 py-1 flex items-center gap-1 bg-[#f5f5f5] dark:bg-[#2c2c35] text-[#888] dark:text-[#666] border border-[#ebebeb] dark:border-[#3a3a45]"
            style={{ borderRadius:'999px' }}>
            <Clock3 className="w-3 h-3" /> {room.time_start}:00 ~ {room.time_end}:00
          </span>
          <span className="text-xs font-bold px-2.5 py-1 flex items-center gap-1 bg-[#f5f5f5] dark:bg-[#2c2c35] text-[#888] dark:text-[#666] border border-[#ebebeb] dark:border-[#3a3a45]"
            style={{ borderRadius:'999px' }}>
            <Users className="w-3 h-3" /> {availabilities.length}명 응답
          </span>
        </div>
      </div>

      {/* ── 탭 ── */}
      <div className="flex gap-2">
        {[
          { id: 'input',   label: '내 시간 입력', icon: Timer },
          { id: 'results', label: '결과 보기', icon: BarChart2, badge: availabilities.length > 0 ? availabilities.length : null },
        ].map(t => (
          <button key={t.id}
            onClick={() => { setTab(t.id); if (t.id === 'results') loadAvailabilities() }}
            className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-extrabold transition-all active:scale-95 ${
              tab === t.id
                ? 'text-white'
                : 'bg-[#f5f5f5] dark:bg-[#2c2c35] text-[#aaa] dark:text-[#666] border border-[#ebebeb] dark:border-[#3a3a45]'
            }`}
            style={tab === t.id ? {
              borderRadius: '999px', background: 'var(--brand)',
              boxShadow: '0 4px 14px var(--brand-shadow)',
            } : { borderRadius: '999px' }}
          >
            {t.icon && <t.icon className="w-3.5 h-3.5" />}
            {t.label}
            {t.badge && (
              <span className="text-xs px-1.5 py-0.5 font-extrabold"
                style={{ borderRadius: '999px',
                  background: tab === t.id ? 'rgba(255,255,255,0.3)' : '#e0e0e0',
                  color: tab === t.id ? '#fff' : '#888' }}
              >
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── 삭제 확인 ── */}
      {showDeleteConfirm && createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-4"
          style={{ 
            background: 'rgba(0,0,0,0.35)', 
            backdropFilter: 'blur(6px)',
            zIndex: 9999
          }}
        >
          <div className="card p-6 max-w-sm w-full">
            <p className="text-4xl mb-3">🗑️</p>
            <h3 className="text-lg font-extrabold mb-1">방을 삭제할까요?</h3>
            <p className="text-sm font-medium mb-5" style={{ color: '#aaa' }}>참여자 데이터가 모두 삭제되며 복구할 수 없어요.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} disabled={deleting} className="btn-secondary flex-1">취소</button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 btn-primary"
                style={{ background: '#e11d48', boxShadow: '0 4px 14px rgba(225,29,72,0.4)' }}
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin"/> : '삭제하기'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── 사용법 튜토리얼 ── */}
      {showTutorial && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
          onClick={() => closeTutorial(false)}
        >
          <div className="card p-6 max-w-lg w-full relative animate-in" 
            style={{ animation: 'slideUp 0.3s ease-out' }}
            onClick={e => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="flex items-start gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(145deg, #a8f2e4 0%, #0ecfb0 100%)' }}
              >
                <Timer className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-extrabold mb-1 text-[#111] dark:text-[#e4e4e7]">시간 선택 방법</h3>
                <p className="text-sm font-medium text-[#aaa]">가능한 시간을 쉽게 입력하세요</p>
              </div>
            </div>

            {/* 스텝 */}
            <div className="space-y-4 mb-6">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 font-extrabold text-sm"
                  style={{ background: '#edfdf8', color: '#0ecfb0', border: '2px solid #a8f2e4' }}
                >
                  1
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="font-extrabold text-sm mb-1 text-[#111] dark:text-[#e4e4e7]">편리한 시간 선택</p>
                  <p className="text-xs font-medium text-[#888]">
                    PC에서는 마우스로 드래그하여 범위를 선택할 수 있습니다. 
                    모바일에서는 간단히 탭하여 칸을 켜고 끌 수 있으며, 
                    <strong>0.25초간 길게 누른 후 문지르면</strong> 범위 선택이 가능합니다.
                  </p>
                  <p className="text-xs font-medium mt-1.5 text-[#666]">
                    💡 화면 이동: PC는 휠/드래그, 모바일은 일반적인 화면 스와이프로 부드럽게 스크롤됩니다.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 font-extrabold text-sm"
                  style={{ background: '#edfdf8', color: '#0ecfb0', border: '2px solid #a8f2e4' }}
                >
                  2
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="font-extrabold text-sm mb-1 text-[#111] dark:text-[#e4e4e7]">여러 날짜 선택 가능</p>
                  <p className="text-xs font-medium text-[#888]">
                    각 날짜별로 다른 시간대를 선택할 수 있어요. 
                    날짜를 넘나들며 자유롭게 드래그하세요.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 font-extrabold text-sm"
                  style={{ background: '#edfdf8', color: '#0ecfb0', border: '2px solid #a8f2e4' }}
                >
                  3
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="font-extrabold text-sm mb-1 text-[#111] dark:text-[#e4e4e7]">이름 입력 후 저장</p>
                  <p className="text-xs font-medium text-[#888]">
                    시간 선택이 끝나면 이름을 입력하고 저장 버튼을 눌러주세요. 
                    같은 이름으로 다시 저장하면 업데이트돼요.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 font-extrabold text-sm"
                  style={{ background: '#fff1f2', color: '#e11d48', border: '2px solid #fecdd3' }}
                >
                  💡
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="font-extrabold text-sm mb-1 text-[#111] dark:text-[#e4e4e7]">결과 보기 탭</p>
                  <p className="text-xs font-medium text-[#888]">
                    모든 참여자의 응답을 확인하고 가장 많은 사람이 가능한 시간을 찾아보세요!
                  </p>
                </div>
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => closeTutorial(true)}
                className="btn-primary w-full py-3"
              >
                알겠어요, 시작할게요!
              </button>
              <button 
                onClick={() => closeTutorial(false)}
                className="btn-secondary w-full py-2 text-sm"
              >
                다음에 다시 보기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 입력 탭 ── */}
      {tab === 'input' && (
        <div className="space-y-4">
          <div className="card p-5">
            <label className="label">내 이름</label>
            <div className="flex gap-2">
              <input type="text" className="input flex-1" placeholder="홍길동"
                value={name} onChange={e => setName(e.target.value)} maxLength={20}
              />
              <button onClick={handleSave} disabled={saving || selected.size === 0} className="btn-primary flex-shrink-0">
                {saving ? <Loader2 className="w-4 h-4 animate-spin"/>
                  : saved ? <><Check className="w-4 h-4"/>저장됨</>
                  : <><Save className="w-4 h-4"/>저장</>}
              </button>
            </div>
            {saveError && (
              <p className="mt-2 text-xs font-semibold flex items-center gap-1.5 px-3 py-2"
                style={{ borderRadius:'999px', background:'#fff1f2', color:'#e11d48' }}
              >
                <AlertCircle className="w-3.5 h-3.5"/> {saveError}
              </p>
            )}
            {selected.size > 0 && (
              <p className="mt-2 text-xs font-bold flex items-center gap-1" style={{ color:'#0ecfb0' }}>
                <Check className="w-3 h-3" /> {selected.size}개 슬롯 ({Math.floor(selected.size/2)}시간 {selected.size%2*30>0?'30분':''}) 선택됨
              </p>
            )}
          </div>

          <div className="space-y-1.5 px-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold flex-1" style={{ color:'#bbb' }}>
                원하는 시간대를 드래그하거나 탭하여 선택하세요. (모바일은 길게 눌러 드래그)
              </p>
              {selected.size > 0 && (
                <button onClick={() => {
                  setSelected(new Set())
                  localStorage.removeItem(`w2w-selected-${id}`)
                }} className="btn-secondary text-xs py-1.5 px-3 flex-shrink-0">
                  <RefreshCw className="w-3 h-3"/> 초기화
                </button>
              )}
            </div>
            <p className="text-[10px] font-medium" style={{ color:'#888' }}>
              💡 화면 스크롤: 모바일에서는 화면을 일반적인 스와이프로 밀어서 이동할 수 있습니다.
            </p>
          </div>

          <TimeGrid mode="select" dates={room.dates} startHour={room.time_start} endHour={room.time_end}
            selected={selected} onSelectionChange={setSelected}
          />
        </div>
      )}

      {/* ── 결과 탭 ── */}
      {tab === 'results' && (
        avLoading
          ? <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color:'#0ecfb0' }}/>
            </div>
          : <ResultsView room={room} availabilities={availabilities}/>
      )}
    </div>
  )
}
