export type InstagramCarouselItem =
  | {
      type: 'post'
      id: string
      mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
      mediaUrl: string
      permalink: string
      caption?: string
      timestamp: string
    }
  | {
      type: 'story'
      id: string
      mediaType: 'IMAGE' | 'VIDEO'
      mediaUrl: string
      timestamp: string
    }
