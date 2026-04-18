import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center p-6 text-center">
      <h1 className="text-2xl font-bold text-body">Seite nicht gefunden</h1>
      <p className="mt-3 text-sm text-muted">Die angeforderte Seite existiert nicht.</p>
      <Link
        href="/"
        className="mt-6 cursor-pointer rounded-md border border-tcw-accent-300 px-4 py-2 text-sm font-medium text-body hover:text-tcw-red-700 dark:border-tcw-accent-700"
      >
        Zur Startseite
      </Link>
    </main>
  )
}
