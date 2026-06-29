import { hash, verify } from '@node-rs/argon2'

const ARGON2_OPTIONS = {
  memoryCost: 32 * 1024,
  timeCost: 5,
  parallelism: 1,
} as const

export async function hashViewerPassword(plain: string): Promise<string> {
  const trimmed = plain.trim()
  if (!trimmed) return ''
  if (trimmed.length < 4) {
    throw new Error('Viewer password must be at least 4 characters')
  }
  return hash(trimmed, ARGON2_OPTIONS)
}

export async function verifyViewerPassword(encoded: string | null | undefined, provided: string | undefined): Promise<boolean> {
  if (provided === undefined) return false
  if (encoded === '') return provided.trim() === ''
  if (!encoded) return false
  try {
    return await verify(encoded, provided.trim())
  } catch {
    return false
  }
}
