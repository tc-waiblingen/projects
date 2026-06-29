import { NextResponse } from 'next/server'

const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#8f1d1d"/>
  <path fill="#fff" d="M14 18h36v8H36v20h-8V26H14z"/>
</svg>`

export function GET() {
  return new NextResponse(icon, {
    headers: {
      'cache-control': 'public, max-age=86400',
      'content-type': 'image/svg+xml; charset=utf-8',
    },
  })
}
