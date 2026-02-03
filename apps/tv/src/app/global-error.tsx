'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
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
          <h1
            style={{
              fontSize: '1.875rem',
              fontWeight: 500,
              color: '#2e2b22',
              margin: 0,
            }}
          >
            Etwas ist schiefgelaufen
          </h1>
          <p
            style={{
              marginTop: '1rem',
              color: '#6a6460',
            }}
          >
            Die Website kann momentan nicht geladen werden.
          </p>
          <button
            onClick={() => reset()}
            style={{
              marginTop: '2rem',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'white',
              backgroundColor: '#2e2b22',
              border: 'none',
              borderRadius: '9999px',
              cursor: 'pointer',
            }}
          >
            Erneut versuchen
          </button>
        </div>
      </body>
    </html>
  )
}
