import { createHmac } from 'crypto'

const getSigningSecret = () => {
  const secret = process.env.URL_SIGNING_SECRET
  if (!secret) {
    throw new Error('URL_SIGNING_SECRET environment variable is not set')
  }
  return secret
}

/**
 * Generate an HMAC-SHA256 signature for the given data.
 * Returns a truncated 16-character hex string (64 bits).
 */
export function generateSignature(data: string): string {
  const hmac = createHmac('sha256', getSigningSecret())
  hmac.update(data)
  return hmac.digest('hex').slice(0, 16)
}

/**
 * Verify that a signature matches the expected signature for the given data.
 */
export function verifySignature(data: string, signature: string): boolean {
  const expectedSignature = generateSignature(data)
  // Use timing-safe comparison to prevent timing attacks
  if (signature.length !== expectedSignature.length) {
    return false
  }
  let result = 0
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i)
  }
  return result === 0
}

/**
 * Sign a full URL (for Instagram media proxying).
 * Returns the signature to be appended as a query parameter.
 */
export function signUrl(url: string): string {
  return generateSignature(url)
}

/**
 * Sign an ID with optional params (for Directus asset proxying).
 * Returns the signature to be appended as a query parameter.
 */
export function signId(id: string, params?: string): string {
  const data = params ? `${id}:${params}` : id
  return generateSignature(data)
}
