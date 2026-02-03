'use client'

import { useEffect } from 'react'

interface ScreenAutoAdvanceProps {
  currentUrl: string
  nextIndex: number
  duration: number
}

/**
 * Client component that handles auto-advancing to the next screen.
 * Includes the transition overlay.
 */
export function ScreenAutoAdvance({ currentUrl, nextIndex, duration }: ScreenAutoAdvanceProps) {
  useEffect(() => {
    // Check if stay parameter is set
    const params = new URLSearchParams(window.location.search)
    const stay = params.get('stay')
    if (stay && stay !== 'false' && stay !== '0') {
      console.log(`${currentUrl} - auto-transition disabled (stay parameter set)`)
      return
    }

    console.log(`${currentUrl} will return to home after ${duration}ms with next=${nextIndex}`)

    const timer = setTimeout(() => {
      const overlay = document.getElementById('transition-overlay')
      if (overlay) {
        overlay.style.animation = 'screen-transition 1.5s cubic-bezier(0.4, 0, 0.2, 1) forwards'
      }

      setTimeout(() => {
        window.location.href = `/tv?next=${nextIndex}`
      }, 1500)
    }, duration)

    return () => clearTimeout(timer)
  }, [currentUrl, nextIndex, duration])

  return (
    <div
      id="transition-overlay"
      className="pointer-events-none fixed z-50"
      style={{
        left: '50%',
        top: '50%',
        width: '256px',
        height: '256px',
        borderRadius: '50%',
        backgroundColor: '#DDD5C0',
        transform: 'translate(-50%, -50%) scale(0)',
        opacity: '1',
      }}
    />
  )
}
