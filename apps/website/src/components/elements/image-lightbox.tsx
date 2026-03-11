"use client"

import { useEffect, useRef, useCallback } from "react"
import Image from "next/image"
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react"

export interface LightboxImage {
  src: string
  alt?: string
  title?: string
  description?: string
  width?: number
  height?: number
  type?: string
}

interface ImageLightboxProps {
  images: LightboxImage[]
  currentIndex: number
  isOpen: boolean
  onClose: () => void
  onIndexChange: (index: number) => void
}

export function ImageLightbox({
  images,
  currentIndex,
  isOpen,
  onClose,
  onIndexChange,
}: ImageLightboxProps) {
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  const goToNext = useCallback(() => {
    onIndexChange((currentIndex + 1) % images.length)
  }, [currentIndex, images.length, onIndexChange])

  const goToPrevious = useCallback(() => {
    onIndexChange((currentIndex - 1 + images.length) % images.length)
  }, [currentIndex, images.length, onIndexChange])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && images.length > 1) {
        goToNext()
      } else if (e.key === "ArrowLeft" && images.length > 1) {
        goToPrevious()
      } else if (e.key === " ") {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, goToNext, goToPrevious, onClose, images.length])

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    if (touch) touchStartX.current = touch.clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    if (touch) touchEndX.current = touch.clientX
  }

  const handleTouchEnd = () => {
    if (images.length <= 1) return

    const diff = touchStartX.current - touchEndX.current
    const minSwipeDistance = 50

    if (Math.abs(diff) > minSwipeDistance) {
      if (diff > 0) {
        goToNext()
      } else {
        goToPrevious()
      }
    }
  }

  const currentImage = images[currentIndex]
  const hasAnyDescription = images.some((img) => img.description)

  if (!currentImage) return null

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/90 backdrop-blur-sm transition-opacity duration-200 ease-out data-[closed]:opacity-0"
      />

      <div
        className="fixed inset-0 flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <DialogPanel
          transition
          className="relative flex h-full w-full items-center justify-center transition-all duration-200 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          <DialogTitle className="sr-only">
            {images.length > 1
              ? `Bildergalerie – Bild ${currentIndex + 1} von ${images.length}`
              : "Bildansicht"}
          </DialogTitle>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 cursor-pointer rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 focus:ring-2 focus:ring-white focus:outline-none"
            aria-label="Schließen"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-6 w-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Image and controls container */}
          <div className="flex flex-col items-center gap-4">
            {/* Current image */}
            <div className="flex max-h-[70vh] max-w-[90vw] items-center justify-center">
              <Image
                src={currentImage.src}
                alt={currentImage.alt ?? ""}
                title={currentImage.title ?? ""}
                width={currentImage.width ?? 1200}
                height={currentImage.height ?? 900}
                onClick={onClose}
                className="max-h-[70vh] max-w-[90vw] cursor-pointer object-contain"
                unoptimized={currentImage.type === "image/svg+xml"}
              />
            </div>

            {/* Navigation controls - only show for multiple images */}
            {images.length > 1 && (
              <div className="flex items-center gap-4">
                {/* Previous button */}
                <button
                  onClick={goToPrevious}
                  className="cursor-pointer rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 focus:ring-2 focus:ring-white focus:outline-none"
                  aria-label="Vorheriges Bild"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="h-6 w-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 19.5L8.25 12l7.5-7.5"
                    />
                  </svg>
                </button>

                {/* Image counter */}
                <div
                  className="rounded-full bg-white/10 px-4 py-2 text-sm text-white"
                  aria-live="polite"
                >
                  {currentIndex + 1} / {images.length}
                </div>

                {/* Next button */}
                <button
                  onClick={goToNext}
                  className="cursor-pointer rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 focus:ring-2 focus:ring-white focus:outline-none"
                  aria-label="Nächstes Bild"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="h-6 w-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.25 4.5l7.5 7.5-7.5 7.5"
                    />
                  </svg>
                </button>
              </div>
            )}

            {/* Description subtitle (fixed height to prevent layout shift) */}
            {hasAnyDescription && (
              <p className="line-clamp-4 h-[5rem] max-w-prose whitespace-pre-line text-center text-sm leading-5 text-white/80">
                {currentImage.description}
              </p>
            )}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
