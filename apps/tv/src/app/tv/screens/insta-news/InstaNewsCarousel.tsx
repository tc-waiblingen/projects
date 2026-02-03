'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { QrCode } from '@/components/tv'

const IMAGE_DURATION = 8000 // 8 seconds per image

interface ContentItem {
  id: string
  type: 'post' | 'story'
  media_type: string
  media_url: string
  thumbnail_url?: string
  caption?: string
  permalink: string
  timestamp: string
  qrCode: string | null
}

interface InstaNewsCarouselProps {
  content: ContentItem[]
  nextIndex: number
}

export function InstaNewsCarousel({ content, nextIndex }: InstaNewsCarouselProps) {
  const [currentPosition, setCurrentPosition] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const hasCompletedCycleRef = useRef(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const triggerHomeTransition = useCallback(() => {
    if (hasCompletedCycleRef.current) return
    hasCompletedCycleRef.current = true

    // Clear timers
    if (timerRef.current) clearTimeout(timerRef.current)
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)

    // Trigger the transition overlay
    const overlay = document.getElementById('transition-overlay')
    if (overlay) {
      overlay.style.animation = 'screen-transition 1.5s cubic-bezier(0.4, 0, 0.2, 1) forwards'
      setTimeout(() => {
        window.location.href = `/tv?next=${nextIndex}`
      }, 1500)
    }
  }, [nextIndex])

  const advanceCarousel = useCallback(() => {
    if (isAnimating) return

    // Check if we've shown all items
    if (currentPosition === content.length - 1) {
      triggerHomeTransition()
      return
    }

    setIsAnimating(true)
    setCurrentPosition((prev) => prev + 1)
    setProgress(0)

    setTimeout(() => {
      setIsAnimating(false)
    }, 600)
  }, [isAnimating, currentPosition, content.length, triggerHomeTransition])

  // Handle media playback and timing
  useEffect(() => {
    if (content.length === 0) return

    // Clear existing timers
    if (timerRef.current) clearTimeout(timerRef.current)
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)

    const currentContent = content[currentPosition]
    if (!currentContent) return

    const startTime = Date.now()

    if (currentContent.media_type === 'VIDEO') {
      // Video - will auto-advance on end
      const video = videoRef.current
      if (video) {
        video.currentTime = 0
        video.play().catch(() => {})

        progressIntervalRef.current = setInterval(() => {
          if (video.duration) {
            setProgress((video.currentTime / video.duration) * 100)
          }
        }, 50)

        const handleVideoEnd = () => {
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
          advanceCarousel()
        }

        video.onended = handleVideoEnd

        // Fallback timer in case video doesn't end properly
        timerRef.current = setTimeout(() => {
          advanceCarousel()
        }, 60000) // 1 minute max
      }
    } else {
      // Image - use fixed duration
      timerRef.current = setTimeout(advanceCarousel, IMAGE_DURATION)

      progressIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime
        setProgress(Math.min((elapsed / IMAGE_DURATION) * 100, 100))
      }, 50)
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
    }
  }, [currentPosition, content, advanceCarousel])

  // Check for stay parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const stay = params.get('stay')
    if (stay && stay !== 'false' && stay !== '0') {
      console.log('InstaNews - auto-transition disabled (stay parameter set)')
    }
  }, [])

  // Get visible card indices for carousel effect
  const getPositionClass = (index: number) => {
    const diff = index - currentPosition
    if (diff === 0) return 'carousel-position-2'
    if (diff === -1) return 'carousel-position-1'
    if (diff === -2) return 'carousel-position-0'
    if (diff === 1) return 'carousel-position-3'
    if (diff === 2) return 'carousel-position-4'
    return ''
  }

  const shouldShow = (index: number) => {
    const diff = Math.abs(index - currentPosition)
    return diff <= 2
  }

  // Single item case
  if (content.length === 1) {
    const item = content[0]!
    return (
      <div className="relative h-full w-full">
        <div className="absolute left-1/2 top-1/2 h-[75vh] w-[25vw] -translate-x-1/2 -translate-y-1/2">
          <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-sm">
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg bg-black/20">
              {item.media_type === 'VIDEO' ? (
                <video
                  ref={videoRef}
                  src={item.media_url}
                  className="h-full w-full object-cover"
                  muted
                  playsInline
                  autoPlay
                  onEnded={triggerHomeTransition}
                />
              ) : (
                <img src={item.media_url} alt="Instagram content" className="h-full w-full object-cover" />
              )}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600">
                <div className="h-1 bg-white" style={{ width: `${progress}%` }} />
              </div>
            </div>

            {item.type === 'post' && item.caption && <p className="mt-4 text-sm opacity-80 line-clamp-6">{item.caption}</p>}

            <p className="mt-4 text-center text-xs opacity-40">
              {item.type === 'story' ? 'Story' : 'Beitrag'} vom{' '}
              {new Date(item.timestamp).toLocaleDateString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}
            </p>

            {item.qrCode && (
              <div className="mt-2 flex justify-center">
                <QrCode linkUrl={item.permalink} qrCodeDataUrl={item.qrCode} size="small" />
              </div>
            )}
          </div>
        </div>

        {/* Transition overlay */}
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
      </div>
    )
  }

  return (
    <div className="relative h-full w-full">
      <div className="relative h-full w-full">
        {content.map((item, index) => {
          if (!shouldShow(index)) return null

          const positionClass = getPositionClass(index)
          const isActive = index === currentPosition

          return (
            <div
              key={item.id}
              className={`carousel-card ${positionClass}`}
              style={{ display: shouldShow(index) ? 'block' : 'none' }}
            >
              <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-sm">
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg bg-black/20">
                  {item.media_type === 'VIDEO' ? (
                    <>
                      {item.thumbnail_url && !isActive && (
                        <img src={item.thumbnail_url} alt="Video thumbnail" className="absolute inset-0 h-full w-full object-cover" />
                      )}
                      <video
                        ref={isActive ? videoRef : undefined}
                        src={item.media_url}
                        className="h-full w-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    </>
                  ) : (
                    <img src={item.media_url} alt="Instagram content" className="h-full w-full object-cover" />
                  )}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600">
                      <div className="h-1 bg-white transition-all duration-100" style={{ width: `${progress}%` }} />
                    </div>
                  )}
                </div>

                {item.type === 'post' && item.caption && <p className="mt-4 text-sm opacity-80 line-clamp-6">{item.caption}</p>}

                <p className="mt-4 text-center text-xs opacity-40">
                  {item.type === 'story' ? 'Story' : 'Beitrag'} vom{' '}
                  {new Date(item.timestamp).toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </p>

                {item.qrCode && (
                  <div className="mt-2 flex justify-center">
                    <QrCode linkUrl={item.permalink} qrCodeDataUrl={item.qrCode} size="small" />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Transition overlay */}
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
    </div>
  )
}
