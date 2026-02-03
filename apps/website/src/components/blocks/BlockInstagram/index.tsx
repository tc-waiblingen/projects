import type { BlockInstagram as BlockInstagramType } from '@/types/directus-schema'
import { Section } from '@/components/elements/section'
import { fetchInstagramFeed } from '@/lib/instagram/fetchers'
import { getEditAttr } from '@/lib/visual-editing'
import { signUrl } from '@/lib/signing'
import { InstagramCarousel } from './InstagramCarousel'
import type { InstagramCarouselItem } from './types'

interface BlockInstagramProps {
  data: BlockInstagramType
}

export async function BlockInstagram({ data }: BlockInstagramProps) {
  const {
    id,
    headline,
    tagline,
    cta_label = 'Auf Instagram ansehen',
    limit = 12,
    show_captions = true,
    show_posts = true,
    show_stories = true,
    style = 'large',
  } = data

  const feedItems = await fetchInstagramFeed({
    limit: limit ?? undefined,
    showPosts: show_posts,
    showStories: show_stories,
  })

  if (feedItems.length === 0) {
    return null
  }

  // Transform feed items to carousel items with signed proxy URLs
  // For videos, always use thumbnail_url to show a preview image
  const carouselItems: InstagramCarouselItem[] = feedItems.map((item) => {
    if (item.type === 'story') {
      const mediaUrl = item.data.thumbnail_url || item.data.media_url
      const proxyUrl = `/api/instagram/media?url=${encodeURIComponent(mediaUrl)}&sig=${signUrl(mediaUrl)}`

      return {
        type: 'story',
        id: item.data.id,
        mediaType: item.data.media_type,
        mediaUrl: proxyUrl,
        timestamp: item.data.timestamp,
      }
    }

    const mediaUrl = item.data.thumbnail_url || item.data.media_url
    const proxyUrl = `/api/instagram/media?url=${encodeURIComponent(mediaUrl)}&sig=${signUrl(mediaUrl)}`

    return {
      type: 'post',
      id: item.data.id,
      mediaType: item.data.media_type,
      mediaUrl: proxyUrl,
      permalink: item.data.permalink,
      caption: item.data.caption,
      timestamp: item.data.timestamp,
    }
  })

  const headlineEl = headline ? (
    <span data-directus={getEditAttr({ collection: 'block_instagram', item: String(id), fields: 'headline' })}>
      {headline}
    </span>
  ) : undefined

  const eyebrowEl = tagline ? (
    <span data-directus={getEditAttr({ collection: 'block_instagram', item: String(id), fields: 'tagline' })}>
      {tagline}
    </span>
  ) : undefined

  return (
    <Section headline={headlineEl} eyebrow={eyebrowEl}>
      <InstagramCarousel
        items={carouselItems}
        showCaptions={show_captions}
        ctaLabel={cta_label ?? 'Auf Instagram ansehen'}
        variant={style ?? 'large'}
      />
    </Section>
  )
}
