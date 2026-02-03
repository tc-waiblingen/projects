export interface InstagramPost {
  id: string
  caption?: string
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  media_url: string
  permalink: string
  thumbnail_url?: string
  timestamp: string
}

export interface InstagramStory {
  id: string
  media_type: 'IMAGE' | 'VIDEO'
  media_url: string
  permalink: string
  thumbnail_url?: string
  timestamp: string
}

export type InstagramFeedItem =
  | { type: 'post'; data: InstagramPost }
  | { type: 'story'; data: InstagramStory }

export interface InstagramFeedResponse {
  data: InstagramPost[]
  paging?: {
    cursors: {
      before: string
      after: string
    }
    next?: string
  }
}

export interface InstagramStoriesResponse {
  data: InstagramStory[]
}

export interface InstagramFeedOptions {
  limit?: number
  showPosts?: boolean
  showStories?: boolean
}
