import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="mt-4 text-lg">Seite nicht gefunden</p>
        <Link href="/tv" className="mt-8 inline-block rounded-lg bg-neutral-800 px-6 py-3 text-white hover:bg-neutral-700">
          Zurück zur Startseite
        </Link>
      </div>
    </div>
  )
}
