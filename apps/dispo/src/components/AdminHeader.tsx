import { getSession } from '@/lib/auth'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { CrestLogo } from './CrestLogo'

const ROLE_LABEL = { admin: 'Admin', operator: 'Operator' } as const

export async function AdminHeader({
  title = 'Platzzuweisung',
  subtitle,
}: {
  title?: ReactNode
  subtitle?: string
}) {
  const session = await getSession()

  return (
    <header className="relative mb-6 flex items-center justify-between border-b border-tcw-accent-200 pb-4 dark:border-tcw-accent-800">
      <div className="flex min-w-0 flex-col leading-tight">
        {typeof title === 'string' ? <h1 className="text-lg font-bold text-body">{title}</h1> : title}
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
        {session?.role === 'admin' && (
          <Link
            href="/settings"
            aria-label="Einstellungen"
            className="cursor-pointer rounded-md p-1.5 text-muted hover:text-body"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </Link>
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
