import { ScreenAutoAdvance, TvScreenLayout } from '@/components/tv'
import { fetchSponsors, getNextScreenIndex } from '@/lib/tv'
import { getDirectusAssetURL } from '@/lib/directus/directus-utils'
import Image from 'next/image'

const SCREEN_URL = '/tv/screens/sponsors'
const SCREEN_TITLE = 'Vielen Dank!'
const SCREEN_DURATION = 10000

export default async function SponsorsPage() {
  const sponsors = await fetchSponsors()
  const nextIndex = getNextScreenIndex(SCREEN_URL)

  return (
    <TvScreenLayout title={SCREEN_TITLE} duration={SCREEN_DURATION}>
      <div className="relative flex h-screen items-center justify-center overflow-hidden p-16">
        <div className="w-full">
          <p className="mb-12 text-center tv-heading">
            Ohne die großartige Unterstützung unserer Sponsoren könnte so manches Projekt nicht realisiert werden.
            <br />
            Vielen Dank!
          </p>

          <div className="grid gap-16">
            {/* Premium Partners */}
            {sponsors.byCategory.premium_partner && sponsors.byCategory.premium_partner.length > 0 && (
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-6">
                  {sponsors.byCategory.premium_partner.map((sponsor) => (
                    <div key={sponsor.id} className="relative flex items-center justify-center rounded-lg bg-white p-6 shadow-lg">
                      {sponsor.logo_web && typeof sponsor.logo_web !== 'string' && sponsor.logo_web.id ? (
                        <Image
                          src={getDirectusAssetURL(sponsor.logo_web)}
                          alt={sponsor.name ?? ''}
                          width={300}
                          height={152}
                          className="max-h-38 max-w-full object-contain"
                        />
                      ) : (
                        <span className="text-center tv-sponsor-name-lg font-semibold text-gray-600">{sponsor.name}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Other Categories */}
            {Object.entries(sponsors.byCategory)
              .filter(([category]) => category !== 'premium_partner')
              .map(([category, categorySponsors]) => (
                <div key={category} className="space-y-2">
                  <div className="grid grid-cols-6 gap-6">
                    {categorySponsors.map((sponsor) => (
                      <div key={sponsor.id} className="relative flex items-center justify-center rounded-lg bg-white p-4 shadow">
                        {sponsor.logo_web && typeof sponsor.logo_web !== 'string' && sponsor.logo_web.id ? (
                          <Image
                            src={getDirectusAssetURL(sponsor.logo_web)}
                            alt={sponsor.name ?? ''}
                            width={200}
                            height={96}
                            className="max-h-24 max-w-full object-contain"
                          />
                        ) : (
                          <span className="text-center tv-sponsor-name font-medium text-gray-600">{sponsor.name}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>

        <ScreenAutoAdvance currentUrl={SCREEN_URL} nextIndex={nextIndex} duration={SCREEN_DURATION} />
      </div>
    </TvScreenLayout>
  )
}
