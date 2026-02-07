import { ScreenAutoAdvance, TvScreenLayout } from '@/components/tv'
import { fetchTeamMembers, getNextScreenIndex } from '@/lib/tv'
import { getDirectusAssetURL } from '@/lib/directus/directus-utils'
import Image from 'next/image'

const SCREEN_URL = '/tv/screens/team'
const SCREEN_TITLE = 'Vorstands-Team'
const SCREEN_DURATION = 10000

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default async function TeamPage() {
  const team = await fetchTeamMembers()
  const nextIndex = getNextScreenIndex(SCREEN_URL)

  return (
    <TvScreenLayout title={SCREEN_TITLE} duration={SCREEN_DURATION}>
      <div className="relative flex h-screen items-center justify-center overflow-hidden p-16 mt-10">
        <div className="w-full">
          <div className="grid grid-cols-6 gap-8">
            {team.map((member) => (
              <div
                key={member.name}
                className="flex flex-col items-center gap-4 rounded-3xl border border-white/70 bg-white/70 px-6 py-8 shadow-sm"
              >
                {/* Photo */}
                <div className="relative flex h-60 w-40 items-center justify-center overflow-hidden rounded-2xl bg-neutral-200">
                  {member.picture && typeof member.picture !== 'string' && member.picture.id ? (
                    <Image
                      src={getDirectusAssetURL(member.picture)}
                      alt={member.name ?? ''}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <span className="tv-initials font-bold text-neutral-400">{getInitials(member.name ?? '')}</span>
                  )}
                </div>

                {/* Name */}
                <h3 className="text-center tv-heading font-semibold text-neutral-900">{member.name}</h3>

                {/* Function */}
                <p className="text-center tv-body text-neutral-700">{member.function}</p>
              </div>
            ))}
          </div>
        </div>

        <ScreenAutoAdvance currentUrl={SCREEN_URL} nextIndex={nextIndex} duration={SCREEN_DURATION} />
      </div>
    </TvScreenLayout>
  )
}
