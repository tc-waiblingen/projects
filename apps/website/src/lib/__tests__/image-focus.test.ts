import { describe, expect, it } from 'vitest'
import { getImageObjectPosition } from '../image-focus'

describe('getImageObjectPosition', () => {
  it('converts Directus focal coordinates to percentages', () => {
    expect(
      getImageObjectPosition({
        focal_point_x: 600,
        focal_point_y: 225,
        width: 1200,
        height: 900,
      }),
    ).toBe('50.0% 25.0%')
  })

  it('accepts a focal point at the image origin', () => {
    expect(
      getImageObjectPosition({
        focal_point_x: 0,
        focal_point_y: 0,
        width: 1200,
        height: 900,
      }),
    ).toBe('0.0% 0.0%')
  })

  it('returns undefined without complete focal metadata', () => {
    expect(
      getImageObjectPosition({
        focal_point_x: null,
        focal_point_y: 225,
        width: 1200,
        height: 900,
      }),
    ).toBeUndefined()
    expect(
      getImageObjectPosition({
        focal_point_x: 600,
        focal_point_y: 225,
        width: null,
        height: 900,
      }),
    ).toBeUndefined()
  })
})
