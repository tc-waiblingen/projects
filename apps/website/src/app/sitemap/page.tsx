import type { Metadata } from 'next'
import Link from 'next/link'
import { Section } from '@/components/elements/section'
import { fetchAllPages, fetchAllPublishedPosts } from '@/lib/directus/fetchers'

export const metadata: Metadata = {
  title: 'Sitemap',
  robots: { index: false, follow: true },
}

function postPath(slug: string, publishedAt?: string | null) {
  const year = publishedAt ? new Date(publishedAt).getFullYear() : null
  return year ? `/news/${year}/${slug}` : `/news/${slug}`
}

function formatPostDate(publishedAt: string) {
  return new Date(publishedAt).toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default async function SitemapPage() {
  const [pages, posts] = await Promise.all([
    fetchAllPages(),
    fetchAllPublishedPosts(),
  ])

  const sortedPages = [...pages].sort((a, b) =>
    a.permalink.localeCompare(b.permalink, 'de')
  )

  const visiblePosts = posts
    .filter((post): post is typeof post & { slug: string } => Boolean(post.slug))
    .sort((a, b) => {
      const ta = a.published_at ? new Date(a.published_at).getTime() : 0
      const tb = b.published_at ? new Date(b.published_at).getTime() : 0
      return tb - ta
    })

  const postsByYear = new Map<string, typeof visiblePosts>()
  for (const post of visiblePosts) {
    const year = post.published_at
      ? String(new Date(post.published_at).getFullYear())
      : 'Ohne Datum'
    const bucket = postsByYear.get(year) ?? []
    bucket.push(post)
    postsByYear.set(year, bucket)
  }

  return (
    <>
      <Section headline="Sitemap" eyebrow="Übersicht">
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-x-8">
          {sortedPages.map((page) => (
            <li key={page.permalink}>
              <Link
                href={page.permalink}
                className="text-body cursor-pointer hover:underline"
              >
                {page.title || page.permalink}
              </Link>
              <span className="ml-2 text-sm text-muted">{page.permalink}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section headline="News">
        <div className="flex flex-col gap-8">
          <div>
            <Link
              href="/news"
              className="text-body cursor-pointer hover:underline"
            >
              Alle News
            </Link>
          </div>
          {[...postsByYear.entries()]
            .sort(([a], [b]) => {
              if (a === 'Ohne Datum') return 1
              if (b === 'Ohne Datum') return -1
              return Number(b) - Number(a)
            })
            .map(([year, yearPosts]) => (
            <div key={year} className="flex flex-col gap-3">
              <h3 className="text-lg text-body">{year}</h3>
              <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-x-8">
                {yearPosts.map((post) => (
                  <li key={post.slug} className="flex flex-col">
                    <Link
                      href={postPath(post.slug, post.published_at)}
                      className="text-body cursor-pointer hover:underline"
                    >
                      {post.title}
                    </Link>
                    {post.published_at && (
                      <time
                        dateTime={post.published_at}
                        className="text-sm text-muted"
                      >
                        {formatPostDate(post.published_at)}
                      </time>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>
    </>
  )
}
