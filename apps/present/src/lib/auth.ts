import { cookies } from 'next/headers'
import { jwtVerify, SignJWT } from 'jose'

export const COOKIE_NAME = 'present_session'
export const MAX_AGE_SECONDS = 60 * 60 * 20

export type Role = 'admin' | 'moderator'

export interface Session {
  sub: string
  role: Role
  name?: string
}

const ALG = 'HS256'

function getSecret(): Uint8Array {
  const secret = process.env.PRESENT_SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('PRESENT_SESSION_SECRET must be set to a string of at least 32 characters')
  }
  return new TextEncoder().encode(secret)
}

export async function signSessionToken(session: Session, now: number = Date.now()): Promise<string> {
  const iat = Math.floor(now / 1000)
  const claims: Record<string, unknown> = { role: session.role }
  if (session.name) claims.name = session.name
  return new SignJWT(claims)
    .setProtectedHeader({ alg: ALG })
    .setSubject(session.sub)
    .setIssuedAt(iat)
    .setExpirationTime(iat + MAX_AGE_SECONDS)
    .sign(getSecret())
}

export async function verifySessionToken(token: string | undefined): Promise<Session | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: [ALG] })
    if (typeof payload.sub !== 'string' || (payload.role !== 'admin' && payload.role !== 'moderator')) {
      return null
    }
    const session: Session = { sub: payload.sub, role: payload.role }
    if (typeof payload.name === 'string') session.name = payload.name
    return session
  } catch {
    return null
  }
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies()
  return verifySessionToken(store.get(COOKIE_NAME)?.value)
}
