'use server'

import { fetchPostsPaginated } from '@/lib/directus/fetchers'

export interface PostsPageResult {
  posts: Awaited<ReturnType<typeof fetchPostsPaginated>>['posts']
  total: number
  totalPages: number
}

export async function fetchPostsPage(
  pageSize: number,
  page: number
): Promise<PostsPageResult> {
  const offset = Math.max(0, (page - 1) * pageSize)
  const { posts, total } = await fetchPostsPaginated(pageSize, offset)
  const totalPages = Math.ceil(total / pageSize)

  return { posts, total, totalPages }
}
