'use client'

import { useEffect, useState } from 'react'

export function FooterPrintInfo() {
  const [info, setInfo] = useState('')

  useEffect(() => {
    const now = new Date()
    const timestamp = now.toLocaleString('de-DE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
    setInfo(`${window.location.href} — ${timestamp}`)
  }, [])

  return (
    <div className="hidden py-4 text-center text-xs text-muted print:block">
      {info}
    </div>
  )
}
