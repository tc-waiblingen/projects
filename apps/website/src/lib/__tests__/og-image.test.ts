import { describe, expect, it } from 'vitest'
import type { DirectusFile } from '@/types/directus-schema'
import {
  resolveOgImageFromDirectusFile,
  resolveOgImageFromFileId,
} from '../og-image'

const BASE = 'https://tc-waiblingen.de'
const UUID = '8a3b1f42-1111-2222-3333-444444444444'

describe('resolveOgImageFromFileId', () => {
  it('builds a cropped image-proxy URL for a UUID', () => {
    expect(resolveOgImageFromFileId(UUID, 'Some alt', BASE)).toEqual({
      url: `${BASE}/api/images/${UUID}?width=1200&height=630&fit=cover`,
      alt: 'Some alt',
      width: 1200,
      height: 630,
    })
  })

  it('returns null when the file id is missing', () => {
    expect(resolveOgImageFromFileId(null, 'x', BASE)).toBeNull()
    expect(resolveOgImageFromFileId(undefined, 'x', BASE)).toBeNull()
    expect(resolveOgImageFromFileId('', 'x', BASE)).toBeNull()
  })
})

describe('resolveOgImageFromDirectusFile', () => {
  it('accepts a DirectusFile object and uses its id', () => {
    const file = { id: UUID, title: 'Photo' } as DirectusFile
    expect(resolveOgImageFromDirectusFile(file, 'Alt', BASE)).toEqual({
      url: `${BASE}/api/images/${UUID}?width=1200&height=630&fit=cover`,
      alt: 'Alt',
      width: 1200,
      height: 630,
    })
  })

  it('accepts a bare UUID string', () => {
    expect(resolveOgImageFromDirectusFile(UUID, 'Alt', BASE)).toEqual({
      url: `${BASE}/api/images/${UUID}?width=1200&height=630&fit=cover`,
      alt: 'Alt',
      width: 1200,
      height: 630,
    })
  })

  it('falls back to the file title when alt is empty', () => {
    const file = { id: UUID, title: 'Fallback title' } as DirectusFile
    expect(resolveOgImageFromDirectusFile(file, '', BASE)?.alt).toBe('Fallback title')
  })

  it('returns null when the input is null or missing an id', () => {
    expect(resolveOgImageFromDirectusFile(null, 'x', BASE)).toBeNull()
    expect(
      resolveOgImageFromDirectusFile({ id: '' } as DirectusFile, 'x', BASE),
    ).toBeNull()
  })
})
