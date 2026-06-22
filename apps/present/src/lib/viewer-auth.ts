import { cookies } from 'next/headers'
import { jwtVerify, SignJWT } from 'jose'

export const VIEWER_COOKIE_NAME = 'present_viewer'
export const VIEWER_MAX_AGE_SECONDS = 60 * 60 * 8

export interface ViewerSession {
  presentationId: number
  code: string
  viewerId: string
}

const ALG = 'HS256'

function getSecret(): Uint8Array {
  const secret = process.env.PRESENT_SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('PRESENT_SESSION_SECRET must be set to a string of at least 32 characters')
  }
  return new TextEncoder().encode(secret)
}

export async function signViewerToken(session: ViewerSession, now: number = Date.now()): Promise<string> {
  const iat = Math.floor(now / 1000)
  return new SignJWT({ presentationId: session.presentationId, code: session.code })
    .setProtectedHeader({ alg: ALG })
    .setSubject(session.viewerId)
    .setIssuedAt(iat)
    .setExpirationTime(iat + VIEWER_MAX_AGE_SECONDS)
    .sign(getSecret())
}

export async function verifyViewerToken(token: string | undefined): Promise<ViewerSession | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: [ALG] })
    if (typeof payload.sub !== 'string' || typeof payload.code !== 'string' || typeof payload.presentationId !== 'number') {
      return null
    }
    return { viewerId: payload.sub, code: payload.code, presentationId: payload.presentationId }
  } catch {
    return null
  }
}

export function viewerCookieName(code: string): string {
  return `${VIEWER_COOKIE_NAME}_${code.toLowerCase()}`
}

export async function getViewerSession(code: string): Promise<ViewerSession | null> {
  const store = await cookies()
  return verifyViewerToken(store.get(viewerCookieName(code))?.value)
}
