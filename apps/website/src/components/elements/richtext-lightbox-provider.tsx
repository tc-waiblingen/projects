'use client'

import { lazy, Suspense, useState, type MouseEvent, type ReactNode } from 'react'
import type { LightboxImage } from './image-lightbox'

const ImageLightbox = lazy(() =>
  import('./image-lightbox').then((mod) => ({ default: mod.ImageLightbox }))
)

interface RichtextLightboxProviderProps {
  images: LightboxImage[]
  children: ReactNode
}

export function RichtextLightboxProvider({ images, children }: RichtextLightboxProviderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target
    if (!(target instanceof Element)) return

    const trigger = target.closest<HTMLElement>('[data-richtext-lightbox-index]')
    if (!trigger || !event.currentTarget.contains(trigger)) return

    const index = Number(trigger.dataset.richtextLightboxIndex)
    if (!Number.isInteger(index) || index < 0 || index >= images.length) return

    setCurrentIndex(index)
    setIsOpen(true)
  }

  return (
    <>
      <div onClick={handleClick}>{children}</div>
      {isOpen && (
        <Suspense fallback={null}>
          <ImageLightbox
            images={images}
            currentIndex={currentIndex}
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            onIndexChange={setCurrentIndex}
          />
        </Suspense>
      )}
    </>
  )
}
