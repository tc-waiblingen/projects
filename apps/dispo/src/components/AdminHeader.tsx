import { getSession } from '@/lib/auth'
import Link from 'next/link'
import { CrestLogo } from './CrestLogo'

const ROLE_LABEL = { admin: 'Admin', operator: 'Operator' } as const

export async function AdminHeader({ subtitle }: { subtitle?: string }) {
  const session = await getSession()

  return (
    <header className="relative mb-6 flex items-center justify-between border-b border-tcw-accent-200 pb-4 dark:border-tcw-accent-800">
      <div className="flex min-w-0 flex-col leading-tight">
        <h1 className="text-lg font-bold text-body">Platzzuweisung</h1>
        {subtitle && <span className="text-sm text-muted">{subtitle}</span>}
      </div>
      <Link
        href="/"
        aria-label="TCW Dispo"
        className="absolute left-1/2 -translate-x-1/2 cursor-pointer"
      >
        <CrestLogo />
      </Link>
      <div className="flex items-center gap-3">
        {session?.name && (
          <div className="flex flex-col items-end leading-tight">
            <span className="text-sm text-body">{session.name}</span>
            <span className="text-xs text-muted">{ROLE_LABEL[session.role]}</span>
          </div>
        )}
        <form method="post" action="/api/auth/logout">
          <button
            type="submit"
            className="cursor-pointer rounded-md border border-tcw-accent-300 px-3 py-1.5 text-sm text-muted hover:text-body dark:border-tcw-accent-700"
          >
            Abmelden
          </button>
        </form>
      </div>
    </header>
  )
}
