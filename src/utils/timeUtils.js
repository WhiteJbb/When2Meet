// ─── 날짜 유틸 ────────────────────────────────────────────────────────────────

export function generateDateRange(startDate, numDays) {
  const dates = []
  const start = new Date(startDate + 'T00:00:00')
  for (let i = 0; i < numDays; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    dates.push(`${y}-${m}-${day}`)
  }
  return dates
}

const WEEKDAYS_KO = ['일', '월', '화', '수', '목', '금', '토']

export function formatDateHeader(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const dayOfWeek = d.getDay()
  return {
    weekday: WEEKDAYS_KO[dayOfWeek],
    month: d.getMonth() + 1,
    day: d.getDate(),
    isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    isSunday: dayOfWeek === 0,
    isSaturday: dayOfWeek === 6,
  }
}

export function formatDateFull(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS_KO[d.getDay()]})`
}

// ─── 시간 슬롯 유틸 ──────────────────────────────────────────────────────────

export function generateTimeSlots(startHour, endHour) {
  const slots = []
  for (let h = startHour; h < endHour; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`)
    slots.push(`${String(h).padStart(2, '0')}:30`)
  }
  return slots
}

export function formatTimeLabel(timeStr) {
  const [h] = timeStr.split(':')
  const hour = parseInt(h, 10)
  if (hour === 0) return '자정'
  if (hour === 12) return '정오'
  if (hour < 12) return `오전 ${hour}시`
  return `오후 ${hour - 12}시`
}

// 슬롯 ID = "YYYY-MM-DD|HH:mm"
export function slotId(date, time) {
  return `${date}|${time}`
}

export function parseSlotId(id) {
  const [date, time] = id.split('|')
  return { date, time }
}

// ─── 히트맵 분석 ─────────────────────────────────────────────────────────────

/**
 * availabilities: [{ name, slots: string[] }]
 * → 각 슬롯에 몇 명이 가능한지 맵 반환
 */
export function buildHeatmap(availabilities) {
  const map = {}
  for (const av of availabilities) {
    for (const slot of av.slots) {
      map[slot] = (map[slot] || [])
      map[slot].push(av.name)
    }
  }
  return map
}

/**
 * 가장 많은 사람이 가능한 연속 슬롯 블록을 찾아 상위 N개 반환
 * 겹치는 구간을 분리하여 각 구간별로 가능한 사람 수 계산
 * minSlots: 최소 연속 슬롯 수 (기본 2 = 1시간)
 */
export function findBestSlots(heatmap, availabilities, topN = 5, minSlots = 2) {
  if (!availabilities.length) return []

  // Compare response identities, not display names: names can be shared.
  const owners = new Map()
  availabilities.forEach((response, index) => {
    for (const slot of new Set(response.slots)) {
      if (!owners.has(slot)) owners.set(slot, new Set())
      owners.get(slot).add(index)
    }
  })
  const byDate = new Map()
  for (const key of Object.keys(heatmap)) {
    const { date, time } = parseSlotId(key)
    if (!byDate.has(date)) byDate.set(date, [])
    byDate.get(date).push({ time, members: owners.get(key) || new Set() })
  }

  const groups = new Map()
  for (const [date, slots] of byDate) {
    slots.sort((a, b) => a.time.localeCompare(b.time))
    for (let start = 0; start < slots.length; start++) {
      let common = new Set(slots[start].members)
      for (let end = start; end < slots.length && common.size; end++) {
        if (end > start && !isConsecutive(slots[end - 1].time, slots[end].time)) break
        common = new Set([...common].filter(member => slots[end].members.has(member)))
        if (!common.size) break
        if (end - start + 1 < minSlots) continue
        const ids = [...common].sort((a, b) => a - b)
        const key = `${date}|${ids.join(',')}`
        const block = {
          date, startTime: slots[start].time, endTime: addMinutes(slots[end].time, 30),
          participants: ids.map(index => availabilities[index].name),
          count: ids.length, durationMins: (end - start + 1) * 30,
        }
        const existing = groups.get(key) || []
        if (existing.some(other => other.startTime <= block.startTime && other.endTime >= block.endTime)) continue
        groups.set(key, [...existing.filter(other => !(block.startTime <= other.startTime && block.endTime >= other.endTime)), block])
      }
    }
  }
  const blocks = [...groups.values()].flat().sort((a, b) =>
    b.count - a.count || b.durationMins - a.durationMins || a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
  return blocks.slice(0, topN).map(block => ({
    ...block,
    isHighlighted: block.count === blocks[0].count && block.durationMins === blocks[0].durationMins,
  }))
}

function isConsecutive(time1, time2) {
  return addMinutes(time1, 30) === time2
}

function addMinutes(timeStr, mins) {
  const [h, m] = timeStr.split(':').map(Number)
  const total = h * 60 + m + mins
  const nh = Math.floor(total / 60)
  const nm = total % 60
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
}

// ─── 색상 ─────────────────────────────────────────────────────────────────────

/**
 * 참여 비율(0~1)을 인디고 계열 색으로 변환
 * isDark: 다크 모드 여부
 */
export function heatColor(ratio, isDark) {
  if (ratio === 0) return isDark ? '#1e293b' : '#f1f5f9' // slate-800 / slate-100
  // 0 초과 → 인디고 계열
  const alpha = 0.2 + ratio * 0.8
  return `rgba(99, 102, 241, ${alpha})`
}
