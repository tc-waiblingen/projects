"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Image from "next/image"
import type { DirectusFile, Sponsor } from "@/types/directus-schema"
import { SponsorDialog } from "@/components/elements/sponsor-dialog"

interface SitePlanMapProps {
  areaMapId: string
  courtSponsorsMap: Record<string, Sponsor[]>
}

interface CourtPosition {
  x: number
  y: number
  width: number
  height: number
}

interface DialogState {
  open: boolean
  courtName: string
  sponsors: Sponsor[]
}

export function SitePlanMap({ areaMapId, courtSponsorsMap }: SitePlanMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svgContent, setSvgContent] = useState<string | null>(null)
  const [courtPositions, setCourtPositions] = useState<Record<string, CourtPosition>>({})
  const [dialog, setDialog] = useState<DialogState>({
    open: false,
    courtName: "",
    sponsors: [],
  })

  // Fetch SVG content
  useEffect(() => {
    async function fetchSvg() {
      try {
        const response = await fetch(`/api/images/${areaMapId}`)
        const text = await response.text()
        setSvgContent(text)
      } catch (error) {
        console.error("Failed to fetch SVG:", error)
      }
    }
    fetchSvg()
  }, [areaMapId])

  // Calculate court positions after SVG renders
  const calculatePositions = useCallback(() => {
    if (!containerRef.current) return

    const svg = containerRef.current.querySelector("svg")
    if (!svg) return

    const containerRect = containerRef.current.getBoundingClientRect()
    const courtNames = Object.keys(courtSponsorsMap)
    const positions: Record<string, CourtPosition> = {}

    for (const courtName of courtNames) {
      const sponsors = courtSponsorsMap[courtName]
      if (!sponsors || sponsors.length === 0) continue

      // Find the court element by ID
      const selectors = [
        `#${CSS.escape(courtName)}`,
        `[id="${courtName}"]`,
        `[data-name="${courtName}"]`,
      ]

      for (const selector of selectors) {
        try {
          const element = svg.querySelector(selector)
          if (element) {
            const rect = element.getBoundingClientRect()
            positions[courtName] = {
              x: rect.left - containerRect.left,
              y: rect.top - containerRect.top,
              width: rect.width,
              height: rect.height,
            }
            break
          }
        } catch {
          // Invalid selector, skip
        }
      }
    }

    setCourtPositions(positions)
  }, [courtSponsorsMap])

  // Calculate positions after SVG loads and on resize
  useEffect(() => {
    if (!svgContent || !containerRef.current) return

    // Wait for SVG to render
    const timer = setTimeout(calculatePositions, 100)

    // Recalculate on resize
    const resizeObserver = new ResizeObserver(() => {
      calculatePositions()
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      clearTimeout(timer)
      resizeObserver.disconnect()
    }
  }, [svgContent, calculatePositions])

  const openDialog = useCallback((courtName: string, sponsors: Sponsor[]) => {
    setDialog({ open: true, courtName, sponsors })
  }, [])

  const closeDialog = useCallback(() => {
    setDialog((prev) => ({ ...prev, open: false }))
  }, [])

  if (!svgContent) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg bg-tcw-accent-100 dark:bg-tcw-accent-800">
        <span className="text-tcw-accent-500">Lageplan wird geladen...</span>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* SVG from our own /api/images endpoint (admin-uploaded Directus assets; not user input). */}
      <div
        ref={containerRef}
        className="w-full [&_svg]:h-auto [&_svg]:w-full"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />

      {/* Sponsor Logo Overlays */}
      {Object.entries(courtPositions).map(([courtName, position]) => {
        const sponsors = courtSponsorsMap[courtName]
        const sponsor = sponsors?.[0]
        if (!sponsor) return null

        const logo = sponsor.logo_web as DirectusFile | null
        const hasLogo = logo && typeof logo !== "string"

        // Determine if court is portrait (taller than wide)
        const isPortrait = position.height > position.width

        // For portrait courts, swap dimensions so the rotated card fits properly
        const cardWidth = isPortrait ? position.height * 0.5 : position.width * 0.5
        const cardHeight = isPortrait ? position.width * 0.5 : position.height * 0.5

        // Center the card over the court
        const courtCenterX = position.x + position.width / 2
        const courtCenterY = position.y + position.height / 2

        return (
          <button
            key={courtName}
            className="absolute flex cursor-pointer items-center justify-center rounded-md bg-white p-1.5 shadow-sm transition-shadow hover:shadow-md"
            style={{
              left: courtCenterX - cardWidth / 2,
              top: courtCenterY - cardHeight / 2,
              width: cardWidth,
              height: cardHeight,
              transform: isPortrait ? "rotate(90deg)" : undefined,
            }}
            onClick={() => openDialog(courtName, sponsors)}
            aria-label={`Sponsor: ${sponsor.name}`}
          >
            {hasLogo ? (
              <Image
                src={`/api/images/${logo.id}`}
                alt={sponsor.name}
                width={logo.width ?? 200}
                height={logo.height ?? 100}
                className="h-full w-full object-contain"
                unoptimized
              />
            ) : (
              <span className="text-xs font-medium text-tcw-accent-700">
                {sponsor.name}
              </span>
            )}
          </button>
        )
      })}

      {/* Sponsor Dialog */}
      <SponsorDialog
        isOpen={dialog.open}
        onClose={closeDialog}
        sponsors={dialog.sponsors}
        title={dialog.courtName}
      />
    </div>
  )
}
