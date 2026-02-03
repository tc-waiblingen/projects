'use client'

import { useEffect, useId, useState } from 'react'

interface ProgressIndicatorProps {
  duration?: number
}

/**
 * Circular progress indicator with countdown timer.
 */
export function ProgressIndicator({ duration = 10000 }: ProgressIndicatorProps) {
  const radius = 16
  const stroke = 3
  const circumference = 2 * Math.PI * radius
  const uniqueId = useId()
  const [countdown, setCountdown] = useState(Math.ceil(duration / 1000))

  useEffect(() => {
    const startTime = Date.now()

    const updateCountdown = () => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, duration - elapsed)
      setCountdown(Math.ceil(remaining / 1000))

      if (remaining > 0) {
        requestAnimationFrame(updateCountdown)
      }
    }

    const frameId = requestAnimationFrame(updateCountdown)
    return () => cancelAnimationFrame(frameId)
  }, [duration])

  return (
    <div className="relative" style={{ width: radius * 2 + stroke * 2, height: radius * 2 + stroke * 2 }}>
      <svg width={radius * 2 + stroke * 2} height={radius * 2 + stroke * 2} className="-rotate-90 transform">
        {/* Background circle (gray border) */}
        <circle
          cx={radius + stroke}
          cy={radius + stroke}
          r={radius}
          fill="transparent"
          stroke="#D1D5DB"
          strokeWidth={stroke}
        />

        {/* Progress circle (red border, animated) */}
        <circle
          cx={radius + stroke}
          cy={radius + stroke}
          r={radius}
          fill="transparent"
          stroke="#D63C2B"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          strokeLinecap="round"
          style={{
            animation: `progress-${uniqueId} ${duration}ms linear forwards`,
          }}
        />

        <style>{`
          @keyframes progress-${uniqueId} {
            to {
              stroke-dashoffset: 0;
            }
          }
        `}</style>
      </svg>

      {/* Countdown text */}
      <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-neutral-700">
        {countdown}
      </div>
    </div>
  )
}
