"use client"

import { useState } from "react"
import Image from "next/image"
import { ImageLightbox } from "@/components/elements/image-lightbox"

interface EventImageProps {
  src: string
  alt?: string
}

export function EventImage({ src, alt = "" }: EventImageProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="cursor-pointer rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
        aria-label={alt ? `Bild öffnen: ${alt}` : "Bild vergrößern"}
      >
        <Image
          src={src}
          alt={alt}
          width={128}
          height={128}
          className="max-w-32 h-auto rounded transition-opacity hover:opacity-90"
          unoptimized
        />
      </button>

      <ImageLightbox
        images={[{ src, alt }]}
        currentIndex={0}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onIndexChange={() => {}}
      />
    </>
  )
}
