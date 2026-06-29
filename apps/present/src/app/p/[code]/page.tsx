import { getPresentationByCode } from '@/lib/presentations'
import { notFound, redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface ViewerLoginPageProps {
  params: Promise<{ code: string }>
  searchParams: Promise<{ error?: string }>
}

export default async function ViewerLoginPage({ params, searchParams }: ViewerLoginPageProps) {
  const [{ code }, { error }] = await Promise.all([params, searchParams])
  const presentation = getPresentationByCode(code)
  if (!presentation) notFound()
  if (presentation.status !== 'ended' && presentation.viewerPasswordHash === '') {
    redirect(`/api/viewer-login?code=${encodeURIComponent(presentation.code)}`)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-taupe-100 p-5">
      <section className="w-full max-w-md rounded-lg border border-tcw-accent-200 bg-white p-6 shadow-sm">
        <p className="mb-2 text-xs font-bold uppercase text-tcw-red-700">TCW Present</p>
        <h1 className="text-2xl font-bold text-body">{presentation.title}</h1>
        <p className="mt-1 font-mono text-sm text-muted">{presentation.code}</p>

        {presentation.status === 'ended' ? (
          <p className="mt-6 rounded-md bg-tcw-accent-50 px-3 py-2 text-sm text-muted">This presentation has ended.</p>
        ) : (
          <form method="post" action="/api/viewer-login" autoComplete="off" className="mt-6 grid gap-4">
            {error && <p className="rounded-md bg-tcw-red-50 px-3 py-2 text-sm text-tcw-red-700">Wrong password.</p>}
            <input type="hidden" name="code" value={presentation.code} />
            <label className="grid gap-1 text-sm font-semibold text-body">
              Password
              <input
                type="password"
                name="password"
                autoComplete="off"
                className="rounded-md border border-tcw-accent-200 px-3 py-2 font-normal focus:border-tcw-red-500 focus:outline-none"
              />
            </label>
            <button className="cursor-pointer rounded-md bg-tcw-red-700 px-4 py-2 font-semibold text-white hover:bg-tcw-red-500">
              Join presentation
            </button>
          </form>
        )}
      </section>
    </main>
  )
}
