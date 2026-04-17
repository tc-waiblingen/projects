import { CourtStatusMap, ScreenAutoAdvance, TvScreenLayout } from '@/components/tv'
import { fetchAreaMapSvg } from '@/lib/directus/fetchAreaMapSvg'
import { fetchCourtStatusData, getNextScreenIndex } from '@/lib/tv'

const SCREEN_URL = '/tv/screens/court-status'
const SCREEN_TITLE = 'Platzbelegung'
const SCREEN_DURATION = 20000

export default async function CourtStatusPage() {
  const data = await fetchCourtStatusData()
  const svg = data.areaMapId ? await fetchAreaMapSvg(data.areaMapId) : null
  const nextIndex = getNextScreenIndex(SCREEN_URL)

  return (
    <TvScreenLayout title={SCREEN_TITLE} duration={SCREEN_DURATION}>
      <div className="relative tv-screen-fit overflow-hidden">
        <div className="relative z-10 h-full px-16 pb-10 pt-44">
          {svg ? (
            <CourtStatusMap svg={svg} courts={data.courts} />
          ) : (
            <div className="flex h-full items-center justify-center text-center">
              <p className="tv-message font-light">Platzplan nicht verfügbar.</p>
            </div>
          )}
        </div>
        <ScreenAutoAdvance currentUrl={SCREEN_URL} nextIndex={nextIndex} duration={SCREEN_DURATION} />
      </div>
    </TvScreenLayout>
  )
}
