interface LoginPageProps {
  searchParams: Promise<{ next?: string; error?: string }>
}

const ERROR_MESSAGES: Record<string, string> = {
  entra_state_missing: 'Anmeldung abgelaufen. Bitte erneut versuchen.',
  entra_exchange_failed: 'Microsoft-Anmeldung fehlgeschlagen.',
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next, error } = await searchParams
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? 'Anmeldung fehlgeschlagen.') : null
  const entraHref = next ? `/api/auth/entra/start?next=${encodeURIComponent(next)}` : '/api/auth/entra/start'
  const devAuthHref = next ? `/api/auth/dev?next=${encodeURIComponent(next)}` : '/api/auth/dev'
  const devAuthEnabled = process.env.NODE_ENV !== 'production' && process.env.PRESENT_DEV_AUTH === '1'

  return (
    <main className="flex min-h-screen items-center justify-center bg-taupe-100 p-6">
      <div className="w-full max-w-sm rounded-lg border border-tcw-accent-200 bg-white p-6 shadow-sm">
        <p className="mb-2 text-xs font-bold uppercase text-tcw-red-700">TCW Present</p>
        <h1 className="mb-5 text-2xl font-bold text-body">Moderator login</h1>
        {errorMessage && <p className="mb-4 rounded-md bg-tcw-red-50 px-3 py-2 text-sm text-tcw-red-700">{errorMessage}</p>}
        <a href={entraHref} className="block cursor-pointer rounded-md bg-tcw-red-700 px-4 py-2 text-center font-semibold text-white hover:bg-tcw-red-500">
          Mit Microsoft anmelden
        </a>
        {devAuthEnabled && (
          <a href={devAuthHref} className="mt-3 block cursor-pointer rounded-md border border-tcw-accent-200 px-4 py-2 text-center font-semibold text-body hover:bg-tcw-accent-50">
            Local dev login
          </a>
        )}
      </div>
    </main>
  )
}
