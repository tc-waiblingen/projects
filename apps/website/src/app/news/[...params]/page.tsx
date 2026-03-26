import type { Metadata } from "next"
import Image from "next/image"
import { notFound, redirect } from "next/navigation"
import { fetchAllPublishedPosts, fetchPostForPreview } from "@/lib/directus/fetchers"
import { DocumentLeftAligned } from "@/components/sections/document-left-aligned"
import type { DirectusFile, PostBlock } from "@/types/directus-schema"
import { BlockRenderer } from "@/components/blocks/BlockRenderer"
import { TocProvider, TableOfContents } from '@/components/toc'
import { sanitizeHtml } from "@/lib/sanitize"
import { calculatePostWeight } from "@/lib/pagefind-weight"
import { checkVisibility } from '@/lib/visibility'
import { PreviewBadge } from '@/components/elements/preview-badge'
import { VisualEditingWrapper } from '@/components/visual-editing/VisualEditingWrapper'
import { getEditAttr } from '@/lib/visual-editing'
import { RelatedGroupPosts } from '@/components/elements/related-group-posts'

interface PageProps {
  params: Promise<{ params: string[] }>
}

function parseParams(params: string[]): { year?: string; slug: string } | null {
  if (params.length === 1) {
    // /news/[slug]
    const slug = params[0]
    if (!slug) return null
    return { slug }
  } else if (params.length === 2) {
    // /news/[year]/[slug]
    const year = params[0]
    const slug = params[1]
    if (!year || !slug) return null
    return { year, slug }
  }
  return null
}

export async function generateStaticParams() {
  const posts = await fetchAllPublishedPosts()

  return posts
    .filter((post) => post.slug)
    .map((post) => {
      if (post.published_at) {
        const year = new Date(post.published_at).getFullYear().toString()
        return { params: [year, post.slug!] }
      }
      return { params: [post.slug!] }
    })
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { params: routeParams } = await params
  const parsed = parseParams(routeParams)

  if (!parsed) {
    return { title: "Beitrag nicht gefunden" }
  }

  const post = await fetchPostForPreview(parsed.slug, parsed.year)

  if (!post) {
    return { title: "Beitrag nicht gefunden" }
  }

  const visibility = await checkVisibility(post.status, post.published_at)

  const title = post.seo?.title || post.title
  const description = post.seo?.meta_description || post.description || undefined

  // Preview content should not be indexed
  const isPreview = visibility.previewReason !== null

  return {
    title,
    description,
    openGraph: post.seo?.og_image
      ? { images: [{ url: post.seo.og_image }] }
      : undefined,
    robots: {
      index: isPreview ? false : !post.seo?.no_index,
      follow: !post.seo?.no_follow,
    },
  }
}

export default async function PostPage({ params }: PageProps) {
  const { params: routeParams } = await params
  const parsed = parseParams(routeParams)

  if (!parsed) {
    notFound()
  }

  const post = await fetchPostForPreview(parsed.slug, parsed.year)

  if (!post) {
    notFound()
  }

  const visibility = await checkVisibility(post.status, post.published_at)

  if (!visibility.visible) {
    notFound()
  }

  // If accessing /news/[slug] but post has published_at, redirect to canonical URL
  if (!parsed.year && post.published_at) {
    const year = new Date(post.published_at).getFullYear()
    redirect(`/news/${year}/${parsed.slug}`)
  }

  const { title, content, published_at, image } = post

  const formattedDate = published_at
    ? new Date(published_at).toLocaleDateString("de-DE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    : null

  const subheadline = formattedDate ? (
    <time
      dateTime={published_at ?? undefined}
      data-directus={getEditAttr({ collection: 'posts', item: String(post.id), fields: 'published_at' })}
    >
      {formattedDate}
    </time>
  ) : undefined

  const showToc = post.show_toc ?? false
  const postWeight = calculatePostWeight(published_at)
  const blocks = (post.blocks ?? []).filter((b): b is PostBlock => typeof b !== 'string')

  const headlineEl = title ? (
    <span data-directus={getEditAttr({ collection: 'posts', item: String(post.id), fields: 'title' })}>
      {title}
    </span>
  ) : undefined

  const sanitizedContent = content ? sanitizeHtml(content) : ''

  return (
    <VisualEditingWrapper itemId={String(post.id)} collection="posts">
      <div data-pagefind-weight={postWeight}>
        {visibility.previewReason && <PreviewBadge reason={visibility.previewReason} />}
        <TocProvider>
          {image && typeof image !== "string" && (
            <div data-directus={getEditAttr({ collection: 'posts', item: String(post.id), fields: 'image' })}>
              <PostHeroImage file={image} />
            </div>
          )}
          <DocumentLeftAligned headline={headlineEl} subheadline={subheadline}>
            {sanitizedContent && (
              <div
                data-directus={getEditAttr({ collection: 'posts', item: String(post.id), fields: 'content' })}
                dangerouslySetInnerHTML={{ __html: sanitizedContent }}
              />
            )}
          </DocumentLeftAligned>
          {blocks.length > 0 && <BlockRenderer blocks={blocks} />}
          {showToc && <TableOfContents />}
        </TocProvider>
        {post.group && typeof post.group === 'number' && (
          <RelatedGroupPosts groupId={post.group} currentPostId={post.id} />
        )}
      </div>
    </VisualEditingWrapper>
  )
}

function PostHeroImage({ file }: { file: DirectusFile }) {
  if (!file.id) {
    return null
  }

  const src = `/api/images/${file.id}`
  const title = file.title ?? ""
  const alt = file.description ?? ""

  return (
    <div className="relative h-64 w-full sm:h-80 lg:h-96">
      <Image
        src={src}
        title={title}
        alt={alt}
        fill
        className="object-cover"
        priority
      />
    </div>
  )
}
