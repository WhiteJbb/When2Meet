import { useEffect, useRef, useState } from 'react'
import { generateTimeSlots, formatDateHeader, formatDateFull, slotId } from '../utils/timeUtils'

export default function TimeGrid({
  mode = 'select', dates, startHour, endHour,
  selected = new Set(), onSelectionChange, disabled = false,
  heatmap = {}, totalParticipants = 0, onCellHover,
}) {
  const timeSlots = generateTimeSlots(startHour, endHour)

  const [rangeSelection, setRangeSelection] = useState(false)
  const [activeCell, setActiveCell] = useState(null)
  const [keyboardFocus, setKeyboardFocus] = useState(true)
  const suppressClick = useRef(false)
  const isDragging = useRef(false)
  const dragMode = useRef('add')
  const gridRef = useRef(null)
  const containerRef = useRef(null)
  const startPosRef = useRef(null) // 드래그 시작 위치

  function getPosFromPoint(clientX, clientY) {
    if (!gridRef.current) return null
    const dateCols = [...gridRef.current.querySelectorAll('[data-date-col]')]
    let dateStr = null
    for (const col of dateCols) {
      const r = col.getBoundingClientRect()
      if (clientX >= r.left && clientX < r.right) { dateStr = col.dataset.dateCol; break }
    }
    if (!dateStr) return null
    const cells = [...gridRef.current.querySelectorAll(`[data-date-col="${dateStr}"] [data-cell-id]`)]
    for (let i = 0; i < cells.length; i++) {
      const r = cells[i].getBoundingClientRect()
      if (clientY >= r.top && clientY < r.bottom) return { dateStr, rowIdx: i }
    }
    if (cells.length === 0) return null
    if (clientY < cells[0].getBoundingClientRect().top) return { dateStr, rowIdx: 0 }
    if (clientY >= cells[cells.length-1].getBoundingClientRect().bottom) return { dateStr, rowIdx: cells.length-1 }
    return null
  }

  function applyTo(clientX, clientY) {
    const pos = getPosFromPoint(clientX, clientY)
    if (!pos) return
    const start = startPosRef.current
    
    if (!start) return
    
    // 시작점과 현재점 사이의 모든 셀 선택 (사각형 영역)
    const dateStartIdx = dates.indexOf(start.dateStr)
    const dateEndIdx = dates.indexOf(pos.dateStr)
    const rowStart = start.rowIdx
    const rowEnd = pos.rowIdx
    
    const minDateIdx = Math.min(dateStartIdx, dateEndIdx)
    const maxDateIdx = Math.max(dateStartIdx, dateEndIdx)
    const minRow = Math.min(rowStart, rowEnd)
    const maxRow = Math.max(rowStart, rowEnd)
    
    const ids = []
    // 사각형 영역의 모든 셀 추가
    for (let d = minDateIdx; d <= maxDateIdx; d++) {
      for (let r = minRow; r <= maxRow; r++) {
        ids.push(slotId(dates[d], timeSlots[r]))
      }
    }
    
    onSelectionChange(prev => {
      const next = new Set(prev)
      for (const id of ids) dragMode.current === 'add' ? next.add(id) : next.delete(id)
      return next
    })
  }

  function toggleCell(id) {
    if (mode !== 'select' || disabled) return
    onSelectionChange(previous => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handlePointerDown(event, id) {
    suppressClick.current = false
    if (mode !== 'select' || disabled || !event.isPrimary || event.button !== 0) return
    if (event.pointerType === 'touch' && !rangeSelection) return
    event.preventDefault()
    event.currentTarget.focus({ preventScroll: true })
    event.currentTarget.setPointerCapture(event.pointerId)
    suppressClick.current = true
    isDragging.current = true
    dragMode.current = selected.has(id) ? 'remove' : 'add'
    const [dateStr, time] = id.split('|')
    startPosRef.current = { dateStr, rowIdx: timeSlots.indexOf(time) }
    toggleCell(id)
  }

  function handlePointerMove(event) {
    if (!isDragging.current || disabled) return
    applyTo(event.clientX, event.clientY)
    const container = containerRef.current
    const rect = container.getBoundingClientRect()
    if (event.clientX < rect.left + 70) container.scrollLeft -= 10
    else if (event.clientX > rect.right - 30) container.scrollLeft += 10
    if (event.clientY < rect.top + 64) container.scrollTop -= 10
    else if (event.clientY > rect.bottom - 30) container.scrollTop += 10
  }

  useEffect(() => {
    const stop = () => { isDragging.current = false }
    const showKeyboardFocus = () => setKeyboardFocus(true)
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
    window.addEventListener('keydown', showKeyboardFocus, true)
    return () => {
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
      window.removeEventListener('keydown', showKeyboardFocus, true)
    }
  }, [])

  function handleKeyDown(event, date, row) {
    let column = dates.indexOf(date)
    let nextRow = row
    switch (event.key) {
      case 'ArrowLeft': column--; break
      case 'ArrowRight': column++; break
      case 'ArrowUp': nextRow--; break
      case 'ArrowDown': nextRow++; break
      case 'Home': nextRow = 0; break
      case 'End': nextRow = timeSlots.length - 1; break
      default: return
    }
    event.preventDefault()
    column = Math.max(0, Math.min(dates.length - 1, column))
    nextRow = Math.max(0, Math.min(timeSlots.length - 1, nextRow))
    const id = slotId(dates[column], timeSlots[nextRow])
    const cell = gridRef.current.querySelector(`[data-cell-id="${id}"]`)
    cell?.focus({ preventScroll: true })
    cell?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    const bounds = cell?.getBoundingClientRect()
    const container = containerRef.current.getBoundingClientRect()
    if (bounds && bounds.left < container.left + 70) containerRef.current.scrollLeft -= container.left + 70 - bounds.left
    if (bounds && bounds.top < container.top + 64) containerRef.current.scrollTop -= container.top + 64 - bounds.top
  }

  const CELL_H = 32

  const c = {
    border: 'var(--line)', header: 'var(--surface)', timeCol: 'var(--soft)',
    hourLine: 'var(--line)', halfLine: 'var(--soft)', colLine: 'var(--line)',
    cellEven: 'var(--surface)', cellOdd: 'var(--soft)',
    timeText: 'var(--muted)', dayText: 'var(--text)',
  }

  function getCellBg(date, time, hourIndex) {
    const id = slotId(date, time)
    if (mode === 'select') {
      if (selected.has(id)) return { background: 'var(--brand)' }
      return { background: hourIndex % 2 === 0 ? c.cellEven : c.cellOdd }
    }
    const names = heatmap[id] || []
    const ratio = totalParticipants > 0 ? names.length / totalParticipants : 0
    if (ratio === 0) return { background: hourIndex % 2 === 0 ? c.cellEven : c.cellOdd }
    return { background: `rgba(var(--brand-rgb),${0.12 + ratio * 0.78})` }
  }

  return (
    <div className="space-y-2">
      {mode === 'select' && <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
        <button type="button" className="btn-secondary text-xs px-3 py-2" aria-pressed={rangeSelection}
          disabled={disabled} onClick={() => setRangeSelection(value => !value)}>
          범위 선택 {rangeSelection ? '켜짐' : '꺼짐'}
        </button>
        <span>{rangeSelection ? '밀어서 여러 칸을 선택해요. 이동하려면 범위 선택을 꺼주세요.' : '모바일: 탭으로 선택 · 밀어서 이동'}</span>
        <span className="sr-only">키보드: 방향키로 이동, Space 또는 Enter로 선택</span>
      </div>}
    <div ref={containerRef} className="overflow-auto time-grid-scroll"
      data-keyboard-focus={keyboardFocus}
      onPointerDownCapture={() => setKeyboardFocus(false)}
      style={{ borderRadius: '8px', border: `1.5px solid ${c.border}` }}
    >
      <div ref={gridRef} className="relative" onPointerMove={handlePointerMove}
        style={{ minWidth: `${dates.length*64+70}px` }}
      >
        {/* 헤더 */}
        <div className="flex sticky top-0 z-20"
          style={{ background: c.header, borderBottom: `2px solid ${c.hourLine}` }}
        >
          <div className="w-[70px] flex-shrink-0 sticky left-0 z-30" style={{ background: c.header }}/>
          {dates.map(d => {
            const { weekday, month, day, isSunday, isSaturday } = formatDateHeader(d)
            const textColor = isSaturday ? 'var(--saturday)' : isSunday ? 'var(--sunday)' : c.dayText
            return (
              <div key={d} className="flex-1 min-w-[64px] text-center py-3"
                style={{ borderLeft: `1.5px solid ${c.colLine}` }}
              >
                <p className="text-sm font-extrabold" style={{ color: textColor }}>{weekday}</p>
                <p className="text-xs mt-0.5 font-semibold" style={{ color: textColor }}>{month}/{day}</p>
              </div>
            )
          })}
        </div>

        {/* 바디 그리드 */}
        <div className="flex">
          <div className="w-[70px] flex-shrink-0 sticky left-0 z-10"
            style={{ 
              background: c.timeCol, 
              borderRight: `2px solid ${c.hourLine}`
            }}
          >
            {timeSlots.map((time, idx) => (
              <div key={time} className="relative"
                style={{ height:`${CELL_H}px`, borderTop: idx>0&&idx%2===0 ? `2px solid ${c.hourLine}` : undefined }}
              >
                {idx%2===0 && (
                  <span className="absolute top-1 right-3 text-[11px] font-bold leading-none"
                    style={{ color: c.timeText }}
                  >{time}</span>
                )}
              </div>
            ))}
          </div>

          {dates.map(date => (
            <div key={date} data-date-col={date} className="flex-1 min-w-[64px]"
              style={{ borderLeft: `1.5px solid ${c.colLine}` }}
            >
              {timeSlots.map((time, idx) => {
                const id = slotId(date, time)
                const hourIndex = Math.floor(idx/2)
                const isHourStart = idx%2===0
                return (
                  <button type="button" key={time} data-cell-id={id}
                    disabled={disabled}
                    tabIndex={(activeCell || slotId(dates[0], timeSlots[0])) === id ? 0 : -1}
                    aria-pressed={mode === 'select' ? selected.has(id) : undefined}
                    aria-label={`${date.slice(0, 4)}년 ${formatDateFull(date)} ${time} ~ ${timeSlots[idx + 1] || `${String(endHour).padStart(2, '0')}:00`}${mode === 'results' ? `, ${(heatmap[id] || []).length}명 가능${heatmap[id]?.length ? `: ${heatmap[id].join(', ')}` : ''}` : ''}`}
                    onKeyDown={event => handleKeyDown(event, date, idx)}
                    onFocus={() => { setActiveCell(id); onCellHover?.(id) }}
                    style={{
                      height: `${CELL_H}px`,
                      touchAction: mode === 'select' && rangeSelection ? 'none' : 'auto',
                      borderTop: idx>0&&isHourStart ? `2px solid ${c.hourLine}` : undefined,
                      borderBottom: isHourStart ? `1px solid ${c.halfLine}` : undefined,
                      cursor: mode==='select' ? 'crosshair' : 'default',
                      transition: 'background 0.08s',
                      ...getCellBg(date, time, hourIndex),
                    }}
                    className="time-cell block w-full box-border select-none-touch"
                    onPointerDown={event => handlePointerDown(event, id)}
                    onLostPointerCapture={() => { isDragging.current = false }}
                    onClick={event => {
                      if (event.detail === 0 || !suppressClick.current) toggleCell(id)
                      suppressClick.current = false
                      onCellHover?.(id)
                    }}
                    onMouseOver={() => onCellHover?.(id)}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
    </div>
  )
}
