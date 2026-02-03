'use client'

import { useId, useState } from 'react'

interface CalendarIllustrationProps {
  date?: Date
  className?: string
}

function formatDateParts(date: Date) {
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return {
    weekday: date.toLocaleDateString('de-DE', { weekday: 'long' }),
    day: date.toLocaleDateString('de-DE', { day: '2-digit' }),
    month: date.toLocaleDateString('de-DE', { month: 'long' }),
  }
}

/**
 * Calendar illustration SVG that shows the current or provided date.
 */
export function CalendarIllustration({ date, className }: CalendarIllustrationProps) {
  const identifier = useId().replace(/:/g, '')
  const gradientId = `calendar-gradient-${identifier}`

  // Use lazy state initialization for dynamic date display
  const [dateParts] = useState<{ weekday: string; day: string; month: string } | null>(() =>
    formatDateParts(date ?? new Date())
  )

  // Fallback values for SSR
  const displayParts = dateParts || { weekday: 'Montag', day: '01', month: 'JANUAR' }

  return (
    <svg
      viewBox="0 0 400 300"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      className={className}
      role="img"
      aria-label={`${displayParts.weekday} ${displayParts.day}. ${displayParts.month}`}
    >
      <defs>
        <radialGradient id={gradientId} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#DDD5C0" />
          <stop offset="100%" stopColor="#D0C4A8" />
        </radialGradient>
      </defs>

      <g transform="translate(200, 150)">
        <rect x="-75" y="-90" width="150" height="180" rx="12" ry="12" fill={`url(#${gradientId})`} stroke="#887050" strokeWidth="3" />
        <rect x="-75" y="-90" width="150" height="35" rx="12" ry="12" fill="#C8685D" />
        <rect x="-75" y="-67" width="150" height="12" fill="#C8685D" />
        <text
          x="0"
          y="-64"
          fontFamily="Arial, sans-serif"
          fontSize="16"
          fontWeight="bold"
          fill="#DDD5C0"
          textAnchor="middle"
        >
          {displayParts.month.toUpperCase()}
        </text>

        <line x1="-75" y1="-55" x2="75" y2="-55" stroke="#887050" strokeWidth="2.5" />

        <text
          x="0"
          y="35"
          fontFamily="Arial, sans-serif"
          fontSize="70"
          fontWeight="bold"
          fill="#887050"
          textAnchor="middle"
        >
          {displayParts.day}
        </text>

        <text
          x="0"
          y="-30"
          fontFamily="Arial, sans-serif"
          fontSize="18"
          fill="#887050"
          textAnchor="middle"
        >
          {displayParts.weekday}
        </text>

        <g transform="translate(0, 60)">
          {[-50, -30, -10, 10, 30, 50].map((x, index) => (
            <circle key={`row1-${index}`} cx={x} cy="-5" r="3" fill="#A89878" />
          ))}
          {[-50, -30, -10, 10, 30, 50].map((x, index) => (
            <circle key={`row2-${index}`} cx={x} cy="10" r="3" fill="#A89878" />
          ))}
        </g>

        <circle cx="-40" cy="-80" r="4" fill="none" stroke="#887050" strokeWidth="2.5" />
        <circle cx="0" cy="-80" r="4" fill="none" stroke="#887050" strokeWidth="2.5" />
        <circle cx="40" cy="-80" r="4" fill="none" stroke="#887050" strokeWidth="2.5" />
      </g>
    </svg>
  )
}
