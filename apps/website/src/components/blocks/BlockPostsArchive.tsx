'use client'

import { Suspense, useEffect, useState, useTransition, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { clsx } from 'clsx/lite'
import type { BlockPost as BlockPostType, DirectusFile, Post } from '@/types/directus-schema'
import { Section } from '@/components/elements/section'
import { SoftButton } from '@/components/elements/button'
import { fetchPostsPage, type PostsPageResult } from '@/lib/actions/posts'

interface BlockPostsArchiveProps {
  data: BlockPostType
  initialData: PostsPageResult
}

export function BlockPostsArchive({ data, initialData }: BlockPostsArchiveProps) {
  return (
    <Suspense fallback={<ArchiveFallback data={data} initialData={initialData} />}>
      <ArchiveWithSearchParams data={data} initialData={initialData} />
    </Suspense>
  )
}

function ArchiveFallback({ data, initialData }: BlockPostsArchiveProps) {
  const { id, headline, tagline } = data
  const { posts, totalPages } = initialData

  if (!posts || posts.length === 0) {
    return null
  }

  const showPagination = totalPages > 1

  return (
    <Section id="news" eyebrow={tagline} headline={headline || undefined} editAttr={{ collection: 'block_posts', item: String(id) }}>
      <div className="flex flex-col gap-8">
        {showPagination && (
          <PaginationSkeleton currentPage={1} totalPages={totalPages} />
        )}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
          {posts.map((post) => (
            <PostListItem key={post.id} post={post} />
          ))}
        </div>
        {showPagination && (
          <PaginationSkeleton currentPage={1} totalPages={totalPages} />
        )}
      </div>
    </Section>
  )
}

function ArchiveWithSearchParams({ data, initialData }: BlockPostsArchiveProps) {
  const { id, headline, tagline, limit } = data
  const pageSize = limit ?? 10

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const pageParam = searchParams.get('page')
  const requestedPage = parseInt(pageParam ?? '1', 10) || 1

  const [postsData, setPostsData] = useState<PostsPageResult>(initialData)
  const [currentPage, setCurrentPage] = useState(requestedPage)

  // Fetch new page data when URL changes
  useEffect(() => {
    if (requestedPage !== currentPage || requestedPage === 1) {
      startTransition(async () => {
        const result = await fetchPostsPage(pageSize, requestedPage)
        setPostsData(result)
        setCurrentPage(requestedPage)
      })
    }
  }, [requestedPage, currentPage, pageSize])

  const navigateToPage = useCallback((page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (page === 1) {
      params.delete('page')
    } else {
      params.set('page', String(page))
    }
    const query = params.toString()
    const url = query ? `${pathname}?${query}#news` : `${pathname}#news`
    router.push(url, { scroll: false })
  }, [pathname, router, searchParams])

  const { posts, totalPages } = postsData

  if (!posts || posts.length === 0) {
    return null
  }

  const showPagination = totalPages > 1

  return (
    <Section id="news" eyebrow={tagline} headline={headline || undefined} editAttr={{ collection: 'block_posts', item: String(id) }}>
      <div className={clsx('flex flex-col gap-8', isPending && 'opacity-60')}>
        {showPagination && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={navigateToPage}
            disabled={isPending}
          />
        )}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
          {posts.map((post) => (
            <PostListItem key={post.id} post={post} />
          ))}
        </div>
        {showPagination && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={navigateToPage}
            disabled={isPending}
          />
        )}
      </div>
    </Section>
  )
}

function PostListItem({ post }: { post: Post }) {
  const { title, slug, description, image, published_at } = post

  if (!slug || !published_at) {
    return null
  }

  const year = new Date(published_at).getFullYear()
  const href = `/news/${year}/${slug}`

  const formattedDate = new Date(published_at).toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <Link href={href} className="group block cursor-pointer rounded-lg border border-tcw-accent-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-tcw-accent-700 dark:bg-tcw-accent-900">
      <article className="flex gap-4">
        {image && typeof image !== 'string' && (
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

function PostListImage({ file }: { file: DirectusFile }) {
  if (!file.id) {
    return null
  }

  const src = `/api/images/${file.id}`
  const title = file.title ?? ''
  const alt = file.description ?? ''

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

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  disabled,
}: {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  disabled?: boolean
}) {
  const pageNumbers = getPageNumbers(currentPage, totalPages)
  const hasPrevious = currentPage > 1
  const hasNext = currentPage < totalPages

  return (
    <nav aria-label="Seitennavigation" className="flex items-center justify-center gap-1">
      <SoftButton
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Vorherige Seite"
        disabled={!hasPrevious || disabled}
      >
        Zurück
      </SoftButton>

      {pageNumbers.map((pageNum, index) => {
        if (pageNum === '...') {
          return (
            <span key={`ellipsis-${index}`} className="px-2 py-2 text-sm text-muted">
              …
            </span>
          )
        }

        const isActive = pageNum === currentPage
        return (
          <SoftButton
            key={pageNum}
            onClick={() => onPageChange(pageNum)}
            disabled={disabled}
            className={clsx(
              isActive && 'bg-tcw-accent-900/20 dark:bg-white/25'
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            {pageNum}
          </SoftButton>
        )
      })}

      <SoftButton
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Nächste Seite"
        disabled={!hasNext || disabled}
      >
        Weiter
      </SoftButton>
    </nav>
  )
}

function PaginationSkeleton({
  currentPage,
  totalPages,
}: {
  currentPage: number
  totalPages: number
}) {
  const pageNumbers = getPageNumbers(currentPage, totalPages)
  const hasPrevious = currentPage > 1
  const hasNext = currentPage < totalPages

  return (
    <nav aria-label="Seitennavigation" className="flex items-center justify-center gap-1">
      <SoftButton
        aria-label="Vorherige Seite"
        disabled={!hasPrevious}
      >
        Zurück
      </SoftButton>

      {pageNumbers.map((pageNum, index) => {
        if (pageNum === '...') {
          return (
            <span key={`ellipsis-${index}`} className="px-2 py-2 text-sm text-muted">
              …
            </span>
          )
        }

        const isActive = pageNum === currentPage
        return (
          <SoftButton
            key={pageNum}
            disabled
            className={clsx(
              isActive && 'bg-tcw-accent-900/20 dark:bg-white/25'
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            {pageNum}
          </SoftButton>
        )
      })}

      <SoftButton
        aria-label="Nächste Seite"
        disabled={!hasNext}
      >
        Weiter
      </SoftButton>
    </nav>
  )
}

function getPageNumbers(currentPage: number, totalPages: number): (number | '...')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const pages: (number | '...')[] = []

  // Always show first page
  pages.push(1)

  if (currentPage > 3) {
    pages.push('...')
  }

  // Show pages around current page
  const start = Math.max(2, currentPage - 1)
  const end = Math.min(totalPages - 1, currentPage + 1)

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  if (currentPage < totalPages - 2) {
    pages.push('...')
  }

  // Always show last page
  pages.push(totalPages)

  return pages
}
