import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import type { BlockPost as BlockPostType, DirectusFile, Post } from "@/types/directus-schema"
import { Section } from "@/components/elements/section"
import { Eyebrow } from "@/components/elements/eyebrow"
import { SoftButtonLink } from "@/components/elements/button"
import { fetchPosts, fetchPostsPaginated } from "@/lib/directus/fetchers"
import { getEditAttr } from "@/lib/visual-editing"

interface BlockPostsProps {
  data: BlockPostType
  searchParams?: Record<string, string | string[] | undefined>
  currentPath?: string
}

export async function BlockPosts({ data, searchParams, currentPath }: BlockPostsProps) {
  const { style } = data

  if (style === "archive") {
    return <PostsArchive data={data} searchParams={searchParams} currentPath={currentPath} />
  }

  return <PostsCards data={data} />
}

async function PostsCards({ data }: { data: BlockPostType }) {
  const { id, headline, tagline, limit } = data

  const eyebrow = tagline ? (
    <Eyebrow data-directus={getEditAttr({ collection: "block_posts", item: String(id), fields: "tagline" })}>
      {tagline}
    </Eyebrow>
  ) : undefined

  const posts = await fetchPosts(limit ?? undefined)

  if (!posts || posts.length === 0) {
    return null
  }

  return (
    <Section eyebrow={eyebrow} headline={headline ? (
      <span data-directus={getEditAttr({ collection: "block_posts", item: String(id), fields: "headline" })}>
        {headline}
      </span>
    ) : ""}>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </Section>
  )
}

async function PostsArchive({ data, searchParams, currentPath }: { data: BlockPostType; searchParams?: Record<string, string | string[] | undefined>; currentPath?: string }) {
  const { id, headline, tagline, limit } = data

  const pageSize = limit ?? 10
  const pageParam = searchParams?.page
  const requestedPage = parseInt(typeof pageParam === "string" ? pageParam : "1", 10) || 1
  const offset = Math.max(0, (requestedPage - 1) * pageSize)

  const { posts, total } = await fetchPostsPaginated(pageSize, offset)
  const totalPages = Math.ceil(total / pageSize)

  // Redirect to base URL if page is out of bounds
  if (pageParam !== undefined && (requestedPage < 1 || requestedPage > totalPages)) {
    redirect(`${currentPath ?? '/'}#news`)
  }

  const currentPage = requestedPage

  const eyebrow = tagline ? (
    <Eyebrow data-directus={getEditAttr({ collection: "block_posts", item: String(id), fields: "tagline" })}>
      {tagline}
    </Eyebrow>
  ) : undefined

  if (!posts || posts.length === 0) {
    return null
  }

  const showPagination = totalPages > 1

  return (
    <Section id="news" eyebrow={eyebrow} headline={headline ? (
      <span data-directus={getEditAttr({ collection: "block_posts", item: String(id), fields: "headline" })}>
        {headline}
      </span>
    ) : ""}>
      <div className="flex flex-col gap-8">
        {showPagination && <Pagination currentPage={currentPage} totalPages={totalPages} />}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
          {posts.map((post) => (
            <PostListItem key={post.id} post={post} />
          ))}
        </div>
        {showPagination && <Pagination currentPage={currentPage} totalPages={totalPages} />}
      </div>
    </Section>
  )
}

function PostCard({ post }: { post: Post }) {
  const { title, slug, description, image, published_at } = post

  if (!slug || !published_at) {
    return null
  }

  const year = new Date(published_at).getFullYear()
  const href = `/news/${year}/${slug}`

  const formattedDate = new Date(published_at).toLocaleDateString("de-DE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <Link href={href} className="group interactive-group">
      <article className="flex flex-col gap-4">
        {image && typeof image !== "string" && (
          <PostImage file={image} />
        )}
        <div className="flex flex-col gap-2">
          <time
            dateTime={published_at}
            className="text-sm text-tcw-accent-600 dark:text-tcw-accent-400"
          >
            {formattedDate}
          </time>
          <h3 className="text-lg group-hover:text-tcw-accent-700 group-active:text-tcw-accent-700 group-focus-visible:text-tcw-accent-700 dark:group-hover:text-tcw-accent-200 dark:group-active:text-tcw-accent-200 dark:group-focus-visible:text-tcw-accent-200">
            {title}
          </h3>
          {description && (
            <p className="line-clamp-2 text-sm text-tcw-accent-700 dark:text-tcw-accent-300">
              {description}
            </p>
          )}
        </div>
      </article>
    </Link>
  )
}

function PostListItem({ post }: { post: Post }) {
  const { title, slug, description, image, published_at } = post

  if (!slug || !published_at) {
    return null
  }

  const year = new Date(published_at).getFullYear()
  const href = `/news/${year}/${slug}`

  const formattedDate = new Date(published_at).toLocaleDateString("de-DE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })

  return (
    <Link href={href} className="group block cursor-pointer rounded-lg border border-tcw-accent-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-tcw-accent-700 dark:bg-tcw-accent-900">
      <article className="flex gap-4">
        {image && typeof image !== "string" && (
          <div className="shrink-0">
            <PostListImage file={image} />
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <time
            dateTime={published_at}
            className="text-sm text-muted"
          >
            {formattedDate}
          </time>
          <h3 className="text-body group-hover:text-tcw-accent-700 group-active:text-tcw-accent-700 group-focus-visible:text-tcw-accent-700 dark:group-hover:text-tcw-accent-200 dark:group-active:text-tcw-accent-200 dark:group-focus-visible:text-tcw-accent-200">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-muted line-clamp-2">
              {description}
            </p>
          )}
        </div>
      </article>
    </Link>
  )
}

function PostImage({ file }: { file: DirectusFile }) {
  if (!file.id) {
    return null
  }

  const src = `/api/images/${file.id}`
  const title = file.title ?? ""
  const alt = file.description ?? ""

  return (
    <div className="aspect-16/9 overflow-hidden rounded-lg">
      <Image
        src={src}
        title={title}
        alt={alt}
        width={file.width ?? 800}
        height={file.height ?? 450}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 group-active:scale-105 group-focus-visible:scale-105"
      />
    </div>
  )
}

function PostListImage({ file }: { file: DirectusFile }) {
  if (!file.id) {
    return null
  }

  const src = `/api/images/${file.id}`
  const title = file.title ?? ""
  const alt = file.description ?? ""

  return (
    <div className="h-20 w-28 overflow-hidden rounded-md sm:h-24 sm:w-36">
      <Image
        src={src}
        title={title}
        alt={alt}
        width={144}
        height={96}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 group-active:scale-105 group-focus-visible:scale-105"
      />
    </div>
  )
}

function Pagination({ currentPage, totalPages }: { currentPage: number; totalPages: number }) {
  const pageNumbers = getPageNumbers(currentPage, totalPages)
  const hasPrevious = currentPage > 1
  const hasNext = currentPage < totalPages

  return (
    <nav aria-label="Seitennavigation" className="flex items-center justify-center gap-1">
      <SoftButtonLink
        href={`?page=${currentPage - 1}#news`}
        aria-label="Vorherige Seite"
        disabled={!hasPrevious}
      >
        Zurück
      </SoftButtonLink>

      {pageNumbers.map((pageNum, index) => {
        if (pageNum === "...") {
          return (
            <span key={`ellipsis-${index}`} className="px-2 py-2 text-sm text-muted">
              …
            </span>
          )
        }

        const isActive = pageNum === currentPage
        return (
          <SoftButtonLink
            key={pageNum}
            href={`?page=${pageNum}#news`}
            isActive={isActive}
          >
            {pageNum}
          </SoftButtonLink>
        )
      })}

      <SoftButtonLink
        href={`?page=${currentPage + 1}#news`}
        aria-label="Nächste Seite"
        disabled={!hasNext}
      >
        Weiter
      </SoftButtonLink>
    </nav>
  )
}

function getPageNumbers(currentPage: number, totalPages: number): (number | "...")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const pages: (number | "...")[] = []

  // Always show first page
  pages.push(1)

  if (currentPage > 3) {
    pages.push("...")
  }

  // Show pages around current page
  const start = Math.max(2, currentPage - 1)
  const end = Math.min(totalPages - 1, currentPage + 1)

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  if (currentPage < totalPages - 2) {
    pages.push("...")
  }

  // Always show last page
  pages.push(totalPages)

  return pages
}
