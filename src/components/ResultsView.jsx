import { useState } from 'react'
import { UserRound } from 'lucide-react'
import TimeGrid from './TimeGrid'
import { buildHeatmap, findBestSlots, formatDateFull, formatDateHeader } from '../utils/timeUtils'

export default function ResultsView({ room, availabilities }) {
  const [hoveredSlot, setHoveredSlot] = useState(null)
  const [duration, setDuration] = useState(30)
  const heatmap = buildHeatmap(availabilities)
  const bestSlots = findBestSlots(heatmap, availabilities, 5, duration / 30)
  const hoveredInfo = hoveredSlot ? heatmap[hoveredSlot] || [] : null
  const totalCount = availabilities.length

  return (
    <div className="results-view">
      <section className="response-list" aria-labelledby="response-heading">
        <h2 id="response-heading">응답한 사람 <span>{totalCount}명</span></h2>
        {totalCount === 0 ? <p className="text-sm text-muted">아직 응답이 없어요. 초대 링크를 보내 함께 시간을 골라보세요.</p> : (
          <ul>
            {availabilities.map(av => <li key={av.id}>
              <span className="response-avatar" aria-hidden="true"><UserRound size={18} strokeWidth={1.8} /></span>
              <span className="response-person">
                <span className="response-name">{av.name}{av.is_mine && <span className="response-self">나</span>}</span>
                {av.slots.length === 0 && <span className="response-unavailable">가능한 시간 없음</span>}
              </span>
            </li>)}
          </ul>
        )}
      </section>

      {totalCount > 0 && <>
        <section className="recommendations" aria-labelledby="recommendation-heading">
          <div className="result-heading">
            <div><p className="section-sub">응답한 {totalCount}명을 기준으로</p><h2 id="recommendation-heading">추천 시간대</h2></div>
            <div className="duration-picker">
              <label htmlFor="meeting-duration">필요한 시간</label>
              <select id="meeting-duration" className="input" value={duration} onChange={event => setDuration(Number(event.target.value))}>
                <option value={30}>30분</option><option value={60}>1시간</option><option value={120}>2시간</option>
              </select>
            </div>
          </div>
          <p className="text-xs text-muted mb-4">선택한 시간 이상 만날 수 있는 구간이에요.</p>
          {bestSlots.length === 0 ? <p role="status" className="empty-recommendation">{duration}분 이상 가능한 시간이 없어요. 필요한 시간을 줄이거나 다른 날짜를 조율해보세요.</p> : (
            <ol className="recommendation-list">
              {bestSlots.map((slot, i) => {
                const { month, day, weekday, isSaturday, isSunday } = formatDateHeader(slot.date)
                return <li key={`${slot.date}-${slot.startTime}-${i}`} className="recommendation-row" data-top={i === 0}>
                  <time className={`recommendation-date ${isSaturday ? 'weekday-saturday' : isSunday ? 'weekday-sunday' : ''}`}
                    dateTime={slot.date} aria-label={`${slot.date.slice(0, 4)}년 ${formatDateFull(slot.date)}`}>
                    <span>{month}월</span><strong>{day}</strong><span>{weekday}요일</span>
                  </time>
                  <div className="recommendation-details">
                    <div className="recommendation-topline">
                      <span className="recommendation-rank" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                      {i === 0 && <span className="recommendation-badge">가장 많이 겹쳐요</span>}
                    </div>
                    <div className="recommendation-body">
                      <div className="recommendation-time">
                        <strong>{slot.startTime} <span>—</span> {slot.endTime}</strong>
                        <small>{slot.durationMins}분 동안 만날 수 있어요</small>
                      </div>
                      <div className="recommendation-count" data-all={slot.count === totalCount}>
                        <strong>{slot.count}<span> / {totalCount}명</span></strong>
                        <p>{slot.count === totalCount ? '전원 가능' : `${slot.count}명 가능`}</p>
                        <div className="recommendation-meter" aria-hidden="true"><span style={{ width: `${slot.count / totalCount * 100}%` }} /></div>
                      </div>
                    </div>
                  </div>
                </li>
              })}
            </ol>
          )}
        </section>

        <section className="availability-overview" aria-labelledby="overview-heading">
          <div className="result-heading"><h2 id="overview-heading">전체 시간표</h2><div className="heat-legend" aria-label={`연할수록 0명, 진할수록 ${totalCount}명 가능`}><span>0명</span><i /><span>{totalCount}명</span></div></div>
          <p className="slot-detail" role="status">
            {hoveredInfo === null ? '시간 칸을 누르면 가능한 사람을 확인할 수 있어요.' : <>{formatDateFull(hoveredSlot.split('|')[0])} {hoveredSlot.split('|')[1]} · {hoveredInfo.length > 0 ? `${hoveredInfo.length}명 가능: ${hoveredInfo.join(', ')}` : '가능한 사람 없음'}</>}
          </p>
          <TimeGrid mode="results" dates={room.dates} startHour={room.time_start} endHour={room.time_end} heatmap={heatmap} totalParticipants={totalCount} onCellHover={setHoveredSlot} />
        </section>
      </>}
    </div>
  )
}
