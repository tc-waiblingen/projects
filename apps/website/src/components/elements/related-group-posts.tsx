import Link from 'next/link'
import { draftMode } from 'next/headers'
import { parse } from 'node-html-parser'
import { fetchPostGroupWithPosts } from '@/lib/directus/fetchers'
import { sanitizeHtml } from '@/lib/sanitize'
import { transformRichtextAssets } from '@/lib/transform-richtext-assets'
import { Container } from './container'
import { Document } from './document'
import { RichtextContent } from './richtext-content'

interface RelatedGroupPostsProps {
  groupId: number
  currentPostId: string
}

function getProcessedDescription(description: string | null | undefined): string | null {
  if (!description) return null

  const processed = sanitizeHtml(transformRichtextAssets(description))
  const root = parse(processed)
  const hasText = root.text.trim().length > 0
  const hasMedia = root.querySelector('img,table,hr') !== null

  return hasText || hasMedia ? processed : null
}

export async function RelatedGroupPosts({ groupId, currentPostId }: RelatedGroupPostsProps) {
  const preview = (await draftMode()).isEnabled
  const { group, posts } = await fetchPostGroupWithPosts(groupId, undefined, preview)
  const description = getProcessedDescription(group.description)
  const showPostList = posts.length > 1

  if (!preview && group.status !== 'published') {
    return null
  }

  if (!showPostList && !description) {
    return null
  }

  const groupName = group.name?.trim()
  const headline = description
    ? groupName || (showPostList ? 'Weitere Beiträge in dieser Serie' : 'Serie')
    : 'Weitere Beiträge in dieser Serie'

  return (
    <Container className="mt-12 mb-16">
      <div className="border-t border-tcw-accent-200 pt-8 dark:border-tcw-accent-700">
        <h2 className="text-body mb-4 text-lg font-semibold">{headline}</h2>
        {description && (
          <Document className={showPostList ? 'mb-6 max-w-2xl' : 'max-w-2xl'}>
            <RichtextContent html={description} />
          </Document>
        )}
        {showPostList && (
          <ul className="space-y-2">
            {posts.map((post) => {
              const isCurrent = post.id === currentPostId
              const formattedDate = post.published_at
                ? new Date(post.published_at).toLocaleDateString('de-DE', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                  })
                : null

              const dateEl = formattedDate ? (
                <time className="text-muted w-24 shrink-0 tabular-nums text-sm" dateTime={post.published_at ?? undefined}>
                  {formattedDate}
                </time>
              ) : null

              const badgeEl = preview ? (() => {
                if (post.status !== 'published') {
                  return <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900 dark:text-amber-100">Entwurf</span>
                }
                if (post.published_at && new Date(post.published_at) > new Date()) {
                  return <span className="rounded bg-tcw-red-100 px-1.5 py-0.5 text-xs font-medium text-tcw-red-900 dark:bg-tcw-red-900 dark:text-tcw-red-100">Geplant</span>
                }
                return null
              })() : null

              if (isCurrent) {
                return (
                  <li key={post.id} className="flex items-baseline gap-3">
                    {dateEl}
                    <span className="text-body font-bold">{post.title}</span>
                    {badgeEl}
                  </li>
                )
              }

              const year = post.published_at
                ? new Date(post.published_at).getFullYear().toString()
                : null
              const href = year ? `/news/${year}/${post.slug}` : `/news/${post.slug}`

              return (
                <li key={post.id} className="flex items-baseline gap-3">
                  {dateEl}
                  <Link href={href} className="text-body text-link">
                    {post.title}
                  </Link>
                  {badgeEl}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Container>
  )
}
