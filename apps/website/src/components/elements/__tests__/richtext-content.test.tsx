import type { DirectusFile } from '@/types/directus-schema'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RichtextContent } from '../richtext-content'

describe('RichtextContent', () => {
  it('scales SVG images to the rich-text container', () => {
    const file = {
      id: 'svg-file',
      type: 'image/svg+xml',
      width: 2400,
      height: 600,
      title: 'Court plan',
      description: 'Court plan',
    } as DirectusFile

    render(
      <RichtextContent
        html='<img src="/api/images/svg-file?key=richtext-image" alt="Plan" width="2400" height="600">'
        fileMetadata={{ 'svg-file': file }}
      />,
    )

    const image = screen.getByRole('img', { name: 'Court plan' })

    expect(image).toHaveClass('h-auto', 'w-full', 'max-w-full')
    expect(image).toHaveAttribute('data-richtext-lightbox-index', '0')
  })
})
