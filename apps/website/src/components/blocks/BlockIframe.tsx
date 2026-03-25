"use client"

import { useEffect, useMemo, useRef } from "react"
import type { BlockIframe as BlockIframeType } from "@/types/directus-schema"
import { Section } from "@/components/elements/section"
import { getEditAttr } from "@/lib/visual-editing"

interface BlockIframeProps {
  data: BlockIframeType
}

export function BlockIframe({ data }: BlockIframeProps) {
  const { id, headline, tagline, url, height, height_px, alignment } = data
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const iframeOrigin = useMemo(() => {
    try {
      return url ? new URL(url).origin : null
    } catch {
      return null
    }
  }, [url])

  // Listen for postMessage events from the iframe
  useEffect(() => {
    if (!iframeOrigin) return

    function handleMessage(event: MessageEvent) {
      if (event.origin !== iframeOrigin) return

      switch (event.data?.type) {
        case "resize":
          if (
            height === "fit-content" &&
            typeof event.data.height === "number" &&
            iframeRef.current
          ) {
            iframeRef.current.style.height = `${event.data.height}px`
          }
          break
        case "ebusy.frame-scroll":
          console.debug("[BlockIframe] frame-scroll event received")
          break
        case "ebusy.redirect":
          console.debug("[BlockIframe] redirect event received:", event.data.url)
          break
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [height, iframeOrigin])

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
  const heightClass =
    height === "fit-content"
      ? "min-h-[400px]"
      : height === "viewport"
        ? "h-[calc(100dvh-var(--scroll-padding-top)-4rem)]"
        : ""

  return (
    <Section eyebrow={eyebrowEl} headline={headlineEl} alignment={alignment}>
      <iframe
        ref={iframeRef}
        src={url}
        style={heightStyle}
        className={`w-full rounded-lg border-0 ${heightClass}`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    </Section>
  )
}
