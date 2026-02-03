"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import type {
  BlockGallery as BlockGalleryType,
  DirectusFile,
} from "@/types/directus-schema"
import { Section } from "@/components/elements/section"
import { ImageLightbox, type LightboxImage } from "@/components/elements/image-lightbox"
import { getEditAttr } from "@/lib/visual-editing"

interface BlockGalleryProps {
  data: BlockGalleryType
}

export function BlockGallery({ data }: BlockGalleryProps) {
  const { id, headline, tagline, items, id: galleryId } = data
  const [isOpen, setIsOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  const eyebrow = tagline ? (
    <span data-directus={getEditAttr({ collection: "block_gallery", item: String(id), fields: "tagline" })}>
      {tagline}
    </span>
  ) : undefined

  // Filter valid gallery items
  const galleryItems =
    items?.filter((item) => {
      if (typeof item === "string") return false
      const file = item.directus_file
      return file && typeof file !== "string" && file.id
    }) ?? []

  // Convert to LightboxImage format
  const lightboxImages: LightboxImage[] = galleryItems.map((item) => {
    if (typeof item === "string") {
      return { src: "" }
    }
    const file = item.directus_file as DirectusFile
    return {
      src: `/api/images/${file.id}`,
      alt: file.description ?? "",
      title: file.title ?? "",
      description: file.description ?? undefined,
      width: file.width ?? 1200,
      height: file.height ?? 900,
    }
  })

  const openLightbox = (index: number) => {
    setCurrentIndex(index)
    setIsOpen(true)
  }

  const closeLightbox = () => {
    setIsOpen(false)
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search
    )
  }

  // Sync URL hash when lightbox is open
  useEffect(() => {
    if (isOpen) {
      window.history.replaceState(
        null,
        "",
        `#gallery-${galleryId}-${currentIndex}`
      )
    }
  }, [isOpen, currentIndex, galleryId])

  // Check URL on mount and open lightbox if matching hash
  useEffect(() => {
    const hash = window.location.hash
    const match = hash.match(/^#gallery-(.+)-(\d+)$/)

    const matchedId = match?.[1]
    const matchedIndex = match?.[2]
    if (matchedId === galleryId && matchedIndex && galleryItems.length > 0) {
      const index = parseInt(matchedIndex, 10)
      const validIndex = Math.max(0, Math.min(index, galleryItems.length - 1))
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: synchronizing state with URL on mount
      setCurrentIndex(validIndex)
      setIsOpen(true)
    }
  }, [galleryId, galleryItems.length])

  return (
    <Section
      eyebrow={eyebrow}
      headline={
        headline ? (
          <span data-directus={getEditAttr({ collection: "block_gallery", item: String(id), fields: "headline" })}>
            {headline}
          </span>
        ) : undefined
      }
      data-directus={getEditAttr({ collection: "block_gallery", item: String(id), fields: "items" })}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {galleryItems.map((item, index) => {
          if (typeof item === "string") return null
          const file = item.directus_file as DirectusFile

          return (
            <GalleryImage
              key={item.id}
              file={file}
              onClick={() => openLightbox(index)}
            />
          )
        })}
      </div>

      <ImageLightbox
        images={lightboxImages}
        currentIndex={currentIndex}
        isOpen={isOpen}
        onClose={closeLightbox}
        onIndexChange={setCurrentIndex}
      />
    </Section>
  )
}

interface GalleryImageProps {
  file: DirectusFile
  onClick: () => void
}

function GalleryImage({ file, onClick }: GalleryImageProps) {
  if (!file.id) {
    return null
  }

  const src = `/api/images/${file.id}`
  const title = file.description || file.title || ""
  const alt = file.description ?? ""

  return (
    <button
      onClick={onClick}
      className="aspect-4/3 w-full cursor-pointer overflow-hidden rounded-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
      aria-label={`Bild öffnen: ${title || "Galeriebild"}`}
    >
      <Image
        src={src}
        title={title}
        alt={alt}
        width={file.width ?? 800}
        height={file.height ?? 600}
        className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
      />
    </button>
  )
}
