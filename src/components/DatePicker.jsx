import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

function toDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function fromDateStr(str) {
  return new Date(str + 'T00:00:00')
}

export default function DatePicker({ id, value, onChange, minDate, fullWidth = false, inline = false }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const min = minDate ? fromDateStr(minDate) : today

  const selected = value ? fromDateStr(value) : null

  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(selected?.getFullYear() ?? today.getFullYear())
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? today.getMonth())

  const containerRef = useRef(null)
  const [position, setPosition] = useState('left')

  // 바깥 클릭 시 닫기
  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // 캘린더 위치 조정 (고정 너비일 때만)
  useEffect(() => {
    if (open && containerRef.current && !fullWidth) {
      const rect = containerRef.current.getBoundingClientRect()
      const calendarWidth = 320 // w-80 = 20rem = 320px
      const spaceRight = window.innerWidth - rect.right
      const spaceLeft = rect.left
      
      // 오른쪽 공간이 부족하고 왼쪽에 공간이 있으면 right 정렬
      if (spaceRight < calendarWidth && spaceLeft >= calendarWidth) {
        setPosition('right')
      } else {
        setPosition('left')
      }
    }
  }, [open, fullWidth])

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate()
  }

  function getFirstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay() // 0=일 ~ 6=토
  }

  function handleSelect(day) {
    const date = new Date(viewYear, viewMonth, day)
    if (date < min) return
    onChange(toDateStr(date))
    setOpen(false)
  }

  // 달력 격자 생성
  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth)
  const cells = [] // null = 빈 칸
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  // 6주 채우기
  while (cells.length % 7 !== 0) cells.push(null)

  function isSameDay(day) {
    if (!selected || !day) return false
    return selected.getFullYear() === viewYear &&
           selected.getMonth() === viewMonth &&
           selected.getDate() === day
  }

  function isToday(day) {
    if (!day) return false
    return today.getFullYear() === viewYear &&
           today.getMonth() === viewMonth &&
           today.getDate() === day
  }

  function isDisabled(day) {
    if (!day) return true
    return new Date(viewYear, viewMonth, day) < min
  }

  // 표시용 텍스트
  const displayText = selected
    ? `${selected.getFullYear()}년 ${selected.getMonth() + 1}월 ${selected.getDate()}일`
    : '날짜 선택'

  return (
    <div ref={containerRef} className="relative" onKeyDown={e => { if (e.key === 'Escape' && open) { e.preventDefault(); e.stopPropagation(); setOpen(false); containerRef.current?.querySelector('button').focus() } }}>
      {/* 트리거 버튼 */}
      <button
        type="button"
        id={id}
        aria-expanded={open}
        aria-controls={id ? `${id}-calendar` : undefined}
        onClick={() => setOpen(o => !o)}
        className="input flex items-center justify-between gap-2 cursor-pointer text-left"
      >
        <span className={selected ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}>
          {displayText}
        </span>
        <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
      </button>

      {/* 달력 팝업 */}
      {open && (
        <div id={id ? `${id}-calendar` : undefined} className={`${inline ? 'relative' : 'absolute top-full'} mt-2 z-50 card shadow-xl p-4 animate-in ${
          inline ? 'w-full' : fullWidth
            ? 'left-0 right-0' 
            : `w-[min(20rem,calc(100vw-5.5rem))] ${position === 'right' ? 'right-0' : 'left-0'}`
        }`}>
          {/* 월 네비게이션 */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              aria-label="이전 달"
              onClick={prevMonth}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-semibold text-base">
              {viewYear}년 {MONTHS[viewMonth]}
            </span>
            <button
              type="button"
              aria-label="다음 달"
              onClick={nextMonth}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 mb-2">
            {WEEKDAYS.map((w, i) => (
              <div
                key={w}
                className={`text-center text-xs font-semibold py-2
                  ${i === 0 ? 'text-[var(--sunday)]' : i === 6 ? 'text-[var(--saturday)]' : 'text-slate-400 dark:text-slate-500'}`}
              >
                {w}
              </div>
            ))}
          </div>

          {/* 날짜 격자 */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, idx) => {
              const disabled = isDisabled(day)
              const selected_ = isSameDay(day)
              const today_ = isToday(day)
              const col = idx % 7
              const isSun = col === 0
              const isSat = col === 6

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={disabled || !day}
                  aria-label={day ? `${viewYear}년 ${viewMonth + 1}월 ${day}일` : undefined}
                  aria-pressed={selected_}
                  onClick={() => day && handleSelect(day)}
                  className={`
                    aspect-square rounded-lg text-sm font-semibold transition-colors
                    ${!day ? 'invisible' : ''}
                    ${selected_
                      ? 'bg-brand-600 text-white'
                      : today_
                      ? 'ring-2 ring-brand-400 text-brand-600 dark:text-brand-400'
                      : disabled
                      ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                      : isSun
                      ? 'text-[var(--sunday)] hover:bg-slate-100 dark:hover:bg-slate-800'
                      : isSat
                      ? 'text-[var(--saturday)] hover:bg-slate-100 dark:hover:bg-slate-800'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }
                  `}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {/* 오늘 버튼 */}
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setViewYear(today.getFullYear())
                setViewMonth(today.getMonth())
                if (today >= min) { onChange(toDateStr(today)); setOpen(false) }
              }}
              className="w-full py-2.5 rounded-lg text-sm font-semibold
                         bg-brand-50 dark:bg-brand-900/20
                         text-brand-600 dark:text-brand-400
                         hover:bg-brand-100 dark:hover:bg-brand-900/40
                         transition-colors"
            >
              오늘로 이동
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
