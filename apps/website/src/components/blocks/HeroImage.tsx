"use client"

import { useState } from "react"
import Image from "next/image"
import type { DirectusFile } from "@/types/directus-schema"
import { ImageLightbox, type LightboxImage } from "@/components/elements/image-lightbox"

interface HeroImageProps {
  file: DirectusFile
}

export function HeroImage({ file }: HeroImageProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!file.id) {
    return null
  }

  const src = `/api/images/${file.id}?key=hero-image`
  const title = file.title ?? ""
  const alt = file.description ?? ""

  const lightboxImages: LightboxImage[] = [
    {
      src,
      alt,
      title,
      description: file.description ?? undefined,
      width: file.width ?? 1200,
      height: file.height ?? 900,
    },
  ]

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="h-full w-full cursor-pointer focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
        aria-label={`Bild öffnen: ${title || alt || "Hero-Bild"}`}
      >
        <Image
          src={src}
          title={title}
          alt={alt}
          width={file.width ?? 800}
          height={file.height ?? 600}
          className="h-full w-full object-cover"
        />
      </button>

      <ImageLightbox
        images={lightboxImages}
        currentIndex={0}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onIndexChange={() => { }}
      />
    </>
  )
}
