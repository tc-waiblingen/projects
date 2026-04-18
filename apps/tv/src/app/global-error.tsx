'use client'

import { useEffect } from 'react'

export default function GlobalError() {
  useEffect(() => {
    const timeout = setTimeout(() => {
      window.location.reload()
    }, 30000)
    return () => clearTimeout(timeout)
  }, [])

  return (
    <html lang="de">
      <body
        style={{
          margin: 0,
          fontFamily:
            'Open Sans, ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
          backgroundColor: '#f5f4f3',
          color: '#3d3834',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '1.5rem',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontSize: '1.875rem',
              color: '#6a6460',
              margin: 0,
              maxWidth: '48rem',
            }}
          >
            Hier gibt es leider ein Problem. Wir versuchen es gleich nochmal.
          </p>
        </div>
      </body>
    </html>
  )
}
