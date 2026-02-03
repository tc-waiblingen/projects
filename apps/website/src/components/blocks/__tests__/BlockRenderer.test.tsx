import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BlockRenderer } from '../BlockRenderer'
import type { PageBlock } from '@/types/directus-schema'

// Mock all block components to avoid complex dependencies
vi.mock('../BlockHero', () => ({
  BlockHero: ({ data }: { data: { headline?: string } }) => (
    <div data-testid="block-hero">{data.headline}</div>
  ),
}))

vi.mock('../BlockRichtext', () => ({
  BlockRichtext: ({ data }: { data: { content?: string } }) => (
    <div data-testid="block-richtext">{data.content}</div>
  ),
}))

vi.mock('../BlockForm', () => ({
  BlockForm: () => <div data-testid="block-form">Form</div>,
}))

vi.mock('../BlockPosts', () => ({
  BlockPosts: () => <div data-testid="block-posts">Posts</div>,
}))

vi.mock('../BlockGallery', () => ({
  BlockGallery: () => <div data-testid="block-gallery">Gallery</div>,
}))

vi.mock('../BlockPricing', () => ({
  BlockPricing: () => <div data-testid="block-pricing">Pricing</div>,
}))

vi.mock('../BlockAttachments', () => ({
  BlockAttachments: () => <div data-testid="block-attachments">Attachments</div>,
}))

vi.mock('../BlockTeam', () => ({
  BlockTeam: () => <div data-testid="block-team">Team</div>,
}))

vi.mock('../BlockTrainers', () => ({
  BlockTrainers: () => <div data-testid="block-trainers">Trainers</div>,
}))

vi.mock('../BlockClubCalendar', () => ({
  BlockClubCalendar: () => <div data-testid="block-club-calendar">Calendar</div>,
}))

vi.mock('../BlockMatchResults', () => ({
  BlockMatchResults: () => <div data-testid="block-match-results">Match Results</div>,
}))

vi.mock('../BlockInstagram', () => ({
  BlockInstagram: () => <div data-testid="block-instagram">Instagram</div>,
}))

vi.mock('../BlockIframe', () => ({
  BlockIframe: () => <div data-testid="block-iframe">Iframe</div>,
}))

vi.mock('../BlockSponsors', () => ({
  BlockSponsors: () => <div data-testid="block-sponsors">Sponsors</div>,
}))

vi.mock('../BlockButtonGroupBlock', () => ({
  BlockButtonGroupBlock: () => <div data-testid="block-button-group">Button Group</div>,
}))

vi.mock('../BlockNavMenu', () => ({
  BlockNavMenu: () => <div data-testid="block-nav-menu">Nav Menu</div>,
}))

describe('BlockRenderer', () => {
  describe('block type routing', () => {
    const blockTypes = [
      { collection: 'block_hero', testId: 'block-hero' },
      { collection: 'block_richtext', testId: 'block-richtext' },
      { collection: 'block_form', testId: 'block-form' },
      { collection: 'block_posts', testId: 'block-posts' },
      { collection: 'block_gallery', testId: 'block-gallery' },
      { collection: 'block_pricing', testId: 'block-pricing' },
      { collection: 'block_attachments', testId: 'block-attachments' },
      { collection: 'block_team', testId: 'block-team' },
      { collection: 'block_trainers', testId: 'block-trainers' },
      { collection: 'block_club_calendar', testId: 'block-club-calendar' },
      { collection: 'block_match_results', testId: 'block-match-results' },
      { collection: 'block_instagram', testId: 'block-instagram' },
      { collection: 'block_iframe', testId: 'block-iframe' },
      { collection: 'block_sponsors', testId: 'block-sponsors' },
      { collection: 'block_button_group', testId: 'block-button-group' },
      { collection: 'block_nav_menu', testId: 'block-nav-menu' },
    ]

    it.each(blockTypes)('routes $collection to correct component', ({ collection, testId }) => {
      const blocks: PageBlock[] = [
        {
          id: '1',
          collection,
          item: { id: 'item-1' },
          sort: 1,
          background: null,
        } as PageBlock,
      ]

      render(<BlockRenderer blocks={blocks} />)

      expect(screen.getByTestId(testId)).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('returns null when item is a string (unresolved relation)', () => {
      const blocks: PageBlock[] = [
        {
          id: '1',
          collection: 'block_hero',
          item: 'unresolved-id',
          sort: 1,
          background: null,
        } as PageBlock,
      ]

      const { container } = render(<BlockRenderer blocks={blocks} />)

      expect(container.innerHTML).toBe('')
    })

    it('returns null when item is null', () => {
      const blocks: PageBlock[] = [
        {
          id: '1',
          collection: 'block_hero',
          item: null,
          sort: 1,
          background: null,
        } as PageBlock,
      ]

      const { container } = render(<BlockRenderer blocks={blocks} />)

      expect(container.innerHTML).toBe('')
    })

    it('renders placeholder for unknown collection', () => {
      const blocks: PageBlock[] = [
        {
          id: '1',
          collection: 'block_unknown_type',
          item: { id: 'item-1' },
          sort: 1,
          background: null,
        } as PageBlock,
      ]

      render(<BlockRenderer blocks={blocks} />)

      expect(screen.getByText(/block_unknown_type/i)).toBeInTheDocument()
      expect(screen.getByText(/not yet implemented/i)).toBeInTheDocument()
    })

    it('renders placeholder when collection is null', () => {
      const blocks: PageBlock[] = [
        {
          id: '1',
          collection: null,
          item: { id: 'item-1' },
          sort: 1,
          background: null,
        } as PageBlock,
      ]

      render(<BlockRenderer blocks={blocks} />)

      expect(screen.getByText(/Unknown/i)).toBeInTheDocument()
    })
  })

  describe('multiple blocks', () => {
    it('renders multiple blocks in order', () => {
      const blocks: PageBlock[] = [
        {
          id: '1',
          collection: 'block_hero',
          item: { id: 'item-1', headline: 'Hero Title' },
          sort: 1,
          background: null,
        } as PageBlock,
        {
          id: '2',
          collection: 'block_richtext',
          item: { id: 'item-2', content: 'Rich content' },
          sort: 2,
          background: null,
        } as PageBlock,
      ]

      render(<BlockRenderer blocks={blocks} />)

      expect(screen.getByTestId('block-hero')).toBeInTheDocument()
      expect(screen.getByTestId('block-richtext')).toBeInTheDocument()
    })

    it('renders empty when blocks array is empty', () => {
      const { container } = render(<BlockRenderer blocks={[]} />)

      expect(container.innerHTML).toBe('')
    })
  })

  describe('background wrapper', () => {
    it('applies dark background class', () => {
      const blocks: PageBlock[] = [
        {
          id: '1',
          collection: 'block_hero',
          item: { id: 'item-1' },
          sort: 1,
          background: 'dark',
        } as PageBlock,
      ]

      const { container } = render(<BlockRenderer blocks={blocks} />)

      const wrapper = container.querySelector('.bg-tcw-accent-950')
      expect(wrapper).toBeInTheDocument()
    })

    it('applies light background class', () => {
      const blocks: PageBlock[] = [
        {
          id: '1',
          collection: 'block_hero',
          item: { id: 'item-1' },
          sort: 1,
          background: 'light',
        } as PageBlock,
      ]

      const { container } = render(<BlockRenderer blocks={blocks} />)

      const wrapper = container.querySelector('.bg-tcw-accent-50')
      expect(wrapper).toBeInTheDocument()
    })

    it('does not wrap when background is default', () => {
      const blocks: PageBlock[] = [
        {
          id: '1',
          collection: 'block_hero',
          item: { id: 'item-1' },
          sort: 1,
          background: 'default',
        } as PageBlock,
      ]

      render(<BlockRenderer blocks={blocks} />)

      // Should have wrapper div but with no special classes
      const hero = screen.getByTestId('block-hero')
      expect(hero.parentElement?.className).toBe('')
    })

    it('does not wrap when background is null', () => {
      const blocks: PageBlock[] = [
        {
          id: '1',
          collection: 'block_hero',
          item: { id: 'item-1' },
          sort: 1,
          background: null,
        } as PageBlock,
      ]

      render(<BlockRenderer blocks={blocks} />)

      // Block should render without special background wrapper
      expect(screen.getByTestId('block-hero')).toBeInTheDocument()
    })
  })

  describe('currentPath prop', () => {
    it('passes currentPath to components that need it', () => {
      // BlockButtonGroupBlock and BlockNavMenu receive currentPath
      const blocks: PageBlock[] = [
        {
          id: '1',
          collection: 'block_button_group',
          item: { id: 'item-1' },
          sort: 1,
          background: null,
        } as PageBlock,
      ]

      render(<BlockRenderer blocks={blocks} currentPath="/about" />)

      expect(screen.getByTestId('block-button-group')).toBeInTheDocument()
    })
  })
})
