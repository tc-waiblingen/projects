import Image from "next/image"
import type { BlockTrainer as BlockTrainerType, DirectusFile, Trainer } from "@/types/directus-schema"
import { ContactInfo } from "@/components/elements/contact-info"
import { Section } from "@/components/elements/section"
import { fetchTrainers } from "@/lib/directus/fetchers"

interface BlockTrainersProps {
  data: BlockTrainerType
}

export async function BlockTrainers({ data }: BlockTrainersProps) {
  const { id, headline, tagline, alignment } = data

  const allTrainers = await fetchTrainers()
  const trainers = allTrainers.filter((t) => t.banner && typeof t.banner !== "string")

  if (!trainers || trainers.length === 0) {
    return null
  }

  return (
    <Section eyebrow={tagline} headline={headline} alignment={alignment} editAttr={{ collection: "block_trainers", item: String(id) }}>
      <ul role="list" className="mx-auto grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {trainers.map((trainer) => (
          <li key={trainer.id} className="overflow-hidden rounded-lg border border-tcw-accent-200 bg-white dark:border-tcw-accent-700 dark:bg-tcw-accent-800">
            <div className="p-4">
              <TrainerBanner trainer={trainer} />
            </div>
            <div className="border-t border-tcw-accent-200 p-4 dark:border-tcw-accent-700">
              <p className="font-semibold text-tcw-accent-900 dark:text-white">{trainer.name}</p>
              <div className="mt-2 space-y-1 text-sm text-tcw-accent-700 dark:text-tcw-accent-300">
                {trainer.phone && (
                  <p>
                    <ContactInfo
                      type="phone"
                      value={trainer.phone}
                      name={trainer.name}
                      className="hover:text-tcw-accent-900 dark:hover:text-white"
                    />
                  </p>
                )}
                {trainer.email && (
                  <p>
                    <ContactInfo
                      type="email"
                      value={trainer.email}
                      name={trainer.name}
                      className="hover:text-tcw-accent-900 dark:hover:text-white"
                    />
                  </p>
                )}
                {trainer.website && (
                  <p>
                    <ContactInfo
                      type="website"
                      value={trainer.website}
                      name={trainer.name}
                      className="hover:text-tcw-accent-900 dark:hover:text-white"
                    />
                  </p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  )
}

function TrainerBanner({ trainer }: { trainer: Trainer }) {
  const file = trainer.banner as DirectusFile
  const isSvg = file.type === "image/svg+xml"
  const src = `/api/images/${file.id}${isSvg ? "" : "?key=trainer-banner"}`
  const title = file.title ?? ""
  const alt = file.description ?? trainer.name

  return (
    <div className="flex aspect-video items-center justify-center">
      <Image
        src={src}
        title={title}
        alt={alt}
        width={400}
        height={225}
        sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
        className="size-full object-contain"
        unoptimized={isSvg}
      />
    </div>
  )
}
