'use client'

import { useEffect, useRef } from 'react'
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from '@headlessui/react'
import { useToc } from './TocProvider'

interface TocMobileProps {
  isOpen: boolean
  onClose: () => void
}

export function TocMobile({ isOpen, onClose }: TocMobileProps) {
  const { headings, activeId, scrollToHeading } = useToc()
  const panelRef = useRef<HTMLDivElement>(null)
  const startX = useRef(0)

  // Handle swipe to dismiss
  useEffect(() => {
    const panel = panelRef.current
    if (!panel || !isOpen) return

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      if (touch) startX.current = touch.clientX
    }

    const handleTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0]
      if (!touch) return
      const endX = touch.clientX
      const diff = endX - startX.current
      // Swipe right to close (increased threshold to 150px)
      if (diff > 150) {
        onClose()
      }
    }

    panel.addEventListener('touchstart', handleTouchStart)
    panel.addEventListener('touchend', handleTouchEnd)

    return () => {
      panel.removeEventListener('touchstart', handleTouchStart)
      panel.removeEventListener('touchend', handleTouchEnd)
      startX.current = 0
    }
  }, [isOpen, onClose])

  const handleClick = (id: string) => {
    scrollToHeading(id)
    onClose()
  }

  if (headings.length === 0) return null

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/50 transition-opacity duration-200 ease-out data-[closed]:opacity-0"
      />

      <DialogPanel
        ref={panelRef}
        transition
        className="fixed bottom-0 right-0 top-(--scroll-padding-top) flex w-72 max-w-[80vw] flex-col bg-white p-6 shadow-2xl transition-transform duration-200 ease-out data-[closed]:translate-x-full dark:bg-taupe-900"
      >
        <DialogTitle className="mb-4 flex items-center justify-between">
          <span className="text-sm font-semibold uppercase tracking-wider text-taupe-500 dark:text-taupe-400">
            Inhaltsverzeichnis
          </span>
          <button
            onClick={onClose}
            className="rounded p-1 text-taupe-500 hover:bg-taupe-100 dark:text-taupe-400 dark:hover:bg-taupe-800"
            aria-label="Schließen"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </DialogTitle>

        <nav className="flex-1 overflow-y-auto">
          <ul className="list-none space-y-1">
            {headings.map((heading) => (
              <li key={heading.id}>
                <button
                  onClick={() => handleClick(heading.id)}
                  className={`block w-full cursor-pointer rounded px-3 py-2 text-left text-base transition-colors ${heading.level === 3 ? 'pl-6' : 'font-semibold'
                    } ${heading.id === activeId
                      ? 'bg-tcw-accent-100 font-semibold text-tcw-accent-900 dark:bg-tcw-accent-900/20 dark:text-tcw-accent-400'
                      : 'text-taupe-700 hover:bg-taupe-100 dark:text-taupe-300 dark:hover:bg-taupe-800'
                    }`}
                >
                  {heading.text}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </DialogPanel>
    </Dialog>
  )
}
