'use client'

import { lazy, Suspense, useState, type MouseEvent, type ReactNode } from 'react'
import type { Sponsor } from '@/types/directus-schema'

const SponsorDialog = lazy(() =>
  import('@/components/elements/sponsor-dialog').then((mod) => ({
    default: mod.SponsorDialog,
  }))
)

interface SponsorsDialogProviderProps {
  sponsors: Sponsor[]
  children: ReactNode
}

export function SponsorsDialogProvider({ sponsors, children }: SponsorsDialogProviderProps) {
  const [selectedSponsor, setSelectedSponsor] = useState<Sponsor | null>(null)

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target
    if (!(target instanceof Element)) return

    const button = target.closest<HTMLElement>('[data-sponsor-id]')
    if (!button || !event.currentTarget.contains(button)) return

    const sponsorId = button.dataset.sponsorId
    const sponsor = sponsors.find((item) => String(item.id) === sponsorId)
    if (sponsor) {
      setSelectedSponsor(sponsor)
    }
  }

  return (
    <>
      <div onClick={handleClick}>{children}</div>
      {selectedSponsor && (
        <Suspense fallback={null}>
          <SponsorDialog
            isOpen
            onClose={() => setSelectedSponsor(null)}
            sponsors={selectedSponsor}
          />
        </Suspense>
      )}
    </>
  )
}
