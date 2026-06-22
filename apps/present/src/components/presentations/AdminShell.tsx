import { getSession } from '@/lib/auth'

export async function AdminShell({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  return (
    <main className="min-h-screen bg-taupe-100">
      <header className="border-b border-tcw-accent-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <a href="/presentations" className="text-lg font-bold text-body">
            TCW Present
          </a>
          <div className="flex items-center gap-3">
            {session?.name && <span className="hidden text-sm text-muted sm:inline">{session.name}</span>}
            <form method="post" action="/api/auth/logout">
              <button className="cursor-pointer rounded-md border border-tcw-accent-200 bg-white px-3 py-2 text-sm font-medium text-body hover:bg-tcw-accent-50">
                Abmelden
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-5 py-6">{children}</div>
    </main>
  )
}
