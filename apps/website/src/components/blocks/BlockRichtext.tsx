import type { BlockRichtext as BlockRichtextType, DirectusFile } from "@/types/directus-schema"
import { Section } from "@/components/elements/section"
import { Document } from "@/components/elements/document"
import { sanitizeHtml } from "@/lib/sanitize"
import { transformRichtextAssets } from "@/lib/transform-richtext-assets"
import { RichtextContent } from "@/components/elements/richtext-content"
import { fetchFilesByIds } from "@/lib/directus/fetchers"
import { getEditAttr } from "@/lib/visual-editing"

interface BlockRichtextProps {
  data: BlockRichtextType
}

/** Extract Directus file IDs from raw HTML content before URL transformation */
function extractDirectusFileIds(html: string): string[] {
  const regex = /https:\/\/cms\.tc-waiblingen\.de\/assets\/([\w-]+)/g
  const ids: string[] = []
  let match
  while ((match = regex.exec(html)) !== null) {
    if (match[1]) ids.push(match[1])
  }
  return [...new Set(ids)]
}

export async function BlockRichtext({ data }: BlockRichtextProps) {
  const { id, headline, tagline, content, alignment } = data

  // Extract file IDs from raw content before transformation
  const fileIds = content ? extractDirectusFileIds(content) : []
  const files = await fetchFilesByIds(fileIds)
  const fileMetadata: Record<string, DirectusFile> = Object.fromEntries(
    files.map((f) => [f.id, f])
  )

  const isCentered = alignment === "center"

  const processedContent = content
    ? sanitizeHtml(transformRichtextAssets(content))
    : undefined

  return (
    <Section
      eyebrow={tagline}
      headline={headline}
      alignment={alignment}
      editAttr={{ collection: 'block_richtext', item: String(id) }}
    >
      {processedContent && (
        <Document className={isCentered ? 'mx-auto max-w-2xl' : 'max-w-2xl'}>
          <div data-directus={getEditAttr({ collection: "block_richtext", item: String(id), fields: "content" })}>
            <RichtextContent html={processedContent} fileMetadata={fileMetadata} />
          </div>
        </Document>
      )}
    </Section>
  )
}
