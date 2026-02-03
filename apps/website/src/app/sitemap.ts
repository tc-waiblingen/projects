import type { MetadataRoute } from 'next'
import { fetchAllPages, fetchAllPublishedPosts } from '@/lib/directus/fetchers'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://tc-waiblingen.de'

  // Fetch all published pages
  const pages = await fetchAllPages()
  const pageUrls = pages.map((page) => ({
    url: page.permalink === '/' ? baseUrl : `${baseUrl}${page.permalink}`,
    changeFrequency: 'weekly' as const,
  }))

  // Fetch all published posts
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

  return [...pageUrls, ...postUrls]
}
