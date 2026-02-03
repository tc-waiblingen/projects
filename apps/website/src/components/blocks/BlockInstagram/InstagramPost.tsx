'use client'

import Image from 'next/image'
import { clsx } from 'clsx/lite'
import { CameraVideoIcon } from '@/components/icons/camera-video-icon'
import { PhotoIcon } from '@/components/icons/photo-icon'
import type { InstagramCarouselItem } from './types'

interface InstagramPostProps {
  item: InstagramCarouselItem
  showCaption: boolean
  variant: 'large' | 'compact'
}

export function InstagramPost({ item, showCaption, variant }: InstagramPostProps) {
  const isStory = item.type === 'story'
  const isVideo = item.mediaType === 'VIDEO'
  const isCarousel = item.type === 'post' && item.mediaType === 'CAROUSEL_ALBUM'
  const isCompact = variant === 'compact'

  const href = isStory ? 'https://instagram.com/tcwaiblingen' : item.permalink

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={clsx(
        'group interactive-group relative flex-shrink-0 snap-start overflow-hidden',
        'aspect-[4/5]',
        isCompact ? 'w-40 sm:w-44' : 'w-64 sm:w-72',
        isStory && 'ring-2 ring-gradient-to-tr from-purple-500 via-pink-500 to-orange-500'
      )}
    >
      {/* Story ring gradient border */}
      {isStory && (
        <div
          className={clsx(
            'absolute inset-0 rounded-lg p-[3px]',
            'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600'
          )}
        >
          <div className="h-full w-full rounded-md bg-white dark:bg-tcw-accent-900" />
        </div>
      )}

      {/* Image container */}
      <div className={clsx('absolute inset-0', isStory && 'p-1')}>
        <div className="relative h-full w-full">
          <Image
            src={item.mediaUrl}
            alt={item.type === 'post' && item.caption ? item.caption : 'Instagram Beitrag'}
            fill
            unoptimized
            className={clsx(
              'object-cover',
              isStory ? 'rounded-md' : 'rounded-lg'
            )}
          />
        </div>
      </div>

      {/* Media type indicators */}
      <div className={clsx('absolute flex gap-1', isCompact ? 'right-1.5 top-1.5' : 'right-2 top-2')}>
        {isVideo && (
          <span className={clsx('rounded-md bg-black/60 text-white backdrop-blur-sm', isCompact ? 'p-1' : 'p-1.5')}>
            <CameraVideoIcon className={isCompact ? 'size-3' : 'size-4'} />
          </span>
        )}
        {isCarousel && (
          <span className={clsx('rounded-md bg-black/60 text-white backdrop-blur-sm', isCompact ? 'p-1' : 'p-1.5')}>
            <PhotoIcon className={isCompact ? 'size-3' : 'size-4'} />
          </span>
        )}
        {isStory && (
          <span
            className={clsx(
              'rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 font-medium text-white',
              isCompact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
            )}
          >
            Story
          </span>
        )}
      </div>

      {/* Caption overlay (posts only, hidden in compact mode) */}
      {!isCompact && showCaption && item.type === 'post' && item.caption && (
        <div
          className={clsx(
            'absolute inset-x-0 bottom-0 translate-y-full p-3 transition-transform duration-300',
            'bg-gradient-to-t from-black/80 via-black/60 to-transparent',
            'group-hover:translate-y-0 group-active:translate-y-0 group-focus-visible:translate-y-0'
          )}
        >
          <p className="line-clamp-3 text-sm text-white">{item.caption}</p>
        </div>
      )}

      {/* Hover overlay */}
      <div
        className={clsx(
          'absolute inset-0 bg-black/0 transition-colors duration-300',
          'group-hover:bg-black/10 group-active:bg-black/10 group-focus-visible:bg-black/10',
          isStory && 'rounded-md m-1'
        )}
      />
    </a>
  )
}
