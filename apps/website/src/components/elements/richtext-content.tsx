"use client"

import { useState, useMemo, createElement } from "react"
import Image from "next/image"
import { parse, HTMLElement, TextNode, Node } from "node-html-parser"
import { ImageLightbox, type LightboxImage } from "./image-lightbox"
import type { DirectusFile } from "@/types/directus-schema"

interface RichtextContentProps {
  html: string
  fileMetadata?: Record<string, DirectusFile>
}

/** Table elements that don't allow whitespace text children */
const TABLE_ELEMENTS = new Set([
  "table",
  "tbody",
  "thead",
  "tfoot",
  "tr",
  "colgroup",
])

/** HTML attributes that need camelCase conversion for React */
const HTML_TO_REACT_ATTRS: Record<string, string> = {
  colspan: "colSpan",
  rowspan: "rowSpan",
  cellpadding: "cellPadding",
  cellspacing: "cellSpacing",
  tabindex: "tabIndex",
  readonly: "readOnly",
  maxlength: "maxLength",
  minlength: "minLength",
  for: "htmlFor",
  autocomplete: "autoComplete",
  autofocus: "autoFocus",
}

/** Extract file ID from transformed URL like "/api/images/{id}?key=..." */
function extractFileIdFromSrc(src: string): string | null {
  const match = src.match(/\/api\/images\/([^?/]+)/)
  return match?.[1] ?? null
}

export function RichtextContent({ html, fileMetadata }: RichtextContentProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  const { content, images } = useMemo(() => {
    const collectedImages: LightboxImage[] = []

    function nodeToReact(
      node: Node,
      key: number,
      parentTag?: string
    ): React.ReactNode {
      if (node instanceof TextNode) {
        // Skip whitespace-only text nodes inside table elements (causes hydration errors)
        if (parentTag && TABLE_ELEMENTS.has(parentTag)) {
          if (/^\s*$/.test(node.text)) {
            return null
          }
        }
        return node.text
      }

      if (!(node instanceof HTMLElement)) {
        return null
      }

      const tag = node.tagName?.toLowerCase()

      if (tag === "img") {
        const src = node.getAttribute("src") || ""
        const alt = node.getAttribute("alt") || ""
        const title = node.getAttribute("title") || ""
        const width = parseInt(node.getAttribute("width") || "0", 10)
        const height = parseInt(node.getAttribute("height") || "0", 10)

        // Look up Directus metadata if available
        const fileId = extractFileIdFromSrc(src)
        const metadata = fileId ? fileMetadata?.[fileId] : undefined
        const isSvg = metadata?.type === "image/svg+xml"

        const imageIndex = collectedImages.length
        collectedImages.push({
          src,
          alt: metadata?.description || alt || undefined,
          title: metadata?.title || title || undefined,
          description: metadata?.description || undefined,
          width: metadata?.width || width || 1200,
          height: metadata?.height || height || 900,
          type: metadata?.type || undefined,
        })

        // SVGs: use regular img tag (no optimization needed, better sizing)
        if (isSvg) {
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={key}
              src={src}
              alt={metadata?.description || alt}
              title={metadata?.title || title || undefined}
              className="w-full cursor-pointer transition-opacity hover:opacity-80"
              onClick={() => {
                setCurrentIndex(imageIndex)
                setIsOpen(true)
              }}
            />
          )
        }

        // Raster images: use Next.js Image with fill mode
        const aspectRatio =
          metadata?.width && metadata?.height
            ? metadata.width / metadata.height
            : width && height
              ? width / height
              : 16 / 9

        return (
          <span
            key={key}
            className="relative block w-full cursor-pointer overflow-hidden transition-opacity hover:opacity-80"
            style={{ aspectRatio }}
            onClick={() => {
              setCurrentIndex(imageIndex)
              setIsOpen(true)
            }}
          >
            <Image
              src={src}
              alt={metadata?.description || alt}
              title={metadata?.title || title || undefined}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 800px"
            />
          </span>
        )
      }

      const children = node.childNodes.map((child, i) =>
        nodeToReact(child, i, tag)
      )

      // Map HTML attributes to React props
      const attrs: Record<string, unknown> = {}
      for (const [name, value] of Object.entries(node.attributes)) {
        if (name === "class") {
          attrs.className = value
        } else if (name === "style") {
          // Parse inline style string to object
          const styleObj: Record<string, string> = {}
          value.split(";").forEach((rule) => {
            const [prop, val] = rule.split(":").map((s) => s.trim())
            if (prop && val) {
              // Convert kebab-case to camelCase
              const camelProp = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
              styleObj[camelProp] = val
            }
          })
          attrs.style = styleObj
        } else {
          // Convert HTML attributes to React camelCase equivalents
          const reactAttr = HTML_TO_REACT_ATTRS[name] || name
          attrs[reactAttr] = value
        }
      }

      return createElement(tag, { key, ...attrs }, ...children)
    }

    const root = parse(html)
    const reactContent = root.childNodes.map((node, i) => nodeToReact(node, i))

    return { content: reactContent, images: collectedImages }
  }, [html, fileMetadata])

  return (
    <>
      <div>{content}</div>
      {images.length > 0 && (
        <ImageLightbox
          images={images}
          currentIndex={currentIndex}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onIndexChange={setCurrentIndex}
        />
      )}
    </>
  )
}
