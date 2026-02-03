'use client'

import { Popover, PopoverBackdrop, PopoverButton, PopoverPanel } from '@headlessui/react'
import { clsx } from 'clsx/lite'
import { Navigation } from '@/types/directus-schema'
import { NavMobileMenu } from './nav-mobile-menu'

function MobileNavIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className="size-6 stroke-tcw-accent-900 dark:stroke-white"
      fill="none"
      strokeWidth={2}
      strokeLinecap="round"
    >
      {/* Top line - drawn at center, translated up when closed, rotates to form X */}
      <path
        d="M4 12h16"
        className={clsx(
          'origin-center transition-transform duration-300',
          open ? 'rotate-45' : '-translate-y-[4px]',
        )}
      />
      {/* Bottom line - drawn at center, translated down when closed, rotates to form X */}
      <path
        d="M4 12h16"
        className={clsx(
          'origin-center transition-transform duration-300',
          open ? '-rotate-45' : 'translate-y-[4px]',
        )}
      />
    </svg>
  )
}

interface MobileNavigationProps {
  navMain: Navigation
  navCTA: Navigation
  currentPath?: string
}

export function MobileNavigation({ navMain, navCTA, currentPath }: MobileNavigationProps) {
  return (
    <Popover className="lg:hidden">
      <PopoverButton
        className="relative z-10 flex size-10 cursor-pointer items-center justify-center rounded-full hover:bg-tcw-accent-900/10 focus:outline-none dark:hover:bg-white/10"
        aria-label="Navigation umschalten"
      >
        {({ open }) => <MobileNavIcon open={open} />}
      </PopoverButton>

      <PopoverBackdrop
        transition
        className="fixed inset-0 bg-tcw-accent-900/30 duration-150 data-closed:opacity-0 data-enter:ease-out data-leave:ease-in dark:bg-black/50"
      />

      <PopoverPanel
        transition
        className="absolute inset-x-4 top-full z-50 mt-4 origin-top rounded-2xl bg-white p-4 shadow-xl ring-1 ring-tcw-accent-900/10 data-closed:scale-95 data-closed:opacity-0 data-enter:duration-150 data-enter:ease-out data-leave:duration-100 data-leave:ease-in dark:bg-tcw-accent-800 dark:ring-white/10 sm:inset-x-6"
      >
        <div className="max-h-[calc(100dvh-12rem)] touch-pan-y overflow-x-hidden overflow-y-auto overscroll-contain">
          <NavMobileMenu navMain={navMain} navCTA={navCTA} currentPath={currentPath} />
        </div>
      </PopoverPanel>
    </Popover>
  )
}
