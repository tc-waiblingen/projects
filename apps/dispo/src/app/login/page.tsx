import { CrestLogo } from '@/components/CrestLogo'

interface LoginPageProps {
  searchParams: Promise<{ next?: string; error?: string }>
}

const ERROR_MESSAGES: Record<string, string> = {
  '1': 'Falsches Passwort.',
  entra_state_missing: 'Anmeldung abgelaufen. Bitte erneut versuchen.',
  entra_exchange_failed: 'Microsoft-Anmeldung fehlgeschlagen.',
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next, error } = await searchParams
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? 'Anmeldung fehlgeschlagen.') : null
  const entraHref = next ? `/api/auth/entra/start?next=${encodeURIComponent(next)}` : '/api/auth/entra/start'

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <CrestLogo className="h-16" />
      <h1 className="text-2xl font-bold text-body">Platzzuweisung</h1>
      <div className="w-full max-w-sm space-y-4 rounded-xl border border-tcw-accent-200 bg-white p-6 shadow-sm dark:border-tcw-accent-800 dark:bg-tcw-accent-900">
        {errorMessage && (
          <p className="rounded bg-tcw-red-50 px-3 py-2 text-sm text-tcw-red-700 dark:bg-tcw-red-900/30 dark:text-tcw-red-50">
            {errorMessage}
          </p>
        )}
        <a
          href={entraHref}
          className="block w-full cursor-pointer rounded-md border border-tcw-accent-300 bg-white px-4 py-2 text-center font-medium text-body hover:bg-tcw-accent-50 dark:border-tcw-accent-700 dark:bg-tcw-accent-900 dark:hover:bg-tcw-accent-800"
        >
          Mit Microsoft anmelden
        </a>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-tcw-accent-200 dark:bg-tcw-accent-800" />
          oder
          <span className="h-px flex-1 bg-tcw-accent-200 dark:bg-tcw-accent-800" />
        </div>
        <form method="post" action="/api/auth/login" className="space-y-4">
          <p className="text-sm text-muted">Mit Passwort anmelden.</p>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            className="w-full rounded-md border border-tcw-accent-300 bg-white px-3 py-2 text-body focus:border-tcw-red-500 focus:outline-none focus:ring-1 focus:ring-tcw-red-500 dark:border-tcw-accent-700 dark:bg-tcw-accent-900"
            placeholder="Passwort"
          />
          {next && <input type="hidden" name="next" value={next} />}
          <button
            type="submit"
            className="w-full cursor-pointer rounded-md bg-tcw-red-700 px-4 py-2 font-medium text-white hover:bg-tcw-red-500"
          >
            Anmelden
          </button>
        </form>
      </div>
    </main>
  )
}
