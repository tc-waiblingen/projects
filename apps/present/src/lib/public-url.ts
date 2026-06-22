import type { NextRequest } from 'next/server'

export function publicUrl(pathname: string, request?: NextRequest): URL {
  const configured = process.env.PRESENT_PUBLIC_URL
  if (configured) return new URL(pathname, configured)
  if (request) return new URL(pathname, request.url)
  return new URL(pathname, 'http://localhost:3003')
}

export function safeNext(raw: string | null): string {
  if (!raw) return '/presentations'
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/presentations'
  return raw
}
