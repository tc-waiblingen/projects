import Image from "next/image"
import type { DirectusFile } from "@/types/directus-schema"

interface HeroImageProps {
  file: DirectusFile
  sizes?: string
}

export function HeroImage({ file, sizes = "(min-width: 1024px) 50vw, 100vw" }: HeroImageProps) {
  if (!file.id) {
    return null
  }

  return (
    <Image
      src={`/api/images/${file.id}?key=hero-image`}
      alt={file.description?.trim() ?? ""}
      width={file.width ?? 800}
      height={file.height ?? 600}
      loading="eager"
      sizes={sizes}
      className="h-full w-full object-cover"
    />
  )
}
