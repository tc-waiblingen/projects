import type { NextRequest } from "next/server"

function firstHeaderValue(value: string | null): string | undefined {
  if (!value) return undefined
  const first = value.split(",")[0]?.trim()
  return first || undefined
}

export function publicOrigin(request: NextRequest): string {
  const headers = request.headers
  const proto =
    firstHeaderValue(headers.get("x-forwarded-proto")) ??
    request.nextUrl.protocol.replace(/:$/, "")
  const host =
    firstHeaderValue(headers.get("x-forwarded-host")) ??
    firstHeaderValue(headers.get("host")) ??
    request.nextUrl.host
  return `${proto}://${host}`
}

export function publicUrl(path: string, request: NextRequest): URL {
  return new URL(path, publicOrigin(request))
}
