import Link from 'next/link'
import { fetchPostsByGroup } from '@/lib/directus/fetchers'
import { Container } from './container'

interface RelatedGroupPostsProps {
  groupId: number
  currentPostId: string
}

export async function RelatedGroupPosts({ groupId, currentPostId }: RelatedGroupPostsProps) {
  const posts = await fetchPostsByGroup(groupId)

  if (posts.length < 2) {
    return null
  }

  return (
    <Container className="mt-12 mb-16">
      <div className="border-t border-tcw-accent-200 pt-8 dark:border-tcw-accent-700">
        <h2 className="text-body mb-4 text-lg font-semibold">Weitere Beiträge in dieser Serie</h2>
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

            if (isCurrent) {
              return (
                <li key={post.id} className="flex items-baseline gap-3">
                  {dateEl}
                  <span className="text-body font-bold">{post.title}</span>
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
                <Link href={href} className="text-body cursor-pointer hover:underline">
                  {post.title}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </Container>
  )
}
