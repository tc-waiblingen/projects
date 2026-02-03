'use client'

import { useEffect } from 'react'
import type { Screen } from '@/lib/tv/screen-config'

interface HomeAutoTransitionProps {
  screens: Screen[]
  hasSeasonalMessage: boolean
}

export function HomeAutoTransition({ screens, hasSeasonalMessage }: HomeAutoTransitionProps) {
  useEffect(() => {
    // Check if stay parameter is set
    const params = new URLSearchParams(window.location.search)
    const stay = params.get('stay')
    if (stay && stay !== 'false' && stay !== '0') {
      console.log('Home page - auto-transition disabled (stay parameter set)')
      return
    }

    // Exit early if no screens available
    if (screens.length === 0) {
      console.log('No screens available for rotation')
      return
    }

    // Parse next screen index from URL parameter
    const nextParam = params.get('next')
    const nextIndex = nextParam !== null ? parseInt(nextParam, 10) : 0

    // Clamp to valid range
    const screenIndex = Math.max(0, Math.min(nextIndex, screens.length - 1))
    const targetScreen = screens[screenIndex]

    // Use longer duration when seasonal message is shown
    const displayDuration = hasSeasonalMessage ? 6000 : 3000

    console.log(`Home page will transition to screen ${screenIndex} after ${displayDuration / 1000} seconds`)

    const timer = setTimeout(() => {
      const overlay = document.getElementById(`transition-overlay-${screenIndex}`)
      if (overlay) {
        overlay.style.animation = 'screen-transition 1.5s cubic-bezier(0.4, 0, 0.2, 1) forwards'
      }

      setTimeout(() => {
        window.location.href = targetScreen?.url || '/tv/screens/insta-news'
      }, 1500)
    }, displayDuration)

    return () => clearTimeout(timer)
  }, [screens, hasSeasonalMessage])

  return null
}
