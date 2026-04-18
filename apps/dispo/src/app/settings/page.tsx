import { AdminHeader } from '@/components/AdminHeader'
import { getSession } from '@/lib/auth'
import { getPasswordHash } from '@/lib/settings'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface SettingsPageProps {
  searchParams: Promise<{ saved?: string; error?: string }>
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const session = await getSession()
  if (session?.role !== 'admin') redirect('/')

  const { saved, error } = await searchParams
  const hasPassword = getPasswordHash() !== null

  return (
    <main className="mx-auto max-w-2xl p-6">
      <AdminHeader subtitle="Einstellungen" />

      <section className="rounded-xl border border-tcw-accent-200 bg-white p-6 shadow-sm dark:border-tcw-accent-800 dark:bg-tcw-accent-900">
        <h2 className="mb-1 text-base font-semibold text-body">Operator-Passwort</h2>
        <p className="mb-4 text-sm text-muted">
          {hasPassword
            ? 'Ein Passwort ist gesetzt. Neues Passwort eingeben, um es zu ersetzen.'
            : 'Noch kein Passwort gesetzt. Operator-Login ist deaktiviert, bis ein Passwort vergeben wurde.'}
        </p>

        {saved && (
          <p className="mb-4 rounded bg-tcw-accent-50 px-3 py-2 text-sm text-body dark:bg-tcw-accent-800">
            Passwort gespeichert.
          </p>
        )}
        {error && (
          <p className="mb-4 rounded bg-tcw-red-50 px-3 py-2 text-sm text-tcw-red-700 dark:bg-tcw-red-900/30 dark:text-tcw-red-50">
            {error === 'empty' ? 'Passwort darf nicht leer sein.' : 'Speichern fehlgeschlagen.'}
          </p>
        )}

        <form method="post" action="/api/settings/password" className="space-y-4">
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={1}
            className="w-full rounded-md border border-tcw-accent-300 bg-white px-3 py-2 text-body focus:border-tcw-red-500 focus:outline-none focus:ring-1 focus:ring-tcw-red-500 dark:border-tcw-accent-700 dark:bg-tcw-accent-900"
            placeholder="Neues Passwort"
          />
          <button
            type="submit"
            className="cursor-pointer rounded-md bg-tcw-red-700 px-4 py-2 font-medium text-white hover:bg-tcw-red-500"
          >
            Passwort speichern
          </button>
        </form>
      </section>
    </main>
  )
}
