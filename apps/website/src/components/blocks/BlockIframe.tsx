"use client"

import { useEffect, useRef } from "react"
import type { BlockIframe as BlockIframeType } from "@/types/directus-schema"
import { Section } from "@/components/elements/section"
import { getEditAttr } from "@/lib/visual-editing"

interface BlockIframeProps {
  data: BlockIframeType
}

export function BlockIframe({ data }: BlockIframeProps) {
  const { id, headline, tagline, url, height, height_px, alignment } = data
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Listen for postMessage resize events (for fit-content)
  useEffect(() => {
    if (height !== "fit-content") return

    function handleMessage(event: MessageEvent) {
      if (
        event.data?.type === "resize" &&
        typeof event.data.height === "number" &&
        iframeRef.current
      ) {
        iframeRef.current.style.height = `${event.data.height}px`
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [height])

  if (!url) {
    return null
  }

  const headlineEl = headline ? (
    <span data-directus={getEditAttr({ collection: "block_iframe", item: String(id), fields: "headline" })}>
      {headline}
    </span>
  ) : undefined

  const eyebrowEl = tagline ? (
    <span data-directus={getEditAttr({ collection: "block_iframe", item: String(id), fields: "tagline" })}>
      {tagline}
    </span>
  ) : undefined

  // Determine height style
  const heightStyle =
    height === "fixed" && height_px ? { height: `${height_px}px` } : undefined

  // fit-content gets min-height fallback in case postMessage isn't supported
  const fitContentClass = height === "fit-content" ? "min-h-[400px]" : ""

  return (
    <Section eyebrow={eyebrowEl} headline={headlineEl} alignment={alignment}>
      <iframe
        ref={iframeRef}
        src={url}
        style={heightStyle}
        className={`w-full rounded-lg border-0 ${fitContentClass}`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    </Section>
  )
}
