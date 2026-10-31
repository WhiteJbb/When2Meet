import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { Copy, Check, RefreshCw, Save, CalendarDays, Clock3, Users, AlertCircle, Loader2, Trash2, Frown, Timer, BarChart2 } from 'lucide-react'
import { getRoom, getAvailabilities, upsertAvailability, deleteRoom, getResponseToken } from '../lib/api'
import TimeGrid from './TimeGrid'
import ResultsView from './ResultsView'

function readDraft(id) {
  try {
    const draft = JSON.parse(localStorage.getItem(`w2w-draft-${id}`))
    if (draft && typeof draft.name === 'string' && Array.isArray(draft.slots)) return draft
    const slots = JSON.parse(localStorage.getItem(`w2w-selected-${id}`))
    return slots?.length ? { name: localStorage.getItem('w2w-name') || '', slots, unavailable: false } : null
  } catch { return null }
}

export default function RoomPage() {
  const { id } = useParams()
  return <RoomContent key={id} id={id} />
}

function RoomContent({ id }) {
  const navigate = useNavigate()
  const shareUrl = new URL(`share/${encodeURIComponent(id)}`, `${window.location.origin}${import.meta.env.BASE_URL}`).href

  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [availabilities, setAvailabilities] = useState([])
  const [avLoading, setAvLoading] = useState(false)
  const [draft] = useState(() => readDraft(id))
  const [responseToken] = useState(() => getResponseToken(id))
  const [name, setName] = useState(() => draft?.name ?? localStorage.getItem('w2w-name') ?? '')
  const [selected, setSelected] = useState(() => new Set(draft?.slots || []))
  const [unavailable, setUnavailable] = useState(draft?.unavailable || false)
  const [hasEdits, setHasEdits] = useState(!!draft)
  const [savedResponse, setSavedResponse] = useState(null)
  const touched = useRef(!!draft)
  const [copyFallback, setCopyFallback] = useState(false)
  const copyInput = useRef(null)
  const [avError, setAvError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [tab, setTab] = useState('input')
  const [copied, setCopied] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  
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
      getRoom(id).then((roomData) => {
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

  // Keep the draft separate from submitted responses, including an empty selection.
  useEffect(() => {
    if (hasEdits) localStorage.setItem(`w2w-draft-${id}`, JSON.stringify({ name, slots: [...selected], unavailable }))
  }, [id, name, selected, unavailable, hasEdits])

  function markEdited() {
    touched.current = true
    setHasEdits(true)
    setSaved(false)
    setSaveError('')
  }

  function changeSelection(next) {
    markEdited()
    setUnavailable(false)
    setSelected(next)
  }

  const loadAvailabilities = useCallback(async () => {
    setAvLoading(true)
    setAvError('')
    try {
      const data = await getAvailabilities(id, responseToken)
      setAvailabilities(data)
      setSavedResponse(data.find(entry => entry.is_mine) || null)
      return data
    } catch {
      setAvError('응답을 불러오지 못했어요. 다시 시도해주세요.')
      return null
    } finally { setAvLoading(false) }
  }, [id, responseToken])

  useEffect(() => {
    let active = true
    loadAvailabilities().then(data => {
      if (!active || touched.current) return
      const mine = data?.find(entry => entry.is_mine)
      if (mine) {
        setName(mine.name)
        setSelected(new Set(mine.slots))
        setUnavailable(mine.slots.length === 0)
      }
    })
    return () => { active = false }
  }, [loadAvailabilities])

  useEffect(() => {
    if (copyFallback) {
      copyInput.current?.focus()
      copyInput.current?.select()
    }
  }, [copyFallback])

  async function handleSave() {
    if (!name.trim()) { setSaveError('이름을 입력해주세요.'); return }
    if (!unavailable && selected.size === 0) { setSaveError('시간을 선택하거나 ‘가능한 시간이 없어요’를 선택해주세요.'); return }
    setSaving(true); setSaveError('')
    try {
      const response = await upsertAvailability({ room_id: id, name: name.trim(), slots: unavailable ? [] : [...selected], responseToken })
      localStorage.setItem('w2w-name', name.trim())
      localStorage.removeItem(`w2w-draft-${id}`)
      localStorage.removeItem(`w2w-selected-${id}`)
      setSavedResponse({ ...response, is_mine: true })
      setHasEdits(false)
      setSaved(true)
      await loadAvailabilities()
    } catch (error) { setSaveError(error.message || '저장하지 못했어요. 다시 시도해주세요.') }
    finally { setSaving(false) }
  }

  async function handleCopy() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setCopyFallback(false)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopyFallback(true)
      copyInput.current?.focus()
      copyInput.current?.select()
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try { 
      const ownerToken = localStorage.getItem(`w2w-owner-token-${id}`)
      await deleteRoom(id, ownerToken)
      localStorage.removeItem(`w2w-owner-${id}`)
      localStorage.removeItem(`w2w-owner-token-${id}`)
      
      const recentRooms = JSON.parse(localStorage.getItem('w2w-recent-rooms') || '[]')
      const filteredRecent = recentRooms.filter(r => r.id !== id)
      localStorage.setItem('w2w-recent-rooms', JSON.stringify(filteredRecent))
      
      navigate('/')
    }
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
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand)' }} />
    </div>
  )

  if (error || !room) return (
    <div className="max-w-md mx-auto text-center py-16">
      <Frown className="w-12 h-12 mx-auto mb-4" style={{ color: '#ccc' }} />
      <h2 className="text-xl font-extrabold mb-2">방을 찾을 수 없어요</h2>
      <p className="text-sm font-medium mb-6" style={{ color: 'var(--muted)' }}>{error}</p>
      <a href="/" className="btn-primary">홈으로 돌아가기</a>
    </div>
  )

  return (
    <div className="room-page space-y-6">

      {/* ── 방 타이틀 ── */}
      <div>
        <p className="section-sub mb-0.5">진행 중인 일정 조율</p>
        <div className="flex items-start justify-between gap-3">
          <h1 className="section-title leading-tight flex-1 min-w-0 truncate">{room.title}</h1>
          <div className="flex gap-1.5 flex-shrink-0 mt-1">
            <button onClick={handleCopy} className="btn-secondary room-copy" aria-live="polite">
              {copied ? <><Check className="w-3.5 h-3.5"/>복사됨</> : <><Copy className="w-3.5 h-3.5"/>링크 복사</>}
            </button>
            {isOwner && (
              <button aria-label="일정 삭제" onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold active:scale-95 transition-all bg-[#fff1f2] dark:bg-[#2d1a1d] text-[#e11d48] border border-[#fecdd3] dark:border-[#4a2028]"
                style={{ borderRadius: '999px' }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="room-meta">
          <span><CalendarDays size={14} /> {room.dates[0].replaceAll('-', '.')} — {room.dates[room.dates.length - 1].replaceAll('-', '.')}</span>
          <span><Clock3 size={14} /> {String(room.time_start).padStart(2, '0')}:00–{String(room.time_end).padStart(2, '0')}:00</span>
          <span><Users size={14} /> {availabilities.length}명 응답</span>
        </div>
      </div>

      {copyFallback && (
        <div className="card p-4">
          <label htmlFor="invite-link" className="label">초대 링크</label>
          <p role="status" className="text-sm text-muted mb-2">자동으로 복사할 수 없어요. 아래 주소를 길게 누르거나 Ctrl+C / ⌘C로 복사해주세요.</p>
          <input ref={copyInput} id="invite-link" className="input" readOnly value={shareUrl} onFocus={event => event.target.select()} />
        </div>
      )}

      {avError && <p role="alert" className="text-sm text-muted">{avError} <button className="underline" onClick={loadAvailabilities}>다시 불러오기</button></p>}

      {/* ── 탭 ── */}
      <div className="room-tabs" aria-label="일정 화면">
        {[
          { id: 'input',   label: '내 시간 입력', icon: Timer },
          { id: 'results', label: '결과 보기', icon: BarChart2, badge: availabilities.length > 0 ? availabilities.length : null },
        ].map(t => (
          <button key={t.id}
            onClick={() => { setTab(t.id); if (t.id === 'results') loadAvailabilities() }}
            className="room-tab" aria-pressed={tab === t.id}
          >
            {t.icon && <t.icon className="w-3.5 h-3.5" />}
            {t.label}
            {t.badge && (
              <span className="tab-count">
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
            <p className="text-sm font-medium mb-5" style={{ color: 'var(--muted)' }}>참여자 데이터가 모두 삭제되며 복구할 수 없어요.</p>
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
          <div className="card p-6 max-w-lg w-full relative animate-in max-h-[calc(100dvh-2rem)] overflow-y-auto"
            style={{ animation: 'slideUp 0.3s ease-out' }}
            onClick={e => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="flex items-start gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--brand)' }}
              >
                <Timer className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-extrabold mb-1 text-[#111] dark:text-[#e4e4e7]">시간 선택 방법</h3>
                <p className="text-sm font-medium text-[#7b7488]">가능한 시간을 쉽게 입력하세요</p>
              </div>
            </div>

            {/* 스텝 */}
            <div className="space-y-4 mb-6">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 font-extrabold text-sm"
                  style={{ background: 'var(--brand-bg)', color: 'var(--brand)', border: '1px solid var(--brand-border)' }}
                >
                  1
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="font-extrabold text-sm mb-1 text-[#111] dark:text-[#e4e4e7]">편리한 시간 선택</p>
                  <p className="text-xs font-medium text-[#888]">
                    PC에서는 마우스로 드래그하여 범위를 선택할 수 있습니다. 
                    모바일에서는 칸을 탭해 선택하고, 밀어서 시간표를 이동해요.
                    여러 칸을 한 번에 고르려면 <strong>범위 선택</strong>을 켜주세요.
                  </p>
                  <p className="text-xs font-medium mt-1.5 text-[#666]">
                    키보드로는 방향키로 이동하고 Space로 선택할 수 있어요.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 font-extrabold text-sm"
                  style={{ background: 'var(--brand-bg)', color: 'var(--brand)', border: '1px solid var(--brand-border)' }}
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
                  style={{ background: 'var(--brand-bg)', color: 'var(--brand)', border: '1px solid var(--brand-border)' }}
                >
                  3
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="font-extrabold text-sm mb-1 text-[#111] dark:text-[#e4e4e7]">이름 입력 후 저장</p>
                  <p className="text-xs font-medium text-[#888]">
                    시간 선택이 끝나면 이름을 입력하고 저장 버튼을 눌러주세요. 
                    같은 브라우저에서 다시 열면 내 응답을 수정할 수 있어요.
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
        <fieldset disabled={saving} className="space-y-4 min-w-0">
          <div className="card p-5">
            <label htmlFor="participant-name" className="label">내 이름</label>
            <div className="flex gap-2">
              <input id="participant-name" type="text" className="input flex-1" placeholder="참여자에게 보여줄 이름"
                value={name} onChange={e => { markEdited(); setName(e.target.value) }} maxLength={20}
              />
              <button onClick={handleSave} disabled={saving || !hasEdits || (!unavailable && selected.size === 0)} className="btn-primary flex-shrink-0">
                {saving ? <Loader2 className="w-4 h-4 animate-spin"/>
                  : saved ? <><Check className="w-4 h-4"/>저장됨</>
                  : <><Save className="w-4 h-4"/>저장</>}
              </button>
            </div>
            <p role="status" className="mt-3 text-xs text-muted">
              {hasEdits ? '저장하지 않은 변경사항이 있어요.' : savedResponse ? '응답이 저장되어 있어요.' : '가능한 시간을 선택한 뒤 저장해주세요.'}
            </p>
            <p className="mt-2 text-xs text-muted">내 응답은 이 브라우저에서 다시 열어 수정할 수 있어요.</p>
            {!savedResponse && availabilities.some(entry => entry.name === name.trim()) && (
              <p className="mt-2 text-xs text-muted">같은 이름의 응답이 있어요. 기존 응답은 그대로 두고 새 응답으로 저장해요. 구분하기 쉬운 이름을 사용해주세요.</p>
            )}
            <label className="flex items-center gap-2 mt-4 text-sm cursor-pointer">
              <input type="checkbox" checked={unavailable} onChange={event => {
                markEdited()
                setUnavailable(event.target.checked)
                if (event.target.checked) setSelected(new Set())
              }} className="w-4 h-4 accent-[var(--brand)]" />
              가능한 시간이 없어요
            </label>
            {saveError && (
              <p role="alert" className="mt-2 text-xs font-semibold flex items-center gap-1.5 px-3 py-2"
                style={{ borderRadius:'999px', background:'#fff1f2', color:'#e11d48' }}
              >
                <AlertCircle className="w-3.5 h-3.5"/> {saveError}
              </p>
            )}
            <p className="mt-2 min-h-4 text-xs font-bold flex items-center gap-1" style={{ color:'var(--brand)' }}>
              {selected.size > 0 && <><Check className="w-3 h-3" /> {selected.size}칸 · 총 {selected.size * 30}분 선택</>}
            </p>
          </div>

          <div className="space-y-1.5 px-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold flex-1" style={{ color:'var(--muted)' }}>
                가능한 시간을 탭하거나 마우스로 드래그해 선택하세요.
              </p>
              <button disabled={selected.size === 0} onClick={() => changeSelection(new Set())}
                className="btn-secondary text-xs py-1.5 px-3 flex-shrink-0">
                <RefreshCw className="w-3 h-3"/> 초기화
              </button>
            </div>
            <p className="text-[10px] font-medium" style={{ color:'#888' }}>
              선택한 시간은 저장을 눌러야 다른 참여자에게 보여요.
            </p>
          </div>

          <TimeGrid mode="select" dates={room.dates} startHour={room.time_start} endHour={room.time_end}
            selected={selected} onSelectionChange={changeSelection} disabled={saving}
          />
        </fieldset>
      )}

      {/* ── 결과 탭 ── */}
      {tab === 'results' && (
        avLoading
          ? <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color:'var(--brand)' }}/>
            </div>
          : <ResultsView room={room} availabilities={availabilities}/>
      )}
    </div>
  )
}
