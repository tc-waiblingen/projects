import type {
  InstagramFeedItem,
  InstagramFeedOptions,
  InstagramFeedResponse,
  InstagramPost,
  InstagramStoriesResponse,
  InstagramStory,
} from './types'

const INSTAGRAM_API_BASE = 'https://graph.instagram.com'
const REVALIDATE_SECONDS = 1800 // 30 minutes

function getInstagramConfig() {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN
  const userId = process.env.INSTAGRAM_USER_ID

  if (!accessToken || !userId) {
    const missing = [
      !accessToken && 'INSTAGRAM_ACCESS_TOKEN',
      !userId && 'INSTAGRAM_USER_ID',
    ].filter(Boolean)
    console.warn(`Instagram config missing env vars: ${missing.join(', ')}`)
    return null
  }

  return { accessToken, userId }
}

/**
 * Fetches Instagram posts from the /media endpoint
 */
export async function fetchInstagramPosts(limit = 12): Promise<InstagramPost[]> {
  const config = getInstagramConfig()
  if (!config) {
    console.warn('Instagram configuration missing')
    return []
  }

  const { accessToken, userId } = config
  const fields = 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp'
  const url = `${INSTAGRAM_API_BASE}/${userId}/media?fields=${fields}&limit=${limit}&access_token=${accessToken}`
  console.info(`Instagram posts: fetching from ${url.replace(accessToken, '[REDACTED]')}`)

  try {
    const response = await fetch(url, {
      next: { revalidate: REVALIDATE_SECONDS },
    })

    if (!response.ok) {
      console.error('Instagram API error:', response.status, await response.text())
      return []
    }

    const data: InstagramFeedResponse = await response.json()
    const posts = data.data || []
    console.info(`Instagram posts: fetched ${posts.length} posts`)
    return posts
  } catch (error) {
    console.error('Failed to fetch Instagram posts:', error)
    return []
  }
}

/**
 * Fetches Instagram stories from the /stories endpoint
 * Note: Requires instagram_manage_insights permission
 */
export async function fetchInstagramStories(): Promise<InstagramStory[]> {
  const config = getInstagramConfig()
  if (!config) {
    console.warn('Instagram stories: skipping fetch, config missing')
    return []
  }

  const { accessToken, userId } = config
  const fields = 'id,media_type,media_url,thumbnail_url,timestamp'
  const url = `${INSTAGRAM_API_BASE}/${userId}/stories?fields=${fields}&access_token=${accessToken}`
  console.info(`Instagram stories: fetching from ${url.replace(accessToken, '[REDACTED]')}`)

  try {
    const response = await fetch(url, {
      next: { revalidate: REVALIDATE_SECONDS },
    })

    if (!response.ok) {
      console.warn(`Instagram stories: API returned ${response.status}`)
      return []
    }

    const data: InstagramStoriesResponse = await response.json()
    const stories = data.data || []
    console.info(`Instagram stories: fetched ${stories.length} stories`)
    return stories
  } catch (error) {
    console.warn('Instagram stories: fetch failed', error)
    return []
  }
}

/**
 * Fetches Instagram feed combining posts and stories based on options
 */
export async function fetchInstagramFeed(options: InstagramFeedOptions = {}): Promise<InstagramFeedItem[]> {
  const { limit = 12, showPosts = true, showStories = true } = options

  const items: InstagramFeedItem[] = []

  // Fetch posts and stories in parallel
  const [posts, stories] = await Promise.all([
    showPosts ? fetchInstagramPosts(limit) : Promise.resolve([]),
    showStories ? fetchInstagramStories() : Promise.resolve([]),
  ])

  // Add stories first (they appear at the beginning like on Instagram)
  for (const story of stories) {
    items.push({ type: 'story', data: story })
  }

  // Add posts
  for (const post of posts) {
    items.push({ type: 'post', data: post })
  }

  // Limit total items
  const result = items.slice(0, limit)
  console.info(`Instagram feed: ${result.length} items (${posts.length} posts, ${stories.length} stories)`)
  return result
}
