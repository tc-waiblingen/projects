'use client'

import { useRef, useState, useEffect } from 'react'
import { clsx } from 'clsx/lite'
import { InstagramIcon } from '@/components/icons/social/instagram-icon'
import { InstagramPost } from './InstagramPost'
import type { InstagramCarouselItem } from './types'

interface InstagramCarouselProps {
  items: InstagramCarouselItem[]
  showCaptions: boolean
  ctaLabel: string
  variant: 'large' | 'compact'
}

export function InstagramCarousel({ items, showCaptions, ctaLabel, variant }: InstagramCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const updateScrollState = () => {
    const container = scrollContainerRef.current
    if (!container) return

    const { scrollLeft, scrollWidth, clientWidth } = container
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1)
  }

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    updateScrollState()
    container.addEventListener('scroll', updateScrollState)
    window.addEventListener('resize', updateScrollState)

    return () => {
      container.removeEventListener('scroll', updateScrollState)
      window.removeEventListener('resize', updateScrollState)
    }
  }, [])

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current
    if (!container) return

    const scrollAmount = container.clientWidth * 0.8
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Carousel container */}
      <div
        ref={scrollContainerRef}
        className={clsx(
          'scrollbar-hide flex snap-x snap-mandatory overflow-x-auto scroll-smooth',
          variant === 'compact' ? 'gap-3' : 'gap-4'
        )}
      >
        {items.map((item) => (
          <InstagramPost key={item.id} item={item} showCaption={showCaptions} variant={variant} />
        ))}
      </div>

      {/* Navigation controls */}
      <div className="flex items-center justify-between">
        {/* CTA link - left side */}
        <a
          href="https://instagram.com/tcwaiblingen"
          target="_blank"
          rel="noopener noreferrer nofollow"
          className={clsx(
            'inline-flex items-center gap-2 rounded-full px-6 py-2',
            'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500',
            'text-sm font-semibold text-white',
            'shadow-md transition hover:shadow-lg hover:brightness-110'
          )}
        >
          <InstagramIcon className="size-5" />
          {ctaLabel}
        </a>

        {/* Nav buttons - right side */}
        <div className="flex items-center gap-2">
          {/* Previous button */}
          <button
            type="button"
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className={clsx(
              'flex cursor-pointer items-center justify-center rounded-full p-2 transition-colors',
              'bg-tcw-accent-700 text-white hover:bg-tcw-accent-800',
              'dark:bg-tcw-accent-200 dark:text-tcw-accent-900 dark:hover:bg-tcw-accent-100',
              'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-tcw-accent-700 dark:disabled:hover:bg-tcw-accent-200'
            )}
            aria-label="Vorherige Beiträge"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="size-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>

          {/* Next button */}
          <button
            type="button"
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className={clsx(
              'flex cursor-pointer items-center justify-center rounded-full p-2 transition-colors',
              'bg-tcw-accent-700 text-white hover:bg-tcw-accent-800',
              'dark:bg-tcw-accent-200 dark:text-tcw-accent-900 dark:hover:bg-tcw-accent-100',
              'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-tcw-accent-700 dark:disabled:hover:bg-tcw-accent-200'
            )}
            aria-label="Nächste Beiträge"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="size-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
