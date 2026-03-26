import Image from "next/image"
import type { BlockTeam as BlockTeamType, DirectusFile, Team } from "@/types/directus-schema"
import { Section } from "@/components/elements/section"
import { fetchTeamMembers } from "@/lib/directus/fetchers"

interface BlockTeamProps {
  data: BlockTeamType
}

export async function BlockTeam({ data }: BlockTeamProps) {
  const { id, headline, tagline, alignment } = data

  const teamMembers = await fetchTeamMembers()

  if (!teamMembers || teamMembers.length === 0) {
    return null
  }

  return (
    <Section
      eyebrow={tagline}
      headline={headline || ""}
      alignment={alignment}
      editAttr={{ collection: "block_team", item: String(id) }}
    >
      <ul role="list" className="mx-auto flex max-w-4xl flex-wrap justify-center gap-x-6 gap-y-10">
        {teamMembers.map((member) => (
          <li key={member.id} className="flex w-full max-w-[120px] flex-col gap-4 text-sm/7">
            <div className="aspect-3/4 w-full overflow-hidden rounded-sm outline -outline-offset-1 outline-black/5 *:size-full *:object-cover dark:outline-white/5">
              <TeamMemberImage file={member.picture} />
            </div>
            <div>
              <p className="font-semibold text-tcw-accent-900 dark:text-white">{member.name}</p>
              <p className="text-muted">{member.function}</p>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  )
}

function TeamMemberImage({ file }: { file: Team["picture"] }) {
  if (!file || typeof file === "string") {
    return null
  }

  const typedFile = file as DirectusFile
  const src = `/api/team-images/${typedFile.id}`
  const title = typedFile.title ?? ""
  const alt = typedFile.description ?? ""

  return (
    <Image
      src={src}
      title={title}
      alt={alt}
      width={120}
      height={160}
      sizes="120px"
    />
  )
}
