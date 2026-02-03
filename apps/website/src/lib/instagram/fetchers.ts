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

  try {
    const response = await fetch(url, {
      next: { revalidate: REVALIDATE_SECONDS },
    })

    if (!response.ok) {
      console.error('Instagram API error:', response.status, await response.text())
      return []
    }

    const data: InstagramFeedResponse = await response.json()
    return data.data || []
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
    return []
  }

  const { accessToken, userId } = config
  const fields = 'id,media_type,media_url,thumbnail_url,timestamp'
  const url = `${INSTAGRAM_API_BASE}/${userId}/stories?fields=${fields}&access_token=${accessToken}`

  try {
    const response = await fetch(url, {
      next: { revalidate: REVALIDATE_SECONDS },
    })

    if (!response.ok) {
      // Stories endpoint may fail if no permission - fail silently
      return []
    }

    const data: InstagramStoriesResponse = await response.json()
    return data.data || []
  } catch {
    // Stories fail silently if no permission
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
  return items.slice(0, limit)
}
