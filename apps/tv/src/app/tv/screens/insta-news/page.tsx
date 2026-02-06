import { QrCode, ScreenAutoAdvance, TvScreenLayout } from '@/components/tv'
import { fetchInstagramFeedData, generateQrCodeForView, getNextScreenIndex } from '@/lib/tv'
import { InstaNewsCarousel } from './InstaNewsCarousel'

export const dynamic = 'force-dynamic'

const SCREEN_URL = '/tv/screens/insta-news'
const SCREEN_TITLE = 'Insta-News'
const SCREEN_DURATION = 35000
const SHORT_DURATION = 2000

export default async function InstaNewsPage() {
  const instagramFeed = await fetchInstagramFeedData()
  const nextIndex = getNextScreenIndex(SCREEN_URL)

  // Generate profile QR code
  const profileQrCode = instagramFeed.profileUrl
    ? await generateQrCodeForView(instagramFeed.profileUrl, 'large', true)
    : null

  // Pre-generate QR codes for all content items
  const contentWithQr = await Promise.all(
    instagramFeed.feed.map(async (content) => ({
      ...content,
      qrCode: content.permalink ? await generateQrCodeForView(content.permalink, 'small', true) : null,
    }))
  )

  const hasContent = instagramFeed.configured && !instagramFeed.error && contentWithQr.length > 0
  const duration = hasContent ? SCREEN_DURATION : SHORT_DURATION

  return (
    <TvScreenLayout title={SCREEN_TITLE} duration={duration}>
      <div className="relative flex h-screen items-center justify-center overflow-hidden">
        {instagramFeed.profileUrl && profileQrCode && (
          <div className="absolute bottom-8 left-8 z-20 flex items-center gap-3 rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-black/50">
            <QrCode linkUrl={instagramFeed.profileUrl} qrCodeDataUrl={profileQrCode} size="large" />
            <span className="tv-small">
              Folge uns auf <br /> Instagram
            </span>
          </div>
        )}

        {/* Screen content */}
        {!instagramFeed.configured && (
          <div className="w-full px-12 text-center">
            <p className="tv-heading font-light">Der Instagram-Zugriff ist noch nicht konfiguriert.</p>
          </div>
        )}

        {instagramFeed.configured && instagramFeed.error && (
          <div className="w-full px-12 text-center">
            <p className="tv-heading font-light">Leider konnten keine Daten von Instagram geladen werden.</p>
            <p className="mt-4 tv-body opacity-70">{instagramFeed.error}</p>
          </div>
        )}

        {instagramFeed.configured && !instagramFeed.error && contentWithQr.length === 0 && (
          <div className="w-full px-12 text-center">
            <p className="tv-heading font-light">Es scheint als seien im Moment keine Instagram-Beiträge verfügbar.</p>
            <p className="tv-heading font-light">Ihr könnt uns aber gerne Beiträge zusenden.</p>
          </div>
        )}

        {hasContent && <InstaNewsCarousel content={contentWithQr} nextIndex={nextIndex} />}

        <ScreenAutoAdvance currentUrl={SCREEN_URL} nextIndex={nextIndex} duration={duration} />
      </div>
    </TvScreenLayout>
  )
}
