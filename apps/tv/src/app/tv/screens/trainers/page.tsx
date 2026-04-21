import { EmailAddress, PhoneNumber, ScreenAutoAdvance, TvScreenLayout } from '@/components/tv'
import { fetchTrainers, getNextScreenIndex } from '@/lib/tv'
import { getDirectusAssetURL } from '@/lib/directus/directus-utils'
import Image from 'next/image'
import { trainersScreen } from './screen'

const { url: SCREEN_URL, title: SCREEN_TITLE, screenMeta: { duration: SCREEN_DURATION } } = trainersScreen

export default async function TrainersPage() {
  const trainers = await fetchTrainers()
  const nextIndex = await getNextScreenIndex(SCREEN_URL)

  return (
    <TvScreenLayout title={SCREEN_TITLE} duration={SCREEN_DURATION} showLogo={false} showFooter={false}>
      <div className="relative flex h-screen items-center justify-center overflow-hidden p-16">
        <div className="w-full">
          <p className="mb-8 mt-16 text-center tv-heading">
            Unser Verein arbeitet seit vielen Jahren mit qualifizierten Trainern zusammen. Die Trainer arbeiten freiberuflich.
            Bitte kontaktieren Sie die Trainer direkt für weitere Informationen.
          </p>
          <div className="grid grid-cols-2 gap-8">
            {trainers.map((trainer) => (
              <div
                key={trainer.name}
                className="flex flex-col items-center gap-4 rounded-3xl border border-white/70 bg-white/70 px-4 py-8 shadow-sm"
              >
                {/* Banner */}
                <div className="relative flex h-58 w-full items-center justify-center overflow-hidden rounded-2xl bg-neutral-200">
                  {trainer.banner && typeof trainer.banner !== 'string' && trainer.banner.id ? (
                    <Image
                      src={getDirectusAssetURL(trainer.banner)}
                      alt={trainer.name ?? ''}
                      fill
                      className="object-contain p-4"
                    />
                  ) : (
                    <span className="tv-body-lg font-bold text-neutral-400">(Bild folgt)</span>
                  )}
                </div>

                {/* Name */}
                <h3 className="text-center tv-heading font-semibold text-neutral-900">{trainer.name}</h3>

                {/* Contact Info */}
                <div className="flex flex-col gap-1 text-center">
                  {trainer.phone && <PhoneNumber phone={trainer.phone} />}
                  {trainer.email && <EmailAddress email={trainer.email} />}
                  {trainer.website && <p className="text-neutral-700">{trainer.website}</p>}
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
