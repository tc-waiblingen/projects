'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import type { CourtStatus } from '@/lib/tv/fetchers'

interface CourtStatusMapProps {
  svg: string
  courts: CourtStatus[]
  /** 'compact' scales the overlay labels down for small embeds (e.g. card in another screen). */
  size?: 'default' | 'compact'
}

interface CourtRect {
  x: number
  y: number
  width: number
  height: number
}

const FREE_FILL = 'rgba(34, 197, 94, 0.55)'
const BUSY_FILL = 'rgba(239, 68, 68, 0.55)'

// Tailwind orange-500 (249, 115, 22) → red-600 (220, 38, 38). The label
// starts orange when ≤ 15 min remain, fades to the full red by 45 min.
const LABEL_ORANGE = [249, 115, 22] as const
const LABEL_RED = [220, 38, 38] as const

function labelBackground(endsAt: string, now: Date): string {
  const match = endsAt.match(/^(\d{2}):(\d{2})$/)
  if (!match) return `rgba(${LABEL_RED.join(', ')}, 0.9)`
  const [, hh, mm] = match
  const end = new Date(now)
  end.setHours(Number(hh), Number(mm), 0, 0)
  const minutesRemaining = (end.getTime() - now.getTime()) / 60000

  const t = Math.max(0, Math.min(1, (minutesRemaining - 15) / 30))
  const r = Math.round(LABEL_ORANGE[0] + (LABEL_RED[0] - LABEL_ORANGE[0]) * t)
  const g = Math.round(LABEL_ORANGE[1] + (LABEL_RED[1] - LABEL_ORANGE[1]) * t)
  const b = Math.round(LABEL_ORANGE[2] + (LABEL_RED[2] - LABEL_ORANGE[2]) * t)
  return `rgba(${r}, ${g}, ${b}, 0.9)`
}

export function CourtStatusMap({ svg, courts, size = 'default' }: CourtStatusMapProps) {
  const labelClasses =
    size === 'compact'
      ? 'rounded px-1 py-0 text-center text-[10px] leading-tight font-semibold text-white shadow-sm'
      : 'rounded-md px-2 py-0.5 text-center tv-small font-semibold text-white shadow-sm'
  const containerRef = useRef<HTMLDivElement>(null)
  const [positions, setPositions] = useState<Record<string, CourtRect>>({})

  // SVG is fetched server-side from our own Directus instance with the
  // private DIRECTUS_TOKEN, so it is trusted. Parse it with DOMParser and
  // mount the resulting node so we can query and mutate individual court
  // elements later.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const parser = new DOMParser()
    const doc = parser.parseFromString(svg, 'image/svg+xml')
    const svgNode = doc.documentElement
    if (!svgNode || svgNode.tagName.toLowerCase() !== 'svg') return
    container.replaceChildren(svgNode)
  }, [svg])

  const applyStyles = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const svgEl = container.querySelector('svg')
    if (!svgEl) return

    const containerRect = container.getBoundingClientRect()
    const next: Record<string, CourtRect> = {}

    for (const court of courts) {
      const selectors = [`#${CSS.escape(court.name)}`, `[id="${court.name}"]`, `[data-name="${court.name}"]`]
      let element: Element | null = null
      for (const selector of selectors) {
        try {
          element = svgEl.querySelector(selector)
          if (element) break
        } catch {
          // invalid selector, skip
        }
      }
      if (!element) continue

      const fill = court.busy ? BUSY_FILL : FREE_FILL
      element.setAttribute('style', `fill: ${fill}; transition: fill 400ms ease;`)

      const rect = element.getBoundingClientRect()
      next[court.name] = {
        x: rect.left - containerRect.left,
        y: rect.top - containerRect.top,
        width: rect.width,
        height: rect.height,
      }
    }

    setPositions(next)
  }, [courts])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const timer = setTimeout(applyStyles, 100)
    const resizeObserver = new ResizeObserver(applyStyles)
    resizeObserver.observe(container)
    return () => {
      clearTimeout(timer)
      resizeObserver.disconnect()
    }
  }, [applyStyles, svg])

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        ref={containerRef}
        className="h-full w-full [&_svg]:h-full [&_svg]:max-h-full [&_svg]:w-full [&_svg]:max-w-full"
      />

      {courts.map((court) => {
        const rect = positions[court.name]
        if (!rect) return null
        const centerX = rect.x + rect.width / 2
        const centerY = rect.y + rect.height / 2
        const isPortrait = rect.height > rect.width
        const background =
          court.busy && court.currentEndsAt ? labelBackground(court.currentEndsAt, new Date()) : undefined

        return (
          <div
            key={court.directusId}
            className="pointer-events-none absolute flex flex-col items-center gap-1"
            style={{
              left: centerX,
              top: centerY,
              transform: isPortrait
                ? 'translate(-50%, -50%) rotate(90deg)'
                : 'translate(-50%, -50%)',
            }}
          >
            {court.busy && court.currentEndsAt && (
              <span className={clsx(labelClasses)} style={{ backgroundColor: background }}>
                Belegt bis
                <br />
                {court.currentEndsAt} Uhr
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
