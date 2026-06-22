import { getSession } from '@/lib/auth'
import { canManagePresentation, getPresentationByCode } from '@/lib/presentations'
import { publicUrl } from '@/lib/public-url'
import { createQrDataUrl } from '@/lib/qr'
import Image from 'next/image'
import { notFound, redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface HandoutPageProps {
  params: Promise<{ code: string }>
}

export default async function HandoutPage({ params }: HandoutPageProps) {
  const [{ code }, session] = await Promise.all([params, getSession()])
  if (!session) redirect('/login')
  const presentation = getPresentationByCode(code)
  if (!presentation || !canManagePresentation(presentation, session)) notFound()
  const viewerUrl = publicUrl(`/p/${presentation.code}`).toString()
  const qrDataUrl = await createQrDataUrl(viewerUrl, 420)

  return (
    <main className="min-h-screen bg-white p-8 text-body print:p-0">
      <section className="mx-auto grid max-w-3xl gap-8 rounded-lg border border-tcw-accent-200 p-8 print:border-0">
        <div>
          <p className="mb-2 text-xs font-bold uppercase text-tcw-red-700">TCW Present</p>
          <h1 className="text-4xl font-bold">{presentation.title}</h1>
          {presentation.startsAt && <p className="mt-2 text-lg text-muted">{presentation.startsAt}</p>}
        </div>
        <div className="grid gap-8 md:grid-cols-[260px_1fr] md:items-center">
          <Image src={qrDataUrl} alt={`QR code for ${viewerUrl}`} width={260} height={260} className="w-full max-w-[260px]" />
          <div className="grid gap-4">
            <div>
              <p className="text-sm font-semibold text-muted">Open</p>
              <p className="break-all text-xl font-bold">{viewerUrl}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-muted">Presentation code</p>
              <p className="font-mono text-3xl font-bold">{presentation.code}</p>
            </div>
            <div className="rounded-lg border border-tcw-accent-200 bg-tcw-accent-50 p-4">
              <p className="text-sm font-semibold text-muted">Password</p>
              <input
                aria-label="Viewer password for printed handout"
                placeholder="Enter before printing"
                className="mt-2 w-full rounded-md border border-tcw-accent-200 bg-white px-3 py-2 text-2xl font-bold"
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
