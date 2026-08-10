import type { DirectusFile } from '@/types/directus-schema'

type FocalImage = Pick<DirectusFile, 'focal_point_x' | 'focal_point_y' | 'width' | 'height'>

export function getImageObjectPosition(file: FocalImage): string | undefined {
  if (
    file.focal_point_x == null ||
    file.focal_point_y == null ||
    !file.width ||
    !file.height
  ) {
    return undefined
  }

  const x = (file.focal_point_x / file.width) * 100
  const y = (file.focal_point_y / file.height) * 100
  return `${x.toFixed(1)}% ${y.toFixed(1)}%`
}
