import type { MetadataRoute } from 'next'
import { fetchAllPages, fetchAllPublishedPosts } from '@/lib/directus/fetchers'
import { getSiteBaseUrl } from '@/lib/site-url'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteBaseUrl()

  const pages = await fetchAllPages()
  const pageUrls = pages.map((page) => ({
    url: page.permalink === '/' ? baseUrl : `${baseUrl}${page.permalink}`,
    lastModified: page.date_updated ? new Date(page.date_updated) : undefined,
    changeFrequency: 'weekly' as const,
  }))

  const newsIndexUrl = {
    url: `${baseUrl}/news`,
    changeFrequency: 'weekly' as const,
  }

  const posts = await fetchAllPublishedPosts()
  const postUrls = posts
    .filter((post) => post.slug)
    .map((post) => {
      const path = post.published_at
        ? `/news/${new Date(post.published_at).getFullYear()}/${post.slug}`
        : `/news/${post.slug}`
      return {
        url: `${baseUrl}${path}`,
        lastModified: post.published_at ? new Date(post.published_at) : undefined,
        changeFrequency: 'monthly' as const,
      }
    })

  return [...pageUrls, newsIndexUrl, ...postUrls]
}
