'use client'

import { useEffect, useRef } from 'react'

export function FooterPrintInfo() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const timestamp = new Date().toLocaleString('de-DE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
    node.textContent = `${window.location.href} — ${timestamp}`
  }, [])

  return (
    <div
      ref={ref}
      className="hidden py-4 text-center text-xs text-muted print:block"
    />
  )
}
