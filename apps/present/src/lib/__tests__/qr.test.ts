// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createQrDataUrl } from '../qr'

describe('qr', () => {
  it('generates a square PNG data URL at the requested size', async () => {
    const dataUrl = await createQrDataUrl('https://present.tc-waiblingen.de/p/WAI-0626', 420)
    const png = pngFromDataUrl(dataUrl)

    expect(dataUrl).toMatch(/^data:image\/png;base64,/)
    expect(png.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    expect(png.toString('ascii', 12, 16)).toBe('IHDR')
    expect(png.readUInt32BE(16)).toBe(420)
    expect(png.readUInt32BE(20)).toBe(420)
  })
})

function pngFromDataUrl(dataUrl: string): Buffer {
  const [, base64] = dataUrl.split(',')
  if (!base64) throw new Error('Missing data URL payload')
  return Buffer.from(base64, 'base64')
}
