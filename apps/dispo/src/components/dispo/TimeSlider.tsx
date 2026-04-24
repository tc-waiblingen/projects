'use client'

import clsx from 'clsx'
import { DAY_END, DAY_START, formatTime } from '@/lib/plan-helpers'

interface TimeSliderProps {
  value: number
  onChange: (m: number) => void
  /** Current wall-clock minutes (for a "now" marker), or null to hide. */
  nowMinutes: number | null
  label: string
  variant?: 'map' | 'timeline'
}

export function TimeSlider({ value, onChange, nowMinutes, label, variant = 'map' }: TimeSliderProps) {
  const inRange =
    nowMinutes !== null && nowMinutes >= DAY_START && nowMinutes <= DAY_END
  const nowPct = inRange
    ? ((nowMinutes! - DAY_START) / (DAY_END - DAY_START)) * 100
    : 0

  return (
    <div className={clsx('time-slider', variant === 'timeline' && 'is-timeline')}>
      <span className={variant === 'timeline' ? 'tl-slider-label' : 'eyebrow'}>{label}</span>
      <div className="time-slider-track">
        {inRange && (
          <div
            className="time-slider-now"
            style={{ left: `${nowPct}%` }}
            title={`Jetzt: ${formatTime(nowMinutes!)} Uhr`}
            aria-label={`Aktuelle Uhrzeit ${formatTime(nowMinutes!)}`}
          />
        )}
        <input
          type="range"
          min={DAY_START}
          max={DAY_END}
          step={15}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
      <span className="tl-slider-time">{formatTime(value)} Uhr</span>
    </div>
  )
}
