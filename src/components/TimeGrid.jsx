import { useEffect, useRef, useCallback } from 'react'
import { generateTimeSlots, formatDateHeader, slotId } from '../utils/timeUtils'
import { useTheme } from '../context/ThemeContext'
import { heatColor } from '../utils/timeUtils'

export default function TimeGrid({
  mode = 'select', dates, startHour, endHour,
  selected = new Set(), onSelectionChange,
  heatmap = {}, totalParticipants = 0, onCellHover,
}) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const timeSlots = generateTimeSlots(startHour, endHour)

  const isDragging = useRef(false)
  const dragMode = useRef('add')
  const gridRef = useRef(null)
  const containerRef = useRef(null)
  const lastPosRef = useRef(null)
  const autoScrollInterval = useRef(null)
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
    lastPosRef.current = pos
  }

  const handleMouseDown = useCallback((id) => (e) => {
    if (mode !== 'select') return
    e.preventDefault()
    isDragging.current = true
    dragMode.current = selected.has(id) ? 'remove' : 'add'
    const [dateStr, time] = id.split('|')
    const pos = { dateStr, rowIdx: timeSlots.indexOf(time) }
    startPosRef.current = pos
    lastPosRef.current = pos
    onSelectionChange(prev => {
      const next = new Set(prev)
      dragMode.current === 'add' ? next.add(id) : next.delete(id)
      return next
    })
  }, [mode, selected, onSelectionChange, timeSlots])

  const handleMouseMove = useCallback((e) => {
    if (mode !== 'select' || !isDragging.current) return
    
    // 마우스가 움직였을 때만 범위 선택 적용
    if (lastPosRef.current) {
      applyTo(e.clientX, e.clientY)
    }
    
    // 자동 스크롤
    if (containerRef.current) {
      const container = containerRef.current
      const rect = container.getBoundingClientRect()
      const scrollSpeed = 10
      const edgeSize = 50
      
      // 가로 스크롤
      if (e.clientX < rect.left + edgeSize) {
        container.scrollLeft -= scrollSpeed
      } else if (e.clientX > rect.right - edgeSize) {
        container.scrollLeft += scrollSpeed
      }
      
      // 세로 스크롤
      if (e.clientY < rect.top + edgeSize) {
        container.scrollTop -= scrollSpeed
      } else if (e.clientY > rect.bottom - edgeSize) {
        container.scrollTop += scrollSpeed
      }
    }
  }, [mode])

  const isTouchDragging = useRef(false)
  const touchStartPos = useRef(null)
  const longPressTimer = useRef(null)
  const applyToRef = useRef(applyTo)

  useEffect(() => {
    applyToRef.current = applyTo
  })

  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return

    const onTouchMove = (e) => {
      if (mode !== 'select') return

      if (isTouchDragging.current) {
        if (e.cancelable) {
          e.preventDefault()
        }
        const touch = e.touches[0]
        applyToRef.current(touch.clientX, touch.clientY)

        // 자동 스크롤
        if (containerRef.current) {
          const container = containerRef.current
          const rect = container.getBoundingClientRect()
          const scrollSpeed = 10
          const edgeSize = 50

          if (touch.clientX < rect.left + edgeSize) {
            container.scrollLeft -= scrollSpeed
          } else if (touch.clientX > rect.right - edgeSize) {
            container.scrollLeft += scrollSpeed
          }

          if (touch.clientY < rect.top + edgeSize) {
            container.scrollTop -= scrollSpeed
          } else if (touch.clientY > rect.bottom - edgeSize) {
            container.scrollTop += scrollSpeed
          }
        }
      } else {
        const start = touchStartPos.current
        if (start) {
          const touch = e.touches[0]
          const dx = touch.clientX - start.x
          const dy = touch.clientY - start.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          if (distance > 8) {
            if (longPressTimer.current) {
              clearTimeout(longPressTimer.current)
              longPressTimer.current = null
            }
            touchStartPos.current = null
          }
        }
      }
    }

    grid.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => {
      grid.removeEventListener('touchmove', onTouchMove)
    }
  }, [mode])

  const handleTouchStart = useCallback((id) => (e) => {
    if (mode !== 'select') return

    const touch = e.touches[0]
    touchStartPos.current = { x: touch.clientX, y: touch.clientY, id }
    isTouchDragging.current = false

    if (longPressTimer.current) clearTimeout(longPressTimer.current)

    longPressTimer.current = setTimeout(() => {
      isTouchDragging.current = true
      isDragging.current = true

      dragMode.current = selected.has(id) ? 'remove' : 'add'
      const [dateStr, time] = id.split('|')
      const pos = { dateStr, rowIdx: timeSlots.indexOf(time) }
      startPosRef.current = pos
      lastPosRef.current = pos

      onSelectionChange(prev => {
        const next = new Set(prev)
        dragMode.current === 'add' ? next.add(id) : next.delete(id)
        return next
      })

      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    }, 250)
  }, [mode, selected, onSelectionChange, timeSlots])

  const handleTouchEnd = useCallback((id) => (e) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }

    if (!isTouchDragging.current && touchStartPos.current) {
      e.preventDefault()
      onSelectionChange(prev => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    }

    isTouchDragging.current = false
    touchStartPos.current = null
    isDragging.current = false
    startPosRef.current = null
  }, [onSelectionChange])

  useEffect(() => {
    const onUp = () => {
      isDragging.current = false
      startPosRef.current = null
    }

    const onTouchEndGlobal = () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }
      isTouchDragging.current = false
      touchStartPos.current = null
      isDragging.current = false
      startPosRef.current = null
    }

    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchend', onTouchEndGlobal)
    window.addEventListener('touchcancel', onTouchEndGlobal)
    return () => {
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchend', onTouchEndGlobal)
      window.removeEventListener('touchcancel', onTouchEndGlobal)
    }
  }, [])

  const CELL_H = 32

  const c = isDark ? {
    border: '#2a2a2a', header: '#1e1e1e', timeCol: '#1a1a1a',
    hourLine: '#2a2a2a', halfLine: '#222', colLine: '#252525',
    cellEven: '#111', cellOdd: '#161616',
    timeText: '#444', dayText: '#888', weekendText: '#f87171',
  } : {
    border: '#efefef', header: '#fff', timeCol: '#fafafa',
    hourLine: '#efefef', halfLine: '#f7f7f7', colLine: '#f5f5f5',
    cellEven: '#fff', cellOdd: '#fafafa',
    timeText: '#ccc', dayText: '#555', weekendText: '#e11d48',
  }

  function getCellBg(date, time, hourIndex) {
    const id = slotId(date, time)
    if (mode === 'select') {
      if (selected.has(id)) return { background: '#0ecfb0' }
      return { background: hourIndex % 2 === 0 ? c.cellEven : c.cellOdd }
    }
    const names = heatmap[id] || []
    const ratio = totalParticipants > 0 ? names.length / totalParticipants : 0
    if (ratio === 0) return { background: hourIndex % 2 === 0 ? c.cellEven : c.cellOdd }
    return { background: `rgba(14,207,176,${0.12 + ratio * 0.78})` }
  }

  return (
    <div ref={containerRef} className="overflow-auto time-grid-scroll"
      style={{ borderRadius: '24px', border: `1.5px solid ${c.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}
    >
      <div ref={gridRef} className="relative" onMouseMove={handleMouseMove}
        style={{ minWidth: `${dates.length*64+70}px` }}
      >
        {/* 헤더 */}
        <div className="flex sticky top-0 z-20"
          style={{ background: c.header, borderBottom: `2px solid ${c.hourLine}` }}
        >
          <div className="w-[70px] flex-shrink-0 sticky left-0 z-30" style={{ background: c.header }}/>
          {dates.map(d => {
            const { weekday, month, day, isSunday, isSaturday } = formatDateHeader(d)
            const textColor = isSunday ? c.weekendText : isSaturday ? '#3b82f6' : c.dayText
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
                  <div key={time} data-cell-id={id}
                    style={{
                      height: `${CELL_H}px`,
                      borderTop: idx>0&&isHourStart ? `2px solid ${c.hourLine}` : undefined,
                      borderBottom: isHourStart ? `1px solid ${c.halfLine}` : undefined,
                      cursor: mode==='select' ? 'crosshair' : 'default',
                      transition: 'background 0.08s',
                      ...getCellBg(date, time, hourIndex),
                    }}
                    className="w-full box-border select-none-touch"
                    onMouseDown={handleMouseDown(id)}
                    onTouchStart={handleTouchStart(id)}
                    onTouchEnd={handleTouchEnd(id)}
                    onMouseOver={() => onCellHover?.(id)}
                    onMouseLeave={() => onCellHover?.(null)}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
