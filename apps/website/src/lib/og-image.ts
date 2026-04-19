import type { DirectusFile } from '@/types/directus-schema'

export const OG_WIDTH = 1200
export const OG_HEIGHT = 630

export interface OgImage {
  url: string
  alt: string
  width: number
  height: number
}

export function buildDynamicOgImage(
  title: string,
  kicker: string | undefined,
  baseUrl: string,
): OgImage {
  const params = new URLSearchParams({ title })
  if (kicker) params.set('kicker', kicker)
  return {
    url: `${baseUrl}/api/og?${params.toString()}`,
    alt: title,
    width: OG_WIDTH,
    height: OG_HEIGHT,
  }
}

function buildImageProxyUrl(fileId: string, baseUrl: string): string {
  return `${baseUrl}/api/images/${fileId}?width=${OG_WIDTH}&height=${OG_HEIGHT}&fit=cover`
}

export function resolveOgImageFromFileId(
  fileId: string | null | undefined,
  alt: string,
  baseUrl: string,
): OgImage | null {
  if (!fileId) return null
  return {
    url: buildImageProxyUrl(fileId, baseUrl),
    alt,
    width: OG_WIDTH,
    height: OG_HEIGHT,
  }
}

export function resolveOgImageFromDirectusFile(
  file: DirectusFile | string | null | undefined,
  alt: string,
  baseUrl: string,
): OgImage | null {
  if (!file) return null

  const id = typeof file === 'string' ? file : file.id
  if (!id) return null

  const effectiveAlt = alt || (typeof file === 'object' ? file.title ?? '' : '')

  return {
    url: buildImageProxyUrl(id, baseUrl),
    alt: effectiveAlt,
    width: OG_WIDTH,
    height: OG_HEIGHT,
  }
}
