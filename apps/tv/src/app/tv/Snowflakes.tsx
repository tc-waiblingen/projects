'use client'

import { useState } from 'react'

interface SnowflakeData {
  id: number
  size: number
  left: number
  duration: number
  delay: number
  drift: number
}

function generateSnowflakes(): SnowflakeData[] {
  return Array.from({ length: 50 }).map((_, i) => ({
    id: i,
    size: Math.random() * 1.5 + 0.5,
    left: Math.random() * 100,
    duration: Math.random() * 10 + 10,
    delay: Math.random() * -20,
    drift: (Math.random() - 0.5) * 100,
  }))
}

/**
 * Snowflakes animation for Christmas season.
 */
export function Snowflakes() {
  const [snowflakes] = useState<SnowflakeData[]>(generateSnowflakes)

  return (
    <>
      {snowflakes.map((flake) => (
        <div
          key={`snowflake-${flake.id}`}
          className="snowflake"
          style={{
            left: `${flake.left}%`,
            fontSize: `${flake.size}rem`,
            animationDuration: `${flake.duration}s`,
            animationDelay: `${flake.delay}s`,
            // @ts-expect-error CSS custom property
            '--drift': `${flake.drift}px`,
          }}
        >
          ❄
        </div>
      ))}
    </>
  )
}
