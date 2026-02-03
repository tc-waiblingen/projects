import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { fetchAllPages, fetchPageData } from "@/lib/directus/fetchers"
import { BlockRenderer } from "@/components/blocks/BlockRenderer"
import type { PageBlock } from "@/types/directus-schema"
import { Heading } from "@/components/elements/heading"
import { Container } from '@/components/elements/container'
import { TocProvider, TableOfContents } from '@/components/toc'
import { checkVisibility } from '@/lib/visibility'
import { PreviewBadge } from '@/components/elements/preview-badge'
import { getEditAttr } from '@/lib/visual-editing'
import { VisualEditingWrapper } from '@/components/visual-editing/VisualEditingWrapper'

interface PageProps {
  params: Promise<{ slug?: string[] }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

// Legacy WordPress paths that should 404 immediately without querying Directus
const WORDPRESS_BLOCKLIST = [
  'wp-content',
  'wp-admin',
  'wp-includes',
  'wp-json',
  'wp-login.php',
  'wp-cron.php',
  'wp-config.php',
  'wp-comments-post.php',
  'wp-signup.php',
  'wp-trackback.php',
  'xmlrpc.php',
]

function isBlockedPath(slug?: string[]): boolean {
  return Boolean(slug?.[0] && WORDPRESS_BLOCKLIST.includes(slug[0]))
}

function slugToPermalink(slug?: string[]): string {
  if (!slug || slug.length === 0) {
    return "/"
  }
  return "/" + slug.join("/")
}

export async function generateStaticParams() {
  const pages = await fetchAllPages()

  return pages.map((page) => {
    const permalink = page.permalink
    if (permalink === "/") {
      return { slug: undefined }
    }
    // Remove leading slash and split by /
    const slugParts = permalink.replace(/^\//, "").split("/")
    return { slug: slugParts }
  })
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params

  if (isBlockedPath(slug)) {
    return { title: 'Seite nicht gefunden' }
  }

  const permalink = slugToPermalink(slug)

  try {
    const page = await fetchPageData(permalink)
    const visibility = await checkVisibility(page.status, page.published_at)

    const title = page.seo?.title || page.title
    const description = page.seo?.meta_description || undefined

    // Preview content should not be indexed
    const isPreview = visibility.previewReason !== null

    return {
      title,
      description,
      openGraph: page.seo?.og_image
        ? {
          images: [{ url: page.seo.og_image }],
        }
        : undefined,
      robots: {
        index: isPreview ? false : !page.seo?.no_index,
        follow: !page.seo?.no_follow,
      },
    }
  } catch {
    return {
      title: "Seite nicht gefunden",
    }
  }
}

export default async function Page({ params, searchParams }: PageProps) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([params, searchParams])

  if (isBlockedPath(slug)) {
    notFound()
  }

  const permalink = slugToPermalink(slug)

  let page
  try {
    page = await fetchPageData(permalink)
  } catch {
    notFound()
  }

  const visibility = await checkVisibility(page.status, page.published_at)

  if (!visibility.visible) {
    notFound()
  }

  const blocks = (page.blocks ?? []).filter(
    (block): block is PageBlock => typeof block !== "string"
  )

  const title = page.seo?.title || page.title
  const showTitle = page.show_title ?? true
  const showToc = page.show_toc ?? true

  return (
    <VisualEditingWrapper itemId={page.id} collection="pages">
      <div data-pagefind-weight="2">
        {visibility.previewReason && <PreviewBadge reason={visibility.previewReason} />}
        <TocProvider>
          {showTitle &&
            <Container className="mt-8">
              <Heading data-directus={getEditAttr({ collection: 'pages', item: page.id, fields: 'title' })}>
                {title}
              </Heading>
            </Container>
          }
          <BlockRenderer blocks={blocks} currentPath={permalink} searchParams={resolvedSearchParams} />
          {showToc && <TableOfContents />}
        </TocProvider>
      </div>
    </VisualEditingWrapper>
  )
}